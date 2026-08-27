import { Type } from '@google/genai';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  calculateOverallReadiness,
  calculateSkillGap,
  scoreSignal,
  readinessStatusForScore,
  type CompetencyBenchmark,
  type DimensionScores,
  type EvidenceStrength,
  type GapPriority,
  type ReadinessWeights,
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
  loadCompetencyModel,
  loadPathwisseMappings,
  loadRole,
  updateAuditSession,
  PersistenceError,
} from './auditRepository';

export class AuditFinalizationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 422) {
    super(message);
    this.name = 'AuditFinalizationError';
    this.code = code;
    this.status = status;
  }
}

interface ClassificationItem {
  skillId: string;
  skillName: string;
  evidenceId: string;
  extractedLevel: string;
  confidenceScore: number;
  evidenceStrength: EvidenceStrength;
  contradictory: boolean;
}

interface DimensionClassification {
  dimension:
    | 'careerClarity'
    | 'projectReadiness'
    | 'communication'
    | 'placementReadiness'
    | 'executionReadiness';
  evidenceId: string;
  extractedLevel: string;
  confidenceScore: number;
  evidenceStrength: EvidenceStrength;
}

interface ClassificationPayload {
  competencySignals: ClassificationItem[];
  dimensionSignals: DimensionClassification[];
}

interface ExplanationPayload {
  diagnosisSummary: string;
  whyRoleFits: string[];
  skillExplanations: Array<{
    skillId: string;
    whyItMatters: string;
    recommendedAction: string;
    reason: string;
  }>;
}

interface EvidenceRow {
  id: string;
  source_message_id?: string | null;
  evidence_type: string;
  raw_text?: string | null;
  evidence_strength?: string | null;
  source?: string | null;
  claimed_level?: string | null;
  status?: string;
  metadata?: Record<string, unknown>;
}

