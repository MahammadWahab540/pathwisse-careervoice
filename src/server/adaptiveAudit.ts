import { Type } from '@google/genai';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildEvidenceCoverage,
  selectNextCompetency,
  type CompetencyBenchmark,
  type EvidenceStrength,
  type ScoringSignal,
} from '../domain/careerAudit';
import { serverConfig } from './config';
import { generateStructuredJson } from './gemini';
import {
  getAuditSession,
  loadAuditEvidence,
  loadAuditMessages,
  loadAuditSignals,
  loadCareerDiscoveryProfile,
  loadRole,
  loadRoleSkills,
  persistAnswerEvidence,
  persistAuditMessage,
  persistSkillSignal,
  updateAuditSession,
} from './auditRepository';

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
  configuration_source: string;
}

interface ClassifiedSignal {
  skillId: string;
  extractedLevel: string;
  confidenceScore: number;
  evidenceStrength: EvidenceStrength;
  rationale: string;
}

interface ClassificationResponse {
  signals: ClassifiedSignal[];
}

interface ProbeResponse {
  qalamText: string;
}

const STRENGTH_RANK: Record<EvidenceStrength, number> = {
  None: 0,
  Weak: 1,
  Moderate: 2,
  Strong: 3,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
  return value.trim();
}

function boundedNumber(value: unknown, field: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) throw new Error(`${field} must be between 0 and 100`);
  return number;
}

function readStrength(value: unknown): EvidenceStrength {
  const strength = requiredString(value, 'evidenceStrength') as EvidenceStrength;
  if (!['Strong', 'Moderate', 'Weak', 'None'].includes(strength)) throw new Error('evidenceStrength is invalid');
  return strength;
}

function normalizeRoleSkill(row: RoleSkillRow): CompetencyBenchmark {
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

function mapSignal(row: Record<string, unknown>): ScoringSignal | null {
  if (!row.id || !row.skill_name || !row.extracted_level || row.confidence_score === null || row.confidence_score === undefined) return null;
  const evidenceStrength = String(row.evidence_strength || 'None') as EvidenceStrength;
  if (!['Strong', 'Moderate', 'Weak', 'None'].includes(evidenceStrength)) return null;
  return {
    id: String(row.id),
    skillName: String(row.skill_name),
    extractedLevel: String(row.extracted_level),
    confidenceScore: Number(row.confidence_score),
    evidenceStrength,
    evidenceId: row.evidence_id ? String(row.evidence_id) : undefined,
  };
}

export function looksLikeBareClaim(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 12) return false;
  const claimLanguage = /\b(i\s+(know|use|used|learned|have\s+used|am\s+good\s+at)|familiar\s+with|experience\s+with)\b/i.test(normalized);
  const concreteAction = /\b(built|implemented|designed|debugged|deployed|optimized|created|migrated|tested|led|measured|integrated|fixed|owned|shipped|analyzed|automated)\b/i.test(normalized);
  return claimLanguage && !concreteAction;
}

function validateClassification(value: unknown, allowedSkillIds: Set<string>): ClassificationResponse {
  if (!isRecord(value) || !Array.isArray(value.signals)) throw new Error('signals must be an array');
  const signals = value.signals.map((item, index): ClassifiedSignal => {
    if (!isRecord(item)) throw new Error(`signals[${index}] is invalid`);
    const skillId = requiredString(item.skillId, `signals[${index}].skillId`);
    if (!allowedSkillIds.has(skillId)) throw new Error(`Unknown role skill ${skillId}`);
    return {
      skillId,
      extractedLevel: requiredString(item.extractedLevel, `signals[${index}].extractedLevel`),
      confidenceScore: boundedNumber(item.confidenceScore, `signals[${index}].confidenceScore`),
      evidenceStrength: readStrength(item.evidenceStrength),
      rationale: requiredString(item.rationale, `signals[${index}].rationale`),
    };
  });
  return { signals };
}

function validateProbe(value: unknown): ProbeResponse {
  if (!isRecord(value)) throw new Error('Probe response must be an object');
  return { qalamText: requiredString(value.qalamText, 'qalamText') };
}

async function loadAdaptiveContext(supabase: SupabaseClient, auditId: string) {
  const session = await getAuditSession(supabase, auditId);
  if (!session.target_role_id) throw new Error('Target role is required before the adaptive audit.');
  const [role, roleSkillRows, signalsRaw, evidence, messages, studentProfile] = await Promise.all([
    loadRole(supabase, session.target_role_id),
    loadRoleSkills(supabase, [session.target_role_id]),
    loadAuditSignals(supabase, auditId),
    loadAuditEvidence(supabase, auditId),
    loadAuditMessages(supabase, auditId),
    loadCareerDiscoveryProfile(supabase, session.user_id),
  ]);
  if (!role) throw new Error('Selected target role is not published.');
  const roleSkills = (roleSkillRows as RoleSkillRow[]).map(normalizeRoleSkill);
  if (roleSkills.length === 0) throw new Error('Selected target role has no assessment configuration.');
  const signals = (signalsRaw as Array<Record<string, unknown>>).map(mapSignal).filter((item): item is ScoringSignal => Boolean(item));
  const coverage = buildEvidenceCoverage(roleSkills, signals);
  return { session, role, roleSkills, signals, coverage, evidence, messages, studentProfile };
}

