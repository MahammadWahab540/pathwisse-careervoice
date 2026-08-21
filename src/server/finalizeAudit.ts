import { Type } from '@google/genai';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildEvidenceCoverage,
  calculateSkillGap,
  calculateSkillScore,
  readinessStatusForScore,
  type CompetencyBenchmark,
  type EvidenceStrength,
  type GapPriority,
  type ScoringSignal,
} from '../domain/careerAudit';
import type {
  AuditSkillGapResponse,
  CareerAuditReportResponse,
  CareerAuditRoadmapHandoffV1,
  EvidenceLedgerItem,
} from '../types/api';
import { serverConfig } from './config';
import { generateStructuredJson } from './gemini';
import {
  getAuditSession,
  loadAuditEvidence,
  loadAuditMessages,
  loadAuditSignals,
  loadCompetencyModel,
  loadPathwisseMappings,
  loadRole,
  loadRoleRecommendations,
  loadRoleSkills,
  updateAuditSession,
  PersistenceError,
} from './auditRepository';

export class AuditFinalizationError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status = 422, details?: unknown) {
    super(message);
    this.name = 'AuditFinalizationError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface RoleSkillRow {
  id: string;
  role_id: string;
  skill_slug: string;
  skill_name: string;
  required_level: string;
  expected_readiness: number | string;
  weight: number | string;
  evidence_requirements: Record<string, unknown>;
  evaluation_rubric: Record<string, unknown>;
  minimum_evidence_threshold: number | string;
  minimum_evidence_strength: 'Moderate' | 'Strong';
  employability_importance: number | string;
  dependency_weight: number | string;
  probe_guidance: Record<string, unknown>;
}

interface SignalRow {
  id: string;
  evidence_id: string | null;
  skill_slug: string;
  skill_name: string;
  extracted_level: string | null;
  confidence_score: number | string | null;
  evidence_strength: EvidenceStrength | null;
  raw_answer_snippet: string | null;
  source: string | null;
  source_message_id: string | null;
}

interface EvidenceRow {
  id: string;
  source_message_id?: string | null;
  evidence_type: string;
  raw_text?: string | null;
  evidence_strength?: EvidenceStrength | null;
  source?: string | null;
  claimed_level?: string | null;
  status?: string;
  metadata?: Record<string, unknown>;
}

interface ExplanationPayload {
  diagnosisSummary: string;
  skillExplanations: Array<{
    skillId: string;
    whyItMatters: string;
    recommendedAction: string;
    reason: string;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function toBenchmark(row: RoleSkillRow): CompetencyBenchmark {
  return {
    skillId: row.id,
    skillSlug: row.skill_slug,
    skillName: row.skill_name,
    category: 'Role Competency',
    expectedScore: Number(row.expected_readiness),
    importanceWeight: Number(row.weight),
    dependencyWeight: Number(row.dependency_weight),
    employabilityWeight: Number(row.employability_importance),
    requiredLevel: row.required_level,
    minimumEvidenceThreshold: Number(row.minimum_evidence_threshold),
    minimumEvidenceStrength: row.minimum_evidence_strength,
    evidenceRequirements: row.evidence_requirements || {},
    evaluationRubric: row.evaluation_rubric || {},
    probeGuidance: row.probe_guidance || {},
  };
}

function toScoringSignal(row: SignalRow): ScoringSignal | null {
  if (!row.id || !row.skill_name || !row.extracted_level || row.confidence_score === null || !row.evidence_strength) return null;
  if (!['Strong', 'Moderate', 'Weak', 'None'].includes(row.evidence_strength)) return null;
  return {
    id: row.id,
    skillName: row.skill_name,
    extractedLevel: row.extracted_level,
    confidenceScore: Number(row.confidence_score),
    evidenceStrength: row.evidence_strength,
    evidenceId: row.evidence_id || undefined,
  };
}

function validateExplanation(value: unknown, skillIds: Set<string>): ExplanationPayload {
  if (!isRecord(value) || !Array.isArray(value.skillExplanations)) {
    throw new Error('explanation payload is malformed');
  }
  const diagnosisSummary = requiredString(value.diagnosisSummary, 'diagnosisSummary');
  const skillExplanations = value.skillExplanations.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`skillExplanations[${index}] is invalid`);
    const skillId = requiredString(entry.skillId, `skillExplanations[${index}].skillId`);
    if (!skillIds.has(skillId)) throw new Error(`Unknown skill explanation ${skillId}`);
    return {
      skillId,
      whyItMatters: requiredString(entry.whyItMatters, `skillExplanations[${index}].whyItMatters`),
      recommendedAction: requiredString(entry.recommendedAction, `skillExplanations[${index}].recommendedAction`),
      reason: requiredString(entry.reason, `skillExplanations[${index}].reason`),
    };
  });
  const seen = new Set(skillExplanations.map((item) => item.skillId));
  for (const skillId of skillIds) {
    if (!seen.has(skillId)) throw new Error(`Missing explanation for ${skillId}`);
  }
  return { diagnosisSummary, skillExplanations };
}

function explanationSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      diagnosisSummary: { type: Type.STRING },
      skillExplanations: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            skillId: { type: Type.STRING },
            whyItMatters: { type: Type.STRING },
            recommendedAction: { type: Type.STRING },
            reason: { type: Type.STRING },
          },
          required: ['skillId', 'whyItMatters', 'recommendedAction', 'reason'],
        },
      },
    },
    required: ['diagnosisSummary', 'skillExplanations'],
  };
}

function confidenceLevel(score: number): 'High' | 'Medium' | 'Low' {
  return score >= 80 ? 'High' : score >= 55 ? 'Medium' : 'Low';
}

function gapSeverity(priority: GapPriority): 'RED' | 'ORANGE' | 'GREEN' {
  if (priority === 'Critical' || priority === 'High') return 'RED';
  if (priority === 'Medium') return 'ORANGE';
  return 'GREEN';
}

function weightedReadiness(records: Array<{ demonstratedScore: number; benchmark: CompetencyBenchmark }>): number {
  const totalWeight = records.reduce((sum, record) => sum + Math.max(0, record.benchmark.importanceWeight), 0);
  if (totalWeight <= 0) throw new AuditFinalizationError('COMPETENCY_MODEL_INVALID', 'Target role skill weights are invalid.', 409);
  const weighted = records.reduce(
    (sum, record) => sum + record.demonstratedScore * Math.max(0, record.benchmark.importanceWeight),
    0
  );
  return Math.round(weighted / totalWeight);
}

export async function getPersistedReport(
  supabase: SupabaseClient,
  auditId: string
): Promise<CareerAuditReportResponse | null> {
  const result = await supabase
    .from('audit_reports')
    .select('model_metadata')
    .eq('session_id', auditId)
    .maybeSingle();
  if (result.error) throw new PersistenceError('audit_report_read', result.error.message);
  const payload = result.data?.model_metadata?.reportPayload;
  return payload && isRecord(payload) ? (payload as unknown as CareerAuditReportResponse) : null;
}

export async function getPersistedHandoff(
  supabase: SupabaseClient,
  auditId: string
): Promise<CareerAuditRoadmapHandoffV1 | null> {
  const result = await supabase
    .from('audit_reports')
    .select('pathwisse_handoff')
    .eq('session_id', auditId)
    .maybeSingle();
  if (result.error) throw new PersistenceError('audit_handoff_read', result.error.message);
  const payload = result.data?.pathwisse_handoff;
  return payload && isRecord(payload) && payload.contract === 'career-voice-pathwisse-handoff:v1'
    ? (payload as unknown as CareerAuditRoadmapHandoffV1)
    : null;
}