interface CompetencyRecord extends CompetencyBenchmark {
  skillSlug: string;
  description: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function readNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${name} must be between 0 and 100`);
  }
  return value;
}

function readStrength(value: unknown): EvidenceStrength {
  const strength = readString(value, 'evidenceStrength') as EvidenceStrength;
  if (!['Strong', 'Moderate', 'Weak', 'None'].includes(strength)) {
    throw new Error('evidenceStrength is invalid');
  }
  return strength;
}

function parseCompetencies(value: unknown): CompetencyRecord[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AuditFinalizationError('COMPETENCY_MODEL_INVALID', 'The selected role has no valid competency benchmark.', 409);
  }

  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`competency ${index} is invalid`);
    return {
      skillId: readString(item.skillId, `competency[${index}].skillId`),
      skillSlug: readString(item.skillSlug ?? item.skillName, `competency[${index}].skillSlug`),
      skillName: readString(item.skillName, `competency[${index}].skillName`),
      category: readString(item.category ?? 'Role Competency', `competency[${index}].category`),
      expectedScore: readNumber(item.expectedScore, `competency[${index}].expectedScore`),
      importanceWeight: Number(item.importanceWeight ?? 1),
      dependencyWeight: Number(item.dependencyWeight ?? 1),
      employabilityWeight: Number(item.employabilityWeight ?? 1),
      requiredLevel: typeof item.requiredLevel === 'string' ? item.requiredLevel : undefined,
      description: typeof item.description === 'string' ? item.description : '',
    };
  });
}

function validateClassification(
  value: unknown,
  competencies: CompetencyRecord[],
  evidenceIds: Set<string>
): ClassificationPayload {
  if (!isRecord(value) || !Array.isArray(value.competencySignals) || !Array.isArray(value.dimensionSignals)) {
    throw new Error('classification payload is malformed');
  }

  const competencyById = new Map(competencies.map((item) => [item.skillId, item]));
  const competencySignals = value.competencySignals.map((entry, index): ClassificationItem => {
    if (!isRecord(entry)) throw new Error(`competencySignals[${index}] is invalid`);
    const skillId = readString(entry.skillId, `competencySignals[${index}].skillId`);
    const competency = competencyById.get(skillId);
    if (!competency) throw new Error(`Unknown competency skillId ${skillId}`);
    const evidenceId = readString(entry.evidenceId, `competencySignals[${index}].evidenceId`);
    if (!evidenceIds.has(evidenceId)) throw new Error(`Unknown evidenceId ${evidenceId}`);
    return {
      skillId,
      skillName: competency.skillName,
      evidenceId,
      extractedLevel: readString(entry.extractedLevel, `competencySignals[${index}].extractedLevel`),
      confidenceScore: readNumber(entry.confidenceScore, `competencySignals[${index}].confidenceScore`),
      evidenceStrength: readStrength(entry.evidenceStrength),
      contradictory: entry.contradictory === true,
    };
  });

  const seenSkillIds = new Set(competencySignals.map((item) => item.skillId));
  for (const competency of competencies) {
    if (!seenSkillIds.has(competency.skillId)) {
      throw new Error(`Gemini did not classify required competency ${competency.skillId}`);
    }
  }

  const allowedDimensions = new Set([
    'careerClarity',
    'projectReadiness',
    'communication',
    'placementReadiness',
    'executionReadiness',
  ]);
  const dimensionSignals = value.dimensionSignals.map((entry, index): DimensionClassification => {
    if (!isRecord(entry)) throw new Error(`dimensionSignals[${index}] is invalid`);
    const dimension = readString(entry.dimension, `dimensionSignals[${index}].dimension`);
    if (!allowedDimensions.has(dimension)) throw new Error(`Unknown dimension ${dimension}`);
    const evidenceId = readString(entry.evidenceId, `dimensionSignals[${index}].evidenceId`);
    if (!evidenceIds.has(evidenceId)) throw new Error(`Unknown dimension evidenceId ${evidenceId}`);
    return {
      dimension: dimension as DimensionClassification['dimension'],
      evidenceId,
      extractedLevel: readString(entry.extractedLevel, `dimensionSignals[${index}].extractedLevel`),
      confidenceScore: readNumber(entry.confidenceScore, `dimensionSignals[${index}].confidenceScore`),
      evidenceStrength: readStrength(entry.evidenceStrength),
    };
  });

  for (const dimension of allowedDimensions) {
    if (!dimensionSignals.some((item) => item.dimension === dimension)) {
      throw new Error(`Gemini did not classify required dimension ${dimension}`);
    }
  }

  return { competencySignals, dimensionSignals };
}

function validateExplanation(value: unknown, skillIds: Set<string>): ExplanationPayload {
  if (!isRecord(value) || !Array.isArray(value.whyRoleFits) || !Array.isArray(value.skillExplanations)) {
    throw new Error('explanation payload is malformed');
  }
  const diagnosisSummary = readString(value.diagnosisSummary, 'diagnosisSummary');
  const whyRoleFits = value.whyRoleFits.map((item, index) => readString(item, `whyRoleFits[${index}]`));
  const skillExplanations = value.skillExplanations.map((entry, index) => {
    if (!isRecord(entry)) throw new Error(`skillExplanations[${index}] is invalid`);
    const skillId = readString(entry.skillId, `skillExplanations[${index}].skillId`);
    if (!skillIds.has(skillId)) throw new Error(`Unknown explanation skillId ${skillId}`);
    return {
      skillId,
      whyItMatters: readString(entry.whyItMatters, `skillExplanations[${index}].whyItMatters`),
      recommendedAction: readString(entry.recommendedAction, `skillExplanations[${index}].recommendedAction`),
      reason: readString(entry.reason, `skillExplanations[${index}].reason`),
    };
  });
  const seen = new Set(skillExplanations.map((item) => item.skillId));
  for (const skillId of skillIds) {
    if (!seen.has(skillId)) throw new Error(`Gemini explanation missing skillId ${skillId}`);
  }
  return { diagnosisSummary, whyRoleFits, skillExplanations };
}

function classificationSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      competencySignals: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            skillId: { type: Type.STRING },
            evidenceId: { type: Type.STRING },
            extractedLevel: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            evidenceStrength: { type: Type.STRING },
            contradictory: { type: Type.BOOLEAN },
          },
          required: ['skillId', 'evidenceId', 'extractedLevel', 'confidenceScore', 'evidenceStrength', 'contradictory'],
        },
      },
      dimensionSignals: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            dimension: { type: Type.STRING },
            evidenceId: { type: Type.STRING },
            extractedLevel: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            evidenceStrength: { type: Type.STRING },
          },
          required: ['dimension', 'evidenceId', 'extractedLevel', 'confidenceScore', 'evidenceStrength'],
        },
      },
    },
    required: ['competencySignals', 'dimensionSignals'],
  };
}

function explanationSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      diagnosisSummary: { type: Type.STRING },
      whyRoleFits: { type: Type.ARRAY, items: { type: Type.STRING } },
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
    required: ['diagnosisSummary', 'whyRoleFits', 'skillExplanations'],
  };
}

function weightedTechnicalScore(
  competencies: CompetencyRecord[],
  demonstratedBySkill: Map<string, number>
): number {
  const totalWeight = competencies.reduce((sum, item) => sum + Math.max(0, item.importanceWeight), 0);
  if (totalWeight === 0) return 0;
  const weighted = competencies.reduce(
    (sum, item) => sum + (demonstratedBySkill.get(item.skillId) || 0) * Math.max(0, item.importanceWeight),
    0
  );
  return Math.round(weighted / totalWeight);
}

function dimensionScore(item: DimensionClassification): number {
  return scoreSignal({
    id: `dimension:${item.dimension}`,
    skillName: item.dimension,
    extractedLevel: item.extractedLevel,
    confidenceScore: item.confidenceScore,
    evidenceStrength: item.evidenceStrength,
    evidenceId: item.evidenceId,
  });
}

function confidenceLevel(score: number): 'High' | 'Medium' | 'Low' {
  return score >= 80 ? 'High' : score >= 55 ? 'Medium' : 'Low';
}

function gapSeverity(priority: GapPriority): 'RED' | 'ORANGE' | 'GREEN' {
  if (priority === 'Critical' || priority === 'High') return 'RED';
  if (priority === 'Medium') return 'ORANGE';
  return 'GREEN';
}

function signalLevelForLegacy(level: string): string {
  const normalized = level.trim().toLowerCase();
  if (normalized === 'expert') return 'Expert';
  if (normalized === 'advanced') return 'Advanced';
  if (normalized === 'intermediate') return 'Intermediate';
  return 'Beginner';
}

async function persistFinalClassification(
  supabase: SupabaseClient,
  input: {
    auditId: string;
    studentId: string;
    roleId: string;
    competency: CompetencyRecord;
    classification: ClassificationItem;
    evidence: EvidenceRow;
  }
): Promise<string> {
  const idempotencyKey = `finalize:${input.auditId}:${input.competency.skillId}`;
  const existing = await supabase
    .from('audit_skill_signals')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existing.error) throw new PersistenceError('final_signal_lookup', existing.error.message);
  if (existing.data?.id) return existing.data.id as string;
  const isDemonstrated = input.classification.evidenceStrength === 'Strong' || input.classification.evidenceStrength === 'Moderate';

  const inserted = await supabase
    .from('audit_skill_signals')
    .insert({
      session_id: input.auditId,
      user_id: input.studentId,
      role_id: input.roleId,
      skill_slug: input.competency.skillSlug,
      skill_name: input.competency.skillName,
      level: signalLevelForLegacy(input.classification.extractedLevel),
      score: null,
      confidence: input.classification.confidenceScore / 100,
      source_message_id: input.evidence.source_message_id || null,
      idempotency_key: idempotencyKey,
      evidence_summary: input.evidence.raw_text || '',
      evidence_id: input.evidence.id,
      claimed_level: input.evidence.claimed_level || null,
      extracted_level: input.classification.extractedLevel,
      confidence_score: input.classification.confidenceScore,
      evidence_strength: input.classification.evidenceStrength,
      raw_answer_snippet: input.evidence.raw_text || '',
      source: input.evidence.source || 'document',
      contract_version: isDemonstrated ? 'career-audit:v1' : 'legacy',
      metadata: {
        classifier: serverConfig.openrouterConfigured ? 'openrouter-http' : 'gemini-http',
        classifierModel: serverConfig.openrouterConfigured ? serverConfig.openrouterLlmModel : serverConfig.geminiEvaluationModel,
        competencySkillId: input.competency.skillId,
        contradictory: input.classification.contradictory,
      },
    })
    .select('id')
    .single();
  if (inserted.error || !inserted.data) {
    throw new PersistenceError('final_signal_insert', inserted.error?.message || 'Signal insert failed.');
  }
  return inserted.data.id as string;
}

async function upsertScoreAndGap(
  supabase: SupabaseClient,
  input: {
    auditId: string;
    studentId: string;
    roleId: string;
    competency: CompetencyRecord;
    signalId: string;
    evidenceId: string;
    confidenceScore: number;
    demonstratedScore: number;
  }
): Promise<{ scoreId: string; gapId: string; gap: ReturnType<typeof calculateSkillGap> }> {
  const scoreResult = await supabase
    .from('audit_skill_scores')
    .upsert(
      {
        session_id: input.auditId,
        user_id: input.studentId,
        role_id: input.roleId,
        skill_id: input.competency.skillId,
        skill_name: input.competency.skillName,
        expected_score: input.competency.expectedScore,
        demonstrated_score: input.demonstratedScore,
        primary_signal_id: input.signalId,
        primary_evidence_id: input.evidenceId,
        confidence_score: input.confidenceScore,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id,skill_id' }
    )
    .select('id')
    .single();
  if (scoreResult.error || !scoreResult.data) {
    throw new PersistenceError('audit_skill_score_upsert', scoreResult.error?.message || 'Score persistence failed.');
  }

  const gap = calculateSkillGap(input.competency, input.demonstratedScore, {
    signalIds: [input.signalId],
    evidenceIds: [input.evidenceId],
  });

  const gapResult = await supabase
    .from('audit_skill_gaps')
    .upsert(
      {
        session_id: input.auditId,
        user_id: input.studentId,
        score_id: scoreResult.data.id,
        expected_score: gap.expectedScore,
        demonstrated_score: gap.demonstratedScore,
        gap_score: gap.gap,
        priority_weight: gap.priorityWeight,
        weighted_gap: gap.weightedGap,
        priority: gap.priority,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'score_id' }
    )
    .select('id')
    .single();
  if (gapResult.error || !gapResult.data) {
    throw new PersistenceError('audit_skill_gap_upsert', gapResult.error?.message || 'Gap persistence failed.');
  }

  return { scoreId: scoreResult.data.id as string, gapId: gapResult.data.id as string, gap };
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
    .select('personalised_roadmap')
    .eq('session_id', auditId)
    .maybeSingle();
  if (result.error) throw new PersistenceError('audit_handoff_read', result.error.message);
  const payload = result.data?.personalised_roadmap;
  return payload && isRecord(payload) ? (payload as unknown as CareerAuditRoadmapHandoffV1) : null;
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
  const [role, model, evidenceRowsRaw, messages, mappings] = await Promise.all([
    loadRole(supabase, session.target_role_id),
    loadCompetencyModel(supabase, session.target_role_id),
    loadAuditEvidence(supabase, auditId),
    loadAuditMessages(supabase, auditId),
    loadPathwisseMappings(supabase, session.target_role_id),
  ]);

  if (!role) throw new AuditFinalizationError('TARGET_ROLE_NOT_FOUND', 'Target role is not published.', 404);
  if (!model) throw new AuditFinalizationError('COMPETENCY_MODEL_MISSING', 'Target role has no competency model.', 409);
  const competencies = parseCompetencies(model.core_competencies);
  const evidenceRows = evidenceRowsRaw as EvidenceRow[];
  const usableEvidence = evidenceRows.filter((item) => typeof item.raw_text === 'string' && item.raw_text.trim().length > 0);
  if (usableEvidence.length === 0) {
    throw new AuditFinalizationError('INSUFFICIENT_EVIDENCE', 'No persisted student evidence is available to score this audit.', 422);
  }
  await updateAuditSession(supabase, auditId, { status: 'processing' });

  const evidenceIds = new Set(usableEvidence.map((item) => item.id));
  const classifierInput = {
    targetRole: { id: role.id, title: role.title, category: role.category, description: role.description },
    competencies,
    evidence: usableEvidence.map((item) => ({
      id: item.id,
      rawText: item.raw_text,
      source: item.source,
      evidenceType: item.evidence_type,
    })),
    messages: messages.map((item) => ({ id: item.id, actor: item.actor, content: item.content })),
  };

  const classification = await generateStructuredJson<ClassificationPayload>({
    model: serverConfig.geminiEvaluationModel,
    systemInstruction:
      'You are the evidence-classification layer for Pathwisse CareerVoice. Classify only what the persisted evidence demonstrates. Never calculate readiness scores, gaps, priorities, or recommendations. For every competency and every requested dimension choose the single most relevant supplied evidenceId. If the evidence does not demonstrate the competency, use evidenceStrength None with a conservative proficiency level. Do not invent evidence or identifiers.',
    prompt: `Classify this immutable audit evidence against the exact benchmark. Return exactly one competencySignals item per competency and one dimensionSignals item for each of careerClarity, projectReadiness, communication, placementReadiness, executionReadiness.\n${JSON.stringify(classifierInput)}`,
    responseSchema: classificationSchema(),
    validate: (value) => validateClassification(value, competencies, evidenceIds),
  });

  const evidenceById = new Map(usableEvidence.map((item) => [item.id, item]));
  const scoreRecords: Array<{
    competency: CompetencyRecord;
    classification: ClassificationItem;
    evidence: EvidenceRow;
    signalId: string;
    gapId: string;
    demonstratedScore: number;
    gap: ReturnType<typeof calculateSkillGap>;
  }> = [];

  for (const competency of competencies) {
    const classified = classification.competencySignals.find((item) => item.skillId === competency.skillId);
    if (!classified) throw new AuditFinalizationError('AI_RESPONSE_INVALID', `Missing classification for ${competency.skillName}.`, 502);
    const evidence = evidenceById.get(classified.evidenceId);
    if (!evidence) throw new AuditFinalizationError('AI_RESPONSE_INVALID', 'Classification referenced missing evidence.', 502);
    const signalId = await persistFinalClassification(supabase, {
      auditId,
      studentId: session.user_id,
      roleId: session.target_role_id,
      competency,
      classification: classified,
      evidence,
    });
    const scoringSignal: ScoringSignal = {
      id: signalId,
      skillName: competency.skillName,
      extractedLevel: classified.extractedLevel,
      confidenceScore: classified.confidenceScore,
      evidenceStrength: classified.evidenceStrength,
      evidenceId: classified.evidenceId,
    };
    const demonstratedScore = scoreSignal(scoringSignal);
    const persisted = await upsertScoreAndGap(supabase, {
      auditId,
      studentId: session.user_id,
      roleId: session.target_role_id,
      competency,
      signalId,
      evidenceId: classified.evidenceId,
      confidenceScore: classified.confidenceScore,
      demonstratedScore,
    });
    scoreRecords.push({
      competency,
      classification: classified,
      evidence,
      signalId,
      gapId: persisted.gapId,
      demonstratedScore,
      gap: persisted.gap,
    });
  }

  const demonstratedBySkill = new Map(scoreRecords.map((record) => [record.competency.skillId, record.demonstratedScore]));
  const dimensionByName = new Map(classification.dimensionSignals.map((item) => [item.dimension, dimensionScore(item)]));
  const dimensionScores: DimensionScores = {
    careerClarity: dimensionByName.get('careerClarity') || 0,
    technicalReadiness: weightedTechnicalScore(competencies, demonstratedBySkill),
    projectReadiness: dimensionByName.get('projectReadiness') || 0,
    communication: dimensionByName.get('communication') || 0,
    placementReadiness: dimensionByName.get('placementReadiness') || 0,
    executionReadiness: dimensionByName.get('executionReadiness') || 0,
  };
  const weights: ReadinessWeights = {
    careerClarity: Number(model.clarity_weight),
    technicalReadiness: Number(model.technical_weight),
    projectReadiness: Number(model.project_weight),
    communication: Number(model.communication_weight),
    placementReadiness: Number(model.placement_weight),
    executionReadiness: Number(model.execution_weight),
  };
  const overallScore = calculateOverallReadiness(dimensionScores, weights);
  const readinessStatus = readinessStatusForScore(overallScore);
  const hiringBenchmark = Number(model.minimum_readiness_benchmark || 75);
  const distanceFromBenchmark = Math.max(hiringBenchmark - overallScore, 0);

  const deterministicResults = scoreRecords.map((record) => ({
    skillId: record.competency.skillId,
    skillName: record.competency.skillName,
    expectedScore: record.competency.expectedScore,
    demonstratedScore: record.demonstratedScore,
    gap: record.gap.gap,
    priority: record.gap.priority,
    weightedGap: record.gap.weightedGap,
    evidenceId: record.evidence.id,
    evidence: record.evidence.raw_text,
    evidenceStrength: record.classification.evidenceStrength,
    contradictory: record.classification.contradictory,
  }));

  const explanation = await generateStructuredJson<ExplanationPayload>({
    model: serverConfig.geminiEvaluationModel,
    systemInstruction:
      'You are the explanation layer for Pathwisse CareerVoice. The supplied scores, gaps, priorities and benchmark are immutable deterministic results. Explain them using only the supplied evidence. Do not output or alter any numeric score. For each supplied skillId provide a concrete recommendedAction and a traceable reason. Avoid motivational filler.',
    prompt: `Explain these frozen audit results for ${role.title}. Every skillId must appear exactly once in skillExplanations.\n${JSON.stringify({
      role: { id: role.id, title: role.title, description: role.description },
      overallScore,
      readinessStatus,
      hiringBenchmark,
      dimensionScores,
      deterministicResults,
    })}`,
    responseSchema: explanationSchema(),
    validate: (value) => validateExplanation(value, new Set(competencies.map((item) => item.skillId))),
  });

  const explanationBySkill = new Map(explanation.skillExplanations.map((item) => [item.skillId, item]));
  const mappingBySlug = new Map(mappings.map((item) => [String(item.career_voice_skill_slug), item]));

  const sortedRecords = [...scoreRecords].sort((a, b) => b.gap.weightedGap - a.gap.weightedGap || a.competency.skillName.localeCompare(b.competency.skillName));
  const gaps: AuditSkillGapResponse[] = sortedRecords.map((record) => {
    const mapping = mappingBySlug.get(record.competency.skillSlug);
    const explanationItem = explanationBySkill.get(record.competency.skillId)!;
    return {
      gapId: record.gapId,
      skillId: record.competency.skillId,
      skillName: record.competency.skillName,
      expectedScore: record.gap.expectedScore,
      demonstratedScore: record.gap.demonstratedScore,
      gap: record.gap.gap,
      priorityWeight: record.gap.priorityWeight,
      weightedGap: record.gap.weightedGap,
      priority: record.gap.priority,
      evidenceIds: [record.evidence.id],
      signalIds: [record.signalId],
      evidenceBasis: record.evidence.raw_text || '',
      recommendedAction: explanationItem.recommendedAction,
      mappingStatus: mapping?.mapping_status === 'MAPPED' ? 'MAPPED' : 'UNMAPPED',
      recommendedPathwisseSkillId: mapping?.pathwisse_skill_id || undefined,
      recommendedStageIds: Array.isArray(mapping?.pathwisse_stage_ids) ? mapping.pathwisse_stage_ids : [],
    };
  });

  const evidenceLedger: EvidenceLedgerItem[] = scoreRecords.map((record) => ({
    skillId: record.competency.skillId,
    skillName: record.competency.skillName,
    observedEvidence:
      record.classification.evidenceStrength === 'Strong' || record.classification.evidenceStrength === 'Moderate'
        ? [record.evidence.raw_text || '']
        : [],
    missingEvidence: record.classification.evidenceStrength === 'None' ? [record.competency.description] : [],
    weakEvidence: record.classification.evidenceStrength === 'Weak' ? [record.evidence.raw_text || ''] : [],
    contradictoryEvidence: record.classification.contradictory ? [record.evidence.raw_text || ''] : [],
  }));

  const strengths = [...scoreRecords]
    .filter((record) => record.demonstratedScore >= record.competency.expectedScore || record.classification.evidenceStrength === 'Strong')
    .sort((a, b) => b.demonstratedScore - a.demonstratedScore)
    .slice(0, 5)
    .map((record) => ({
      skillId: record.competency.skillId,
      skillName: record.competency.skillName,
      demonstratedScore: record.demonstratedScore,
      evidence: record.evidence.raw_text || '',
      confidenceScore: record.classification.confidenceScore,
      whyItMatters: explanationBySkill.get(record.competency.skillId)!.whyItMatters,
    }));

  const recommendationRows: CareerAuditReportResponse['priorityRecommendations'] = [];
  let rank = 1;
  for (const gap of gaps.filter((item) => item.gap > 0)) {
    const explanationItem = explanationBySkill.get(gap.skillId)!;
    const mapping = mappings.find((item) => String(item.career_voice_skill_slug) === competencies.find((c) => c.skillId === gap.skillId)?.skillSlug);
    const persisted = await supabase
      .from('audit_recommendations')
      .upsert(
        {
          session_id: auditId,
          user_id: session.user_id,
          gap_id: gap.gapId,
          rank,
          recommended_action: explanationItem.recommendedAction,
          reason: explanationItem.reason,
          mapping_id: mapping?.id || null,
          mapping_status: gap.mappingStatus,
          pathwisse_skill_id: gap.recommendedPathwisseSkillId || null,
          recommended_stage_ids: gap.recommendedStageIds,
        },
        { onConflict: 'session_id,gap_id' }
      )
      .select('id')
      .single();
    if (persisted.error || !persisted.data) {
      throw new PersistenceError('audit_recommendation_upsert', persisted.error?.message || 'Recommendation persistence failed.');
    }
    recommendationRows.push({
      recommendationId: persisted.data.id as string,
      gapId: gap.gapId,
      rank,
      recommendedAction: explanationItem.recommendedAction,
      reason: explanationItem.reason,
      mappingStatus: gap.mappingStatus,
      pathwisseSkillId: gap.recommendedPathwisseSkillId,
      recommendedStageIds: gap.recommendedStageIds,
    });
    rank += 1;
  }

  const diagnosticConclusions: CareerAuditReportResponse['diagnosticConclusions'] = sortedRecords.map((record) => {
    const explanationItem = explanationBySkill.get(record.competency.skillId)!;
    return {
      id: record.gapId,
      skillName: record.competency.skillName,
      studentAnswerSnippet: record.evidence.raw_text || '',
      evidenceVerified: `${record.classification.evidenceStrength} evidence from ${record.evidence.source || record.evidence.evidence_type}`,
      evidenceStrength: record.classification.evidenceStrength,
      score: record.demonstratedScore,
      confidenceScore: record.classification.confidenceScore,
      confidenceLevel: confidenceLevel(record.classification.confidenceScore),
      gapSeverity: gapSeverity(record.gap.priority),
      gapDescription: `Expected ${record.competency.expectedScore}; demonstrated ${record.demonstratedScore}; deterministic gap ${record.gap.gap}.`,
      recommendedAction: explanationItem.recommendedAction,
    };
  });

  const handoff: CareerAuditRoadmapHandoffV1 = {
    contract: 'career-audit-roadmap-contract:v1',
    auditId,
    studentId: session.user_id,
    targetRoleId: session.target_role_id,
    readinessScore: overallScore,
    priorityGaps: gaps
      .filter((gap) => gap.gap > 0)
      .map((gap) => ({
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
    targetRole: role.title as string,
    overallScore,
    readinessStatus,
    hiringBenchmark,
    distanceFromBenchmark,
    dimensionScores,
    diagnosisSummary: explanation.diagnosisSummary,
    whyRoleFits: explanation.whyRoleFits,
    strengths,
    gaps,
    evidenceLedger,
    priorityRecommendations: recommendationRows,
    diagnosticConclusions,
  };

  const reportResult = await supabase
    .from('audit_reports')
    .upsert(
      {
        session_id: auditId,
        user_id: session.user_id,
        overall_score: overallScore,
        career_clarity_score: dimensionScores.careerClarity,
        technical_readiness_score: dimensionScores.technicalReadiness,
        project_readiness_score: dimensionScores.projectReadiness,
        communication_score: dimensionScores.communication,
        placement_readiness_score: dimensionScores.placementReadiness,
        execution_readiness_score: dimensionScores.executionReadiness,
        diagnosis: explanation.diagnosisSummary,
        gaps,
        strengths,
        recommendations: recommendationRows,
        personalised_roadmap: handoff,
        readiness_status: readinessStatus,
        hiring_benchmark: hiringBenchmark,
        distance_from_benchmark: distanceFromBenchmark,
        role_fit_reasons: explanation.whyRoleFits,
        evidence_ledger: evidenceLedger,
        report_version: 'career-audit-report:v1',
        model_metadata: {
          intelligenceEngine: 'gemini-http',
          classifierModel: serverConfig.geminiEvaluationModel,
          scoringEngine: 'career-voice-deterministic:v1',
          dimensionSignals: classification.dimensionSignals,
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
    completed_at: new Date().toISOString(),
    current_step: messages.length,
  });

  return report;
}