export async function getEvidenceCoverage(supabase: SupabaseClient, auditId: string) {
  const context = await loadAdaptiveContext(supabase, auditId);
  const nextCompetency = selectNextCompetency(context.roleSkills, context.signals);
  return {
    coverage: context.coverage,
    complete: nextCompetency === null,
    nextCompetency,
  };
}

async function generateProbe(
  supabase: SupabaseClient,
  auditId: string,
  nextCompetency: CompetencyBenchmark,
  weakAnswer?: string
): Promise<string> {
  const context = await loadAdaptiveContext(supabase, auditId);
  const previousAnswers = context.messages
    .filter((message) => message.actor === 'user')
    .slice(-10)
    .map((message) => message.content);
  const existingEvidence = context.evidence
    .filter((item) => item.raw_text)
    .slice(-12)
    .map((item) => ({ rawText: item.raw_text, strength: item.evidence_strength, source: item.source }));

  const response = await generateStructuredJson<ProbeResponse>({
    model: serverConfig.geminiChatModel,
    systemInstruction:
      'You are Qalam, Pathwisse CareerVoice adaptive auditor. Ask exactly one concise evidence-seeking question. Never calculate or mention a readiness score. Never accept a claim as proof. Probe for personal contribution, concrete implementation/process detail, a challenge or trade-off, and an outcome. Stay on the supplied next competency until its configured minimum evidence threshold is met. Use the DB probe guidance as guidance, not as a fixed questionnaire.',
    prompt: `Base role context:\n${JSON.stringify({ id: context.role.id, title: context.role.title, description: context.role.description })}\nDB role skill context:\n${JSON.stringify(context.roleSkills)}\nStudent context:\n${JSON.stringify(context.studentProfile || context.session.context || {})}\nExisting evidence:\n${JSON.stringify(existingEvidence)}\nPrevious student answers:\n${JSON.stringify(previousAnswers)}\nCurrent evidence coverage:\n${JSON.stringify(context.coverage)}\nNext competency to investigate:\n${JSON.stringify(nextCompetency)}\nLatest weak/insufficient answer if any:\n${JSON.stringify(weakAnswer || null)}\nReturn only the next natural question as qalamText.`,
    responseSchema: {
      type: Type.OBJECT,
      properties: { qalamText: { type: Type.STRING } },
      required: ['qalamText'],
    },
    validate: validateProbe,
  });
  return response.qalamText;
}

export async function getNextAdaptiveProbe(supabase: SupabaseClient, auditId: string) {
  const state = await getEvidenceCoverage(supabase, auditId);
  if (!state.nextCompetency) {
    return { success: true, complete: true, coverage: state.coverage, nextCompetency: null, qalamText: null };
  }
  const qalamText = await generateProbe(supabase, auditId, state.nextCompetency);
  await updateAuditSession(supabase, auditId, {
    status: 'in_progress',
    application_state: 'ADAPTIVE_AUDIT',
    current_competency_skill_id: state.nextCompetency.skillId,
  });
  return { success: true, complete: false, coverage: state.coverage, nextCompetency: state.nextCompetency, qalamText };
}