export async function finalizeCareerAudit(
  supabase: SupabaseClient,
  auditId: string
): Promise<CareerAuditReportResponse> {
  const existing = await getPersistedReport(supabase, auditId);
  if (existing) return existing;

  const session = await getAuditSession(supabase, auditId);
  if (!session.target_role_id) {
    throw new AuditFinalizationError('TARGET_ROLE_REQUIRED', 'Audit session has no target role.', 409);
  }

  const [role, roleSkillRowsRaw, competencyModel, signalsRaw, evidenceRowsRaw, messages, mappings, roleRecommendations] = await Promise.all([
    loadRole(supabase, session.target_role_id),
    loadRoleSkills(supabase, [session.target_role_id]),
    loadCompetencyModel(supabase, session.target_role_id),
    loadAuditSignals(supabase, auditId),
    loadAuditEvidence(supabase, auditId),
    loadAuditMessages(supabase, auditId),
    loadPathwisseMappings(supabase, session.target_role_id),
    loadRoleRecommendations(supabase, auditId),
  ]);

  if (!role) throw new AuditFinalizationError('TARGET_ROLE_NOT_FOUND', 'Target role is not published.', 404);
  if (!competencyModel) throw new AuditFinalizationError('COMPETENCY_MODEL_MISSING', 'Target role has no readiness benchmark.', 409);
  const roleSkills = (roleSkillRowsRaw as RoleSkillRow[]).map(toBenchmark);
  if (roleSkills.length === 0) throw new AuditFinalizationError('COMPETENCY_MODEL_MISSING', 'Target role has no configured role skills.', 409);

  const signalRows = signalsRaw as unknown as SignalRow[];
  const signals = signalRows.map(toScoringSignal).filter((item): item is ScoringSignal => Boolean(item));
  const coverage = buildEvidenceCoverage(roleSkills, signals);
  const insufficient = coverage.filter((item) => item.scoreStatus === 'INSUFFICIENT_EVIDENCE');
  if (insufficient.length > 0) {
    await updateAuditSession(supabase, auditId, {
      status: 'in_progress',
      application_state: 'ADAPTIVE_AUDIT',
      current_competency_skill_id: insufficient[0]?.skillId || null,
    });
    throw new AuditFinalizationError(
      'INSUFFICIENT_EVIDENCE',
      `CareerVoice still needs stronger evidence for: ${insufficient.map((item) => item.skillName).join(', ')}.`,
      422,
      { coverage, missingSkillIds: insufficient.map((item) => item.skillId) }
    );
  }

  await updateAuditSession(supabase, auditId, { status: 'processing', application_state: 'PROCESSING' });

  const evidenceRows = evidenceRowsRaw as unknown as EvidenceRow[];
  const evidenceById = new Map(evidenceRows.map((item) => [item.id, item]));
  const signalById = new Map(signalRows.map((item) => [item.id, item]));
  const benchmarkById = new Map(roleSkills.map((item) => [item.skillId, item]));

  const scoreRecords: Array<{
    benchmark: CompetencyBenchmark;
    scoreId: string;
    gapId: string;
    demonstratedScore: number;
    confidenceScore: number;
    evidenceStrength: EvidenceStrength;
    primarySignalId: string;
    primaryEvidenceId: string;
    evidenceText: string;
    gap: ReturnType<typeof calculateSkillGap>;
  }> = [];

  for (const item of coverage) {
    const benchmark = benchmarkById.get(item.skillId)!;
    const calculated = calculateSkillScore(benchmark, signals);
    if (
      calculated.status !== 'SCORED' ||
      calculated.demonstratedScore === null ||
      !calculated.primarySignalId ||
      !calculated.primaryEvidenceId
    ) {
      throw new AuditFinalizationError('INSUFFICIENT_EVIDENCE', `No scorable evidence for ${benchmark.skillName}.`, 422);
    }
    const primarySignal = signalById.get(calculated.primarySignalId);
    const primaryEvidence = evidenceById.get(calculated.primaryEvidenceId);
    if (!primarySignal || !primaryEvidence) {
      throw new AuditFinalizationError('EVIDENCE_CHAIN_BROKEN', `Score lineage is incomplete for ${benchmark.skillName}.`, 409);
    }
    const confidenceScore = Number(primarySignal.confidence_score || 0);
    const evidenceStrength = (primarySignal.evidence_strength || 'None') as EvidenceStrength;

    const scoreResult = await supabase
      .from('audit_skill_scores')
      .upsert(
        {
          session_id: auditId,
          user_id: session.user_id,
          role_id: session.target_role_id,
          skill_id: benchmark.skillId,
          skill_name: benchmark.skillName,
          expected_score: benchmark.expectedScore,
          demonstrated_score: calculated.demonstratedScore,
          primary_signal_id: calculated.primarySignalId,
          primary_evidence_id: calculated.primaryEvidenceId,
          confidence_score: confidenceScore,
          scoring_model_version: 'career-voice-deterministic:v2',
          calculation: {
            contract: 'career-voice-skill-score:v2',
            extractedLevel: primarySignal.extracted_level,
            evidenceStrength,
            confidenceScore,
            requiredLevel: benchmark.requiredLevel,
            expectedReadiness: benchmark.expectedScore,
            roleSkillWeight: benchmark.importanceWeight,
            minimumEvidenceThreshold: benchmark.minimumEvidenceThreshold,
            minimumEvidenceStrength: benchmark.minimumEvidenceStrength,
            formula: 'deterministic proficiency × evidence strength × confidence; score emitted only after configured evidence gate passes',
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,skill_id' }
      )
      .select('id')
      .single();
    if (scoreResult.error || !scoreResult.data) {
      throw new PersistenceError('audit_skill_score_upsert', scoreResult.error?.message || 'Score persistence failed.');
    }

    const gap = calculateSkillGap(benchmark, calculated.demonstratedScore, {
      signalIds: calculated.signalIds,
      evidenceIds: calculated.evidenceIds,
    });
    const gapResult = await supabase
      .from('audit_skill_gaps')
      .upsert(
        {
          session_id: auditId,
          user_id: session.user_id,
          score_id: scoreResult.data.id,
          expected_score: gap.expectedScore,
          demonstrated_score: gap.demonstratedScore,
          gap_score: gap.gap,
          priority_weight: gap.priorityWeight,
          weighted_gap: gap.weightedGap,
          priority: gap.priority,
          importance_weight: benchmark.importanceWeight,
          employability_impact: benchmark.employabilityWeight,
          dependency_weight: benchmark.dependencyWeight,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'score_id' }
      )
      .select('id')
      .single();
    if (gapResult.error || !gapResult.data) {
      throw new PersistenceError('audit_skill_gap_upsert', gapResult.error?.message || 'Gap persistence failed.');
    }

    scoreRecords.push({
      benchmark,
      scoreId: scoreResult.data.id as string,
      gapId: gapResult.data.id as string,
      demonstratedScore: calculated.demonstratedScore,
      confidenceScore,
      evidenceStrength,
      primarySignalId: calculated.primarySignalId,
      primaryEvidenceId: calculated.primaryEvidenceId,
      evidenceText: primaryEvidence.raw_text || primarySignal.raw_answer_snippet || '',
      gap,
    });
  }

  const overallScore = weightedReadiness(scoreRecords);
  const readinessStatus = readinessStatusForScore(overallScore);
  const readinessBenchmark = Number(competencyModel.minimum_readiness_benchmark);
  const distanceFromBenchmark = Math.max(readinessBenchmark - overallScore, 0);
  const frozenResults = scoreRecords.map((record) => ({
    skillId: record.benchmark.skillId,
    skillName: record.benchmark.skillName,
    requiredLevel: record.benchmark.requiredLevel,
    expectedReadiness: record.benchmark.expectedScore,
    demonstratedReadiness: record.demonstratedScore,
    evidenceStrength: record.evidenceStrength,
    confidenceScore: record.confidenceScore,
    gap: record.gap.gap,
    weightedGap: record.gap.weightedGap,
    priority: record.gap.priority,
    evidence: record.evidenceText,
  }));

  const explanation = await generateStructuredJson<ExplanationPayload>({
    model: serverConfig.geminiEvaluationModel,
    systemInstruction:
      'You are the explanation layer for Pathwisse CareerVoice. Scores, gaps, priorities, evidence IDs, and benchmark values supplied to you are frozen backend calculations. Do not create, change, round, or reinterpret any number. Explain the evidence and write concrete next actions. Do not imply external or real-time industry validation. Use the phrase target-role readiness benchmark when discussing the benchmark.',
    prompt: `Explain the frozen CareerVoice diagnosis for ${role.title}. Return exactly one skillExplanations item per supplied skillId.\n${JSON.stringify({
      role: { id: role.id, title: role.title, description: role.description },
      overallScore,
      readinessStatus,
      readinessBenchmark,
      frozenResults,
    })}`,
    responseSchema: explanationSchema(),
    validate: (value) => validateExplanation(value, new Set(roleSkills.map((item) => item.skillId))),
  });
  const explanationBySkill = new Map(explanation.skillExplanations.map((item) => [item.skillId, item]));

  const mappingBySlug = new Map(mappings.map((item) => [String(item.career_voice_skill_slug), item]));
  const sortedRecords = [...scoreRecords].sort(
    (a, b) => b.gap.weightedGap - a.gap.weightedGap || a.benchmark.skillName.localeCompare(b.benchmark.skillName)
  );

  const gaps: AuditSkillGapResponse[] = sortedRecords.map((record) => {
    const mapping = mappingBySlug.get(record.benchmark.skillSlug || '');
    const isMapped =
      mapping?.mapping_status === 'MAPPED' &&
      Boolean(mapping?.pathwisse_skill_id) &&
      Array.isArray(mapping?.pathwisse_stage_ids) &&
      mapping.pathwisse_stage_ids.length > 0;
    return {
      gapId: record.gapId,
      skillId: record.benchmark.skillId,
      skillName: record.benchmark.skillName,
      expectedScore: record.gap.expectedScore,
      demonstratedScore: record.gap.demonstratedScore,
      gap: record.gap.gap,
      priorityWeight: record.gap.priorityWeight,
      weightedGap: record.gap.weightedGap,
      priority: record.gap.priority,
      evidenceIds: [record.primaryEvidenceId],
      signalIds: [record.primarySignalId],
      evidenceBasis: record.evidenceText,
      recommendedAction: explanationBySkill.get(record.benchmark.skillId)!.recommendedAction,
      mappingStatus: isMapped ? 'MAPPED' : 'UNMAPPED',
      recommendedPathwisseSkillId: isMapped ? String(mapping.pathwisse_skill_id) : undefined,
      recommendedStageIds: isMapped ? mapping.pathwisse_stage_ids : [],
    };
  });

  const evidenceLedger: EvidenceLedgerItem[] = roleSkills.map((benchmark) => {
    const related = signalRows.filter((signal) => signal.skill_name.trim().toLowerCase() === benchmark.skillName.trim().toLowerCase());
    return {
      skillId: benchmark.skillId,
      skillName: benchmark.skillName,
      observedEvidence: related
        .filter((signal) => signal.evidence_strength === 'Strong' || signal.evidence_strength === 'Moderate')
        .map((signal) => signal.raw_answer_snippet || '')
        .filter(Boolean),
      weakEvidence: related
        .filter((signal) => signal.evidence_strength === 'Weak')
        .map((signal) => signal.raw_answer_snippet || '')
        .filter(Boolean),
      missingEvidence: [],
      contradictoryEvidence: [],
    };
  });

  const skillMap = scoreRecords.map((record) => ({
    skillId: record.benchmark.skillId,
    skillName: record.benchmark.skillName,
    requiredLevel: record.benchmark.requiredLevel || '',
    expectedReadiness: record.benchmark.expectedScore,
    demonstratedReadiness: record.demonstratedScore,
    evidenceConfidence: record.confidenceScore,
    evidenceStrength: record.evidenceStrength,
    evidenceObserved: [record.evidenceText].filter(Boolean),
    missingEvidence: [],
    scoreId: record.scoreId,
    gapId: record.gapId,
  }));

  const strengths = [...scoreRecords]
    .filter((record) => record.evidenceStrength === 'Strong' || record.demonstratedScore >= record.benchmark.expectedScore)
    .sort((a, b) => b.demonstratedScore - a.demonstratedScore)
    .slice(0, 5)
    .map((record) => ({
      skillId: record.benchmark.skillId,
      skillName: record.benchmark.skillName,
      demonstratedScore: record.demonstratedScore,
      evidence: record.evidenceText,
      confidenceScore: record.confidenceScore,
      whyItMatters: explanationBySkill.get(record.benchmark.skillId)!.whyItMatters,
    }));

  const deleteOldRecommendations = await supabase.from('audit_recommendations').delete().eq('session_id', auditId);
  if (deleteOldRecommendations.error) {
    throw new PersistenceError('audit_recommendations_clear', deleteOldRecommendations.error.message);
  }

  const priorityRecommendations: CareerAuditReportResponse['priorityRecommendations'] = [];
  const priorityGaps = gaps.filter((gap) => gap.gap > 0).slice(0, 5);
  for (let index = 0; index < priorityGaps.length; index += 1) {
    const gap = priorityGaps[index];
    const explanationItem = explanationBySkill.get(gap.skillId)!;
    const benchmark = benchmarkById.get(gap.skillId)!;
    const mapping = mappingBySlug.get(benchmark.skillSlug || '');
    const mappingId = gap.mappingStatus === 'MAPPED' ? mapping?.id || null : null;
    const persisted = await supabase
      .from('audit_recommendations')
      .insert({
        session_id: auditId,
        user_id: session.user_id,
        gap_id: gap.gapId,
        rank: index + 1,
        recommended_action: explanationItem.recommendedAction,
        reason: explanationItem.reason,
        mapping_id: mappingId,
        mapping_status: gap.mappingStatus,
        pathwisse_skill_id: gap.recommendedPathwisseSkillId || null,
        recommended_stage_ids: gap.recommendedStageIds,
      })
      .select('id')
      .single();
    if (persisted.error || !persisted.data) {
      throw new PersistenceError('audit_recommendation_insert', persisted.error?.message || 'Recommendation persistence failed.');
    }
    priorityRecommendations.push({
      recommendationId: persisted.data.id as string,
      gapId: gap.gapId,
      rank: index + 1,
      recommendedAction: explanationItem.recommendedAction,
      reason: explanationItem.reason,
      mappingStatus: gap.mappingStatus,
      pathwisseSkillId: gap.recommendedPathwisseSkillId,
      recommendedStageIds: gap.recommendedStageIds,
    });
  }

  const diagnosticConclusions: CareerAuditReportResponse['diagnosticConclusions'] = sortedRecords.map((record) => ({
    id: record.gapId,
    skillName: record.benchmark.skillName,
    studentAnswerSnippet: record.evidenceText,
    evidenceVerified: `${record.evidenceStrength} persisted evidence`,
    evidenceStrength: record.evidenceStrength,
    score: record.demonstratedScore,
    confidenceScore: record.confidenceScore,
    confidenceLevel: confidenceLevel(record.confidenceScore),
    gapSeverity: gapSeverity(record.gap.priority),
    gapDescription: `Target-role readiness benchmark ${record.benchmark.expectedScore}; demonstrated ${record.demonstratedScore}; deterministic gap ${record.gap.gap}.`,
    recommendedAction: explanationBySkill.get(record.benchmark.skillId)!.recommendedAction,
  }));

  const selectedRecommendation = roleRecommendations.find((item) => String(item.role_id) === session.target_role_id);
  const whyRoleFits = selectedRecommendation
    ? [
        String(selectedRecommendation.reason),
        ...((selectedRecommendation.supporting_evidence || []) as unknown[]).map((item) => `Discovery evidence: ${String(item)}`),
      ].slice(0, 5)
    : [];

  const handoff: CareerAuditRoadmapHandoffV1 = {
    contract: 'career-voice-pathwisse-handoff:v1',
    auditId,
    studentId: session.user_id,
    targetRoleId: session.target_role_id,
    readinessScore: overallScore,
    priorityGaps: priorityGaps.map((gap) => ({
      gapId: gap.gapId,
      skillId: gap.skillId,
      skillName: gap.skillName,
      expectedScore: gap.expectedScore,
      demonstratedScore: gap.demonstratedScore,
      gapScore: gap.gap,
      priority: gap.priority,
      mappingStatus: gap.mappingStatus,
      recommendedPathwisseSkillId: gap.recommendedPathwisseSkillId,
      recommendedStageIds: gap.recommendedStageIds,
      evidenceIds: gap.evidenceIds,
    })),
  };

  const report: CareerAuditReportResponse = {
    success: true,
    auditId,
    targetRoleId: session.target_role_id,
    targetRole: String(role.title),
    overallScore,
    readinessStatus,
    readinessBenchmark,
    distanceFromBenchmark,
    diagnosisSummary: explanation.diagnosisSummary,
    whyRoleFits,
    strengths,
    skillMap,
    gaps,
    evidenceCoverage: coverage,
    evidenceLedger,
    priorityRecommendations,
    diagnosticConclusions,
  };

  const reportResult = await supabase
    .from('audit_reports')
    .upsert(
      {
        session_id: auditId,
        user_id: session.user_id,
        overall_score: overallScore,
        career_clarity_score: null,
        technical_readiness_score: overallScore,
        project_readiness_score: null,
        communication_score: null,
        placement_readiness_score: null,
        execution_readiness_score: null,
        diagnosis: explanation.diagnosisSummary,
        gaps,
        strengths,
        recommendations: priorityRecommendations,
        personalised_roadmap: {},
        pathwisse_handoff: handoff,
        evidence_coverage: coverage,
        readiness_status: readinessStatus,
        hiring_benchmark: readinessBenchmark,
        distance_from_benchmark: distanceFromBenchmark,
        role_fit_reasons: whyRoleFits,
        evidence_ledger: evidenceLedger,
        report_version: 'career-audit-report:v2',
        model_metadata: {
          explanationEngine: 'gemini-http',
          explanationModel: serverConfig.geminiEvaluationModel,
          scoringEngine: 'career-voice-deterministic:v2',
          roleSkillConfigurationSource: 'career_role_skills',
          reportPayload: report,
        },
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    )
    .select('id')
    .single();
  if (reportResult.error || !reportResult.data) {
    throw new PersistenceError('audit_report_upsert', reportResult.error?.message || 'Report persistence failed.');
  }

  await updateAuditSession(supabase, auditId, {
    status: 'completed',
    application_state: 'READINESS_REPORT',
    completed_at: new Date().toISOString(),
    current_step: messages.length,
    current_competency_skill_id: null,
  });

  return report;
}