export async function processAdaptiveTurn(
  supabase: SupabaseClient,
  input: {
    auditId: string;
    userText: string;
    inputMethod: 'voice' | 'text' | 'tap';
    clientMessageId: string;
  }
) {
  const before = await loadAdaptiveContext(supabase, input.auditId);
  const userMessage = await persistAuditMessage(supabase, {
    auditId: input.auditId,
    studentId: before.session.user_id,
    actor: 'user',
    content: input.userText,
    inputMode: input.inputMethod,
    clientMessageId: input.clientMessageId,
    metadata: { phase: 'ADAPTIVE_AUDIT', competencySkillId: before.session.current_competency_skill_id },
  });
  const evidenceId = await persistAnswerEvidence(supabase, {
    auditId: input.auditId,
    studentId: before.session.user_id,
    sourceMessageId: userMessage.id,
    rawText: input.userText,
    source: input.inputMethod === 'voice' ? 'voice_probe' : 'typed_probe',
    metadata: { phase: 'ADAPTIVE_AUDIT', competencySkillId: before.session.current_competency_skill_id },
  });

  const allowedSkillIds = new Set(before.roleSkills.map((skill) => skill.skillId));
  const classification = await generateStructuredJson<ClassificationResponse>({
    model: serverConfig.geminiEvaluationModel,
    systemInstruction:
      'You are the evidence-classification layer for Pathwisse CareerVoice. Classify only competencies explicitly demonstrated by this single student answer. Do not calculate scores, gaps, priorities, or recommendations. A short claim such as “I know React” is Weak or None, never Moderate or Strong. Moderate evidence needs a concrete example with personal contribution and implementation/process detail. Strong evidence additionally needs technical/functional depth plus a challenge/trade-off and outcome. Return an empty signals array when no role competency is actually evidenced.',
    prompt: `Selected role:\n${JSON.stringify({ id: before.role.id, title: before.role.title, description: before.role.description })}\nAllowed DB role skills and rubrics:\n${JSON.stringify(before.roleSkills)}\nStudent career profile:\n${JSON.stringify(before.studentProfile || {})}\nExisting evidence coverage before this answer:\n${JSON.stringify(before.coverage)}\nStudent answer to classify:\n${JSON.stringify(input.userText)}\nOnly use supplied skillId values.`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        signals: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              skillId: { type: Type.STRING },
              extractedLevel: { type: Type.STRING },
              confidenceScore: { type: Type.NUMBER },
              evidenceStrength: { type: Type.STRING },
              rationale: { type: Type.STRING },
            },
            required: ['skillId', 'extractedLevel', 'confidenceScore', 'evidenceStrength', 'rationale'],
          },
        },
      },
      required: ['signals'],
    },
    validate: (value) => validateClassification(value, allowedSkillIds),
  });

  const bareClaim = looksLikeBareClaim(input.userText);
  const roleSkillById = new Map(before.roleSkills.map((skill) => [skill.skillId, skill]));
  const normalizedSignals = classification.signals.map((signal) => {
    if (!bareClaim || STRENGTH_RANK[signal.evidenceStrength] <= STRENGTH_RANK.Weak) return signal;
    return { ...signal, evidenceStrength: 'Weak' as const, confidenceScore: Math.min(signal.confidenceScore, 50), extractedLevel: 'Unverified' };
  });

  const sortedForEvidence = [...normalizedSignals].sort((a, b) => STRENGTH_RANK[a.evidenceStrength] - STRENGTH_RANK[b.evidenceStrength]);
  const persistedSignals: Array<{ signalId: string; evidenceId: string; skillId: string }> = [];
  for (const signal of sortedForEvidence) {
    const skill = roleSkillById.get(signal.skillId);
    if (!skill) continue;
    const persisted = await persistSkillSignal(supabase, {
      auditId: input.auditId,
      studentId: before.session.user_id,
      skillName: skill.skillName,
      extractedLevel: signal.extractedLevel,
      confidenceScore: signal.confidenceScore,
      evidenceStrength: signal.evidenceStrength,
      rawAnswerSnippet: input.userText,
      source: input.inputMethod === 'voice' ? 'voice_probe' : 'typed_probe',
      sourceMessageId: userMessage.id,
      evidenceId,
      idempotencyKey: `${userMessage.id}:${signal.skillId}`,
    });
    persistedSignals.push({ ...persisted, skillId: signal.skillId });
  }

  if (normalizedSignals.length === 0) {
    const evidenceUpdate = await supabase
      .from('audit_evidence')
      .update({ evidence_strength: 'None', status: 'verified' })
      .eq('id', evidenceId);
    if (evidenceUpdate.error) throw new Error(`Evidence classification could not be persisted: ${evidenceUpdate.error.message}`);
  }

  const after = await loadAdaptiveContext(supabase, input.auditId);
  const nextCompetency = selectNextCompetency(after.roleSkills, after.signals);
  const complete = nextCompetency === null;
  const qalamText = complete
    ? 'I now have sufficient evidence across the configured target-role competencies. You can review the evidence before CareerVoice calculates readiness.'
    : await generateProbe(supabase, input.auditId, nextCompetency, input.userText);

  const qalamMessage = await persistAuditMessage(supabase, {
    auditId: input.auditId,
    studentId: before.session.user_id,
    actor: 'assistant',
    content: qalamText,
    inputMode: 'system',
    clientMessageId: `${input.clientMessageId}:qalam`,
    metadata: {
      phase: 'ADAPTIVE_AUDIT',
      evidenceId,
      complete,
      nextCompetencySkillId: nextCompetency?.skillId || null,
      bareClaimGuardApplied: bareClaim,
    },
  });

  await updateAuditSession(supabase, input.auditId, {
    status: 'in_progress',
    application_state: complete ? 'EVIDENCE_REVIEW' : 'ADAPTIVE_AUDIT',
    interview_ready_at: complete ? new Date().toISOString() : null,
    current_competency_skill_id: nextCompetency?.skillId || null,
  });

  return {
    success: true,
    sourceMessageId: userMessage.id,
    evidenceId,
    qalamMessageId: qalamMessage.id,
    qalamText,
    extractedSignals: normalizedSignals,
    persistedSignals,
    coverage: after.coverage,
    interviewComplete: complete,
    nextCompetency,
    bareClaimGuardApplied: bareClaim,
  };
}
