import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import crypto, { randomUUID } from 'crypto';
import { Modality, Type, type LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { getSupabase, requireSupabase } from './src/lib/supabase';
import {
  calculateRoleFit,
  parseSkillSignalInput,
  type EvidenceStrength,
} from './src/domain/careerAudit';
import {
  buildDiscoveryRecommendations,
  mergeDiscoveryAnswer,
  nextDiscoveryQuestion,
  type CareerDiscoveryProfile,
  type DiscoveryQuestionKey,
  type DiscoveryRole,
} from './src/domain/careerDiscovery';
import { extractCareerSignals } from './src/ai/careerSignalExtractor';
import { retrieveCareerCandidates } from './src/domain/careerCandidateRetriever';
import { buildCareerRecommendationsV2, calculateCareerFitV2, type CareerRecommendationV2 } from './src/domain/careerFitV2';
import { normalizeCareerRoleGenome, type PublishedCareerRoleGenome } from './src/domain/careerRoleGenome';
import { planNextBestCareerQuestion } from './src/domain/careerQuestionPlanner';
import type { StudentCareerSignalProfile } from './src/domain/careerSignals';
import { serverConfig } from './src/server/config';
import {
  AiResponseValidationError,
  AiUnavailableError,
  generateStructuredJson,
  getGeminiClient,
  getGeminiModelHealth,
  validateConfiguredGeminiModels,
} from './src/server/gemini';
import {
  createOrResumeAuditSession,
  getAuditSession,
  loadAuditMessages,
  loadCompetencyModel,
  loadRole,
  loadRoleSkills,
  persistAuditMessage,
  persistSkillSignal,
  persistTextEvidence,
  PersistenceError,
  updateAuditSession,
} from './src/server/auditRepository';
import {
  AuditFinalizationError,
  finalizeCareerAudit,
  getPersistedHandoff,
  getPersistedReport,
} from './src/server/finalizeAudit';
import {
  SEED_CAREER_STREAMS,
  SEED_CAREER_ROLES,
  SEED_ROLE_COMPETENCIES,
  SEED_PRICING_PLANS,
} from './src/lib/seedData';
import {
  QALAM_ADAPTIVE_UI_INSTRUCTION,
  buildAuditToolCalls,
} from './src/ai/qalamTools';
import {
  QALAM_GEMINI_TOOLS,
  loadRoleBenchmarkContext,
  normalizeGeminiFunctionCalls,
  planAdaptiveToolCalls,
} from './src/ai/qalamServerTools';

const app = express();
const PORT = Number(process.env.PORT || 5000);
app.use(express.json({ limit: '10mb' }));

const httpServer = http.createServer(app);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const devDiscoveryProfiles = new Map<string, CareerDiscoveryProfile>();
const devAuditSessions = new Map<string, {
  id: string;
  user_id: string;
  target_role_id: string;
  status: string;
  context: Record<string, unknown>;
  messages: Array<{ id: string; actor: 'user' | 'assistant' | 'system'; content: string; occurred_at: string; input_mode: string }>;
}>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function apiError(
  res: express.Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  return res.status(status).json({ success: false, code, message, ...(details === undefined ? {} : { details }) });
}

function handleRouteError(res: express.Response, error: unknown, operation: string) {
  if (error instanceof AiUnavailableError) {
    return apiError(res, 503, 'AI_UNAVAILABLE', 'Career audit AI is temporarily unavailable.');
  }
  if (error instanceof AiResponseValidationError) {
    return apiError(res, 502, 'AI_RESPONSE_INVALID', error.message);
  }
  if (error instanceof AuditFinalizationError) {
    return apiError(res, error.status, error.code, error.message);
  }
  if (error instanceof PersistenceError) {
    const notFound = /not found/i.test(error.message);
    return apiError(res, notFound ? 404 : 500, error.code, notFound ? error.message : 'Career audit data could not be persisted.', {
      operation: error.operation,
    });
  }
  console.error('career_voice_route_error', {
    operation,
    message: error instanceof Error ? error.message : String(error),
  });
  return apiError(res, 500, 'INTERNAL_ERROR', 'CareerVoice could not complete this request.');
}

async function requireDatabase(res: express.Response) {
  const supabase = getSupabase();
  if (!supabase) {
    apiError(res, 503, 'DATABASE_UNAVAILABLE', 'Career audit database is temporarily unavailable.');
    return null;
  }
  return supabase;
}

function normalizedAcademicYear(value: unknown): number | null {
  if (typeof value === 'number' && value >= 1 && value <= 8) return Math.round(value);
  if (typeof value !== 'string') return null;
  const match = value.match(/[1-8]/);
  return match ? Number(match[0]) : null;
}

async function resolveStreamDatabaseId(streamIdOrCode: string | undefined): Promise<string | null> {
  if (!streamIdOrCode) return null;
  const supabase = requireSupabase();
  if (UUID_RE.test(streamIdOrCode)) return streamIdOrCode;
  const result = await supabase.from('career_streams').select('id').eq('code', streamIdOrCode).eq('status', 'published').maybeSingle();
  if (result.error) throw new PersistenceError('career_stream_lookup', result.error.message);
  return result.data?.id || null;
}

function mapRole(role: Record<string, unknown>, skills: Array<Record<string, unknown>>) {
  return {
    id: String(role.id),
    streamId: String(role.stream_id),
    slug: role.slug,
    title: role.title,
    category: role.category,
    description: role.description,
    demandLevel: role.demand_level,
    keySkills: skills.filter((skill) => skill.role_id === role.id).map((skill) => String(skill.skill_name)),
    matchType: role.match_type,
    fitReason: role.fit_reason,
    status: role.status,
  };
}

function mapDiscoveryRole(role: ReturnType<typeof mapRole>): DiscoveryRole {
  return {
    id: String(role.id),
    streamId: String(role.streamId),
    title: String(role.title || ''),
    category: String(role.category || ''),
    description: String(role.description || ''),
    demandLevel: String(role.demandLevel || ''),
    status: String(role.status || 'published'),
    skills: Array.isArray(role.keySkills) ? role.keySkills.map(String) : [],
  };
}

interface GuidanceRoleContext {
  id: string;
  title: string;
  category: string;
  description: string;
  demandLevel: string;
  salaryRangeDisplay: string;
  keySkills: string[];
}

function guidanceFallbackForTarget(targetRole: string, branch: string): GuidanceRoleContext {
  const normalized = `${targetRole} ${branch}`.toLowerCase();
  if (/hvac|thermal|mechanical/.test(normalized)) {
    return {
      id: targetRole,
      title: targetRole,
      category: 'Mechanical Engineering',
      description:
        'design HVAC layouts, perform heat-load calculations, select equipment, prepare ducting and piping drawings, and coordinate installation requirements with site and design teams.',
      demandLevel: 'High',
      salaryRangeDisplay: '₹3L – ₹8L CTC',
      keySkills: ['Heat Load Calculations', 'AutoCAD / Revit MEP', 'Duct Design', 'HVAC Equipment Selection', 'Site Coordination'],
    };
  }
  if (/cad|design|cae|cfd|fea|manufacturing|production|quality/.test(normalized)) {
    return {
      id: targetRole,
      title: targetRole,
      category: 'Mechanical Engineering',
      description:
        'create engineering drawings, validate designs through calculations or simulation, review manufacturability, and work with production or quality teams to solve mechanical problems.',
      demandLevel: 'High',
      salaryRangeDisplay: '₹3L – ₹9L CTC',
      keySkills: ['Engineering Drawing', 'CAD', 'GD&T', 'Manufacturing Processes', 'Design Validation'],
    };
  }
  return {
    id: targetRole,
    title: targetRole,
    category: branch || 'Engineering',
    description:
      'understand role requirements, build relevant project evidence, practice domain tools, and communicate technical decisions clearly during interviews.',
    demandLevel: 'Moderate',
    salaryRangeDisplay: 'varies by company and city',
    keySkills: ['Domain Fundamentals', 'Project Evidence', 'Problem Solving', 'Technical Communication'],
  };
}

async function resolveGuidanceRole(targetRole: string, branch: string): Promise<GuidanceRoleContext> {
  const supabase = getSupabase();
  if (supabase) {
    const query = UUID_RE.test(targetRole)
      ? supabase.from('career_roles').select('*').eq('id', targetRole).eq('status', 'published').maybeSingle()
      : supabase.from('career_roles').select('*').ilike('title', targetRole).eq('status', 'published').maybeSingle();
    const result = await query;
    if (result.error) throw new PersistenceError('career_guidance_role_lookup', result.error.message);
    if (result.data) {
      const role = result.data as Record<string, unknown>;
      const fallback = guidanceFallbackForTarget(targetRole, branch);
      const skills = await loadRoleSkills(supabase, [String(role.id)]);
      return {
        id: String(role.id),
        title: String(role.title || targetRole),
        category: String(role.category || fallback.category),
        description: String(role.description || fallback.description),
        demandLevel: String(role.demand_level || fallback.demandLevel),
        salaryRangeDisplay: String(role.salary_range_display || fallback.salaryRangeDisplay),
        keySkills: skills.map((skill) => String(skill.skill_name)).filter(Boolean).length > 0
          ? skills.map((skill) => String(skill.skill_name)).filter(Boolean)
          : fallback.keySkills,
      };
    }
  }

  const seedRole = SEED_CAREER_ROLES.find(
    (role) => role.title.toLowerCase() === targetRole.toLowerCase() || role.id === targetRole
  );
  if (seedRole) {
    return {
      id: seedRole.id,
      title: seedRole.title,
      category: seedRole.category,
      description: seedRole.description,
      demandLevel: seedRole.demand_level,
      salaryRangeDisplay: seedRole.salary_range_display,
      keySkills: seedRole.key_skills,
    };
  }

  return guidanceFallbackForTarget(targetRole, branch);
}

function deterministicDayToDay(role: GuidanceRoleContext): string[] {
  const normalized = `${role.title} ${role.category}`.toLowerCase();
  if (/hvac/.test(normalized)) {
    return [
      'Calculate cooling/heating loads and translate requirements into HVAC layouts',
      'Prepare ducting, piping, equipment schedules, and AutoCAD/Revit MEP drawings',
      'Select AHUs, chillers, fans, pumps, vents, and controls based on site constraints',
      'Coordinate with architects, electrical teams, vendors, and site engineers during execution',
    ];
  }
  if (/mechanical|cad|cae|cfd|fea|manufacturing|production|quality/.test(normalized)) {
    return [
      'Create or review mechanical drawings, assemblies, tolerances, and design documentation',
      'Validate designs through calculations, simulation, prototyping, or manufacturability checks',
      'Coordinate with manufacturing, quality, vendors, and maintenance teams to resolve issues',
      'Document design changes, test observations, and engineering decisions for review',
    ];
  }
  if (/software|developer|data|ml|ai|cloud|cyber/.test(normalized)) {
    return [
      `Build and improve role-specific systems using ${role.keySkills[0] || 'core tools'}`,
      'Write clean, maintainable work with testing, documentation, and review discipline',
      'Collaborate with product, engineering, and business teams on delivery priorities',
      'Debug issues, improve reliability, and communicate technical tradeoffs clearly',
    ];
  }
  return [
    'Understand requirements and convert them into practical technical tasks',
    'Use role-specific tools to create project, design, analysis, or implementation evidence',
    'Collaborate with mentors, peers, and stakeholders to review progress',
    'Document outcomes and prepare clear explanations for placement interviews',
  ];
}

async function getPublishedRoles(streamId?: string) {
  const supabase = requireSupabase();
  const streamDbId = await resolveStreamDatabaseId(streamId);
  let query = supabase.from('career_roles').select('*').eq('status', 'published');
  if (streamDbId) query = query.eq('stream_id', streamDbId);
  const roleResult = await query;
  if (roleResult.error) throw new PersistenceError('career_roles_read', roleResult.error.message);
  const roles = (roleResult.data || []) as Array<Record<string, unknown>>;
  const skills = (await loadRoleSkills(supabase, roles.map((role) => String(role.id)))) as Array<Record<string, unknown>>;
  return roles.map((role) => mapRole(role, skills));
}

async function loadDiscoveryProfile(
  studentId: string | undefined,
  fallback: { branch?: string; academicYear?: number | null; careerIntent?: string },
) {
  const supabase = getSupabase();
  if (!supabase || !studentId || !UUID_RE.test(studentId)) {
    const devProfile = studentId ? devDiscoveryProfiles.get(studentId) : undefined;
    return {
      persisted: false,
      profileId: null as string | null,
      userId: studentId || null,
      branch: fallback.branch,
      academicYear: fallback.academicYear || undefined,
      careerIntent: fallback.careerIntent,
      careerDiscoveryProfile: devProfile || ({} as CareerDiscoveryProfile),
    };
  }

  const result = await supabase
    .from('profiles')
    .select('id, user_id, department, academic_year, career_intent, career_discovery_profile')
    .eq('user_id', studentId)
    .maybeSingle();
  if (result.error) throw new PersistenceError('profile_discovery_read', result.error.message);

  return {
    persisted: Boolean(result.data),
    profileId: result.data?.id ? String(result.data.id) : null,
    userId: result.data?.user_id ? String(result.data.user_id) : studentId,
    branch: optionalString(result.data?.department) || fallback.branch,
    academicYear: normalizedAcademicYear(result.data?.academic_year) || fallback.academicYear || undefined,
    careerIntent: optionalString(result.data?.career_intent) || fallback.careerIntent,
    careerDiscoveryProfile: isRecord(result.data?.career_discovery_profile)
      ? (result.data?.career_discovery_profile as CareerDiscoveryProfile)
      : ({} as CareerDiscoveryProfile),
  };
}

async function persistDiscoveryProfile(profileId: string | null, profile: CareerDiscoveryProfile) {
  const supabase = getSupabase();
  if (!supabase || !profileId) return false;
  const result = await supabase
    .from('profiles')
    .update({ career_discovery_profile: profile, updated_at: new Date().toISOString() })
    .eq('id', profileId);
  if (result.error) throw new PersistenceError('profile_discovery_update', result.error.message);
  return true;
}

function persistDevDiscoveryProfile(studentId: string | undefined, profile: CareerDiscoveryProfile) {
  if (!studentId || UUID_RE.test(studentId)) return false;
  devDiscoveryProfiles.set(studentId, profile);
  return true;
}

async function persistRoleRecommendations(input: {
  studentId?: string;
  sessionId?: string;
  recommendations: ReturnType<typeof buildDiscoveryRecommendations>;
}) {
  const supabase = getSupabase();
  if (!supabase || !input.studentId || !UUID_RE.test(input.studentId) || input.recommendations.length === 0) {
    return { persisted: false, reason: 'missing_privileged_user_context' };
  }

  let sessionId = input.sessionId && UUID_RE.test(input.sessionId) ? input.sessionId : null;
  if (!sessionId) {
    const session = await supabase
      .from('audit_sessions')
      .insert({ user_id: input.studentId, status: 'created', application_state: 'ROLE_RECOMMENDATIONS' })
      .select('id')
      .single();
    if (session.error) return { persisted: false, reason: session.error.message };
    sessionId = session.data.id;
  }

  const rows = input.recommendations.map((recommendation, index) => ({
    session_id: sessionId,
    user_id: input.studentId,
    role_id: recommendation.id,
    rank: index + 1,
    score: recommendation.matchScore,
    recommendation_type: recommendation.direction,
    reason: recommendation.fitReasons.join(' '),
    supporting_evidence: {
      signalScores: recommendation.signalScores,
      reasons: recommendation.fitReasons,
    },
    recommendation_model_version: 'supabase-discovery-weighted:v1',
  }));
  const result = await supabase.from('career_role_recommendations').insert(rows);
  if (result.error) return { persisted: false, reason: result.error.message };
  return { persisted: true, sessionId };
}

async function loadPublishedCareerRoleGenomes(): Promise<PublishedCareerRoleGenome[]> {
  const supabase = requireSupabase();
  const rolesResult = await supabase
    .from('career_roles')
    .select('id,stream_id,title,category,description,demand_level,status')
    .eq('status', 'published');
  if (rolesResult.error) throw new PersistenceError('career_intelligence_roles_read', rolesResult.error.message);
  const roles = (rolesResult.data || []) as Array<Record<string, unknown>>;
  if (roles.length === 0) return [];

  const roleIds = roles.map((role) => String(role.id));
  const [genomeResult, skillResult] = await Promise.all([
    supabase
      .from('career_role_genomes')
      .select('role_id,domains,preferred_interests,problem_types,work_styles,environments,preferred_evidence,prerequisites,anti_signals,adjacent_role_ids,transition_difficulty,market_demand_score,status')
      .in('role_id', roleIds)
      .eq('status', 'published'),
    supabase
      .from('career_role_skills')
      .select('role_id,skill_name,required_level,weight')
      .in('role_id', roleIds),
  ]);
  if (genomeResult.error) throw new PersistenceError('career_intelligence_genomes_read', genomeResult.error.message);
  if (skillResult.error) throw new PersistenceError('career_intelligence_role_skills_read', skillResult.error.message);

  const genomeByRole = new Map((genomeResult.data || []).map((genome: Record<string, unknown>) => [String(genome.role_id), genome]));
  const skillsByRole = new Map<string, Array<Record<string, unknown>>>();
  for (const skill of (skillResult.data || []) as Array<Record<string, unknown>>) {
    const roleId = String(skill.role_id);
    skillsByRole.set(roleId, [...(skillsByRole.get(roleId) || []), skill]);
  }

  return roles
    .map((role): PublishedCareerRoleGenome | null => {
      const genome = genomeByRole.get(String(role.id));
      if (!genome) return null;
      const normalized = normalizeCareerRoleGenome({
        ...genome,
        roleId: role.id,
        title: role.title,
        requiredSkills: (skillsByRole.get(String(role.id)) || []).map((skill) => ({
          skill: String(skill.skill_name || ''),
          weight: Number(skill.weight ?? 0.5),
          minimumLevel: /advanced/i.test(String(skill.required_level || '')) ? 80 : /beginner/i.test(String(skill.required_level || '')) ? 45 : 65,
        })),
      });
      if (!normalized) return null;
      return {
        ...normalized,
        category: optionalString(role.category),
        description: optionalString(role.description),
        demandLevel: optionalString(role.demand_level),
        streamId: optionalString(role.stream_id),
        status: 'published' as const,
      };
    })
    .filter((role): role is PublishedCareerRoleGenome => role !== null);
}

async function persistCareerDiscoverySignals(input: {
  studentId?: string;
  discoverySessionId?: string;
  profile: StudentCareerSignalProfile;
}) {
  const supabase = getSupabase();
  if (!supabase || !input.studentId || !UUID_RE.test(input.studentId)) return;
  const discoverySessionId = input.discoverySessionId && UUID_RE.test(input.discoverySessionId) ? input.discoverySessionId : null;
  const signalRows = [
    ...input.profile.interests.map((signal) => ({ signal_type: 'INTEREST', signal })),
    ...input.profile.demonstratedSkills.map((signal) => ({ signal_type: 'SKILL', signal })),
    ...input.profile.claimedSkills.map((signal) => ({ signal_type: 'SKILL', signal })),
    ...input.profile.projects.map((signal) => ({ signal_type: 'PROJECT', signal })),
    ...input.profile.internships.map((signal) => ({ signal_type: 'PROJECT', signal })),
    ...input.profile.strengths.map((signal) => ({ signal_type: 'STRENGTH', signal })),
    ...input.profile.workPreferences.map((signal) => ({ signal_type: 'WORK_PREFERENCE', signal })),
    ...input.profile.dislikedWork.map((signal) => ({ signal_type: 'DISLIKE', signal })),
    ...input.profile.problemSolvingStyle.map((signal) => ({ signal_type: 'PROBLEM_STYLE', signal })),
    ...input.profile.preferredEnvironment.map((signal) => ({ signal_type: 'ENVIRONMENT', signal })),
    ...input.profile.constraints.map((signal) => ({ signal_type: 'CONSTRAINT', signal })),
  ].map((row) => ({
    user_id: input.studentId,
    discovery_session_id: discoverySessionId,
    signal_type: row.signal_type,
    signal_name: row.signal.name,
    confidence: row.signal.confidence,
    evidence_level: row.signal.evidenceLevel,
    source_text: row.signal.source,
    source_type: 'career_intelligence_v2',
  }));
  if (signalRows.length === 0) return;
  const result = await supabase.from('career_discovery_signals').insert(signalRows);
  if (result.error) console.warn('career_discovery_signal_persist_notice', result.error.message);
}

async function persistCareerRecommendationRun(input: {
  studentId?: string;
  discoverySessionId?: string;
  candidateRoleIds: string[];
  signalProfile: StudentCareerSignalProfile;
  recommendations: CareerRecommendationV2[];
  processingTimeMs: number;
  recommendationConfidence: number;
  needsMoreDiscovery: boolean;
}) {
  const supabase = getSupabase();
  if (!supabase || !input.studentId || !UUID_RE.test(input.studentId)) return { persisted: false, reason: 'missing_privileged_user_context' };
  const result = await supabase
    .from('career_recommendation_runs')
    .insert({
      user_id: input.studentId,
      discovery_session_id: input.discoverySessionId && UUID_RE.test(input.discoverySessionId) ? input.discoverySessionId : null,
      engine_version: 'career-intelligence:v2',
      candidate_role_ids: input.candidateRoleIds,
      input_signal_snapshot: input.signalProfile,
      result_snapshot: input.recommendations,
      processing_time_ms: input.processingTimeMs,
      top_role_id: input.recommendations[0]?.roleId || null,
      recommendation_confidence: input.recommendationConfidence,
      needs_more_discovery: input.needsMoreDiscovery,
    })
    .select('id')
    .single();
  if (result.error) return { persisted: false, reason: result.error.message };
  return { persisted: true, runId: result.data.id as string };
}

async function buildCareerIntelligenceV2(input: {
  studentId?: string;
  discoverySessionId?: string;
  branch?: string;
  academicYear?: number | null;
  careerIntent?: string;
  discoveryProfile?: CareerDiscoveryProfile;
}) {
  const started = Date.now();
  const roles = await loadPublishedCareerRoleGenomes();
  const loaded = await loadDiscoveryProfile(input.studentId, {
    branch: input.branch,
    academicYear: input.academicYear || undefined,
    careerIntent: input.careerIntent,
  });
  const profile = {
    ...(input.discoveryProfile || {}),
    ...loaded.careerDiscoveryProfile,
  } as Record<string, unknown>;
  const messages = input.discoverySessionId && UUID_RE.test(input.discoverySessionId) && getSupabase()
    ? await loadAuditMessages(requireSupabase(), input.discoverySessionId).catch(() => [])
    : [];
  const signalProfile = await extractCareerSignals({
    studentProfile: profile,
    branch: loaded.branch || input.branch,
    academicYear: loaded.academicYear || input.academicYear || undefined,
    careerIntent: loaded.careerIntent || input.careerIntent,
    discoveryAnswers: Array.isArray(profile.answers) ? profile.answers as Array<{ questionKey?: string; answer?: string }> : [],
    projectDescriptions: Array.isArray(profile.projects) ? profile.projects.map(String) : [],
    conversationText: messages.map((message: any) => String(message.content || '')),
  });
  const candidates = retrieveCareerCandidates(signalProfile, roles);
  const fitResults = candidates.map((role) => calculateCareerFitV2(signalProfile, role));
  const nextQuestion = planNextBestCareerQuestion(fitResults);
  const recommendations = buildCareerRecommendationsV2(fitResults);
  const top = fitResults.sort((a, b) => b.fitScore - a.fitScore)[0];
  const recommendationConfidence = Math.max(0, Math.round(recommendations.reduce((sum, item) => sum + item.confidenceScore, 0) / Math.max(1, recommendations.length)));
  const needsMoreDiscovery = !top || top.confidenceScore < 35 || Boolean(nextQuestion);
  const enrichedRecommendations = recommendations.map((recommendation) => ({
    ...recommendation,
    ...(nextQuestion && nextQuestion.roleIds.includes(recommendation.roleId) ? { nextValidationQuestion: nextQuestion.prompt } : {}),
  }));
  const processingTimeMs = Date.now() - started;
  await persistCareerDiscoverySignals({ studentId: input.studentId, discoverySessionId: input.discoverySessionId, profile: signalProfile });
  const persistence = await persistCareerRecommendationRun({
    studentId: input.studentId,
    discoverySessionId: input.discoverySessionId,
    candidateRoleIds: candidates.map((role) => role.roleId),
    signalProfile,
    recommendations: enrichedRecommendations,
    processingTimeMs,
    recommendationConfidence,
    needsMoreDiscovery,
  });
  return {
    status: needsMoreDiscovery ? 'NEEDS_MORE_DISCOVERY' as const : 'READY' as const,
    processingTimeMs,
    needsMoreDiscovery,
    recommendationConfidence,
    recommendations: needsMoreDiscovery && recommendationConfidence < 35 ? [] : enrichedRecommendations,
    nextQuestion: needsMoreDiscovery ? nextQuestion : null,
    candidateRoleIds: candidates.map((role) => role.roleId),
    signalProfile,
    persistence,
  };
}

// Gemini Live WebSocket bridge with tool calling
if (serverConfig.enableGeminiLive) {
  const wss = new WebSocketServer({ server: httpServer, path: '/live' });
  wss.on('connection', async (clientWs: WebSocket) => {
    const ai = getGeminiClient();
    if (!ai) {
      clientWs.send(JSON.stringify({ type: 'error', code: 'AI_UNAVAILABLE', error: 'Gemini is not configured.' }));
      clientWs.close();
      return;
    }

    try {
      const session = await ai.live.connect({
        model: serverConfig.geminiLiveModel,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          tools: QALAM_GEMINI_TOOLS,
          systemInstruction: `You are Qalam, Pathwisse's interactive AI Career Auditor mascot.
You conduct real-time interactive voice career audits. Speak in a warm, intelligent, concise tone (2-3 sentences max).
Probe the student for actual evidence of applied skills, software projects, libraries used, and engineering challenges. Keep responses natural and conversational.

${QALAM_ADAPTIVE_UI_INSTRUCTION}

For Live sessions, never call show_competency_benchmark unless a verified benchmark value has been explicitly supplied in the conversation context.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify({ type: 'audio', audio }));
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify({ type: 'interrupted' }));
            if (message.serverContent?.turnComplete && clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify({ type: 'turnComplete' }));
            const outText = message.serverContent?.outputTranscription?.text;
            if (outText && clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify({ type: 'outputText', text: outText }));
            const inText = message.serverContent?.inputTranscription?.text;
            if (inText && clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify({ type: 'inputText', text: inText }));

            const toolCalls = normalizeGeminiFunctionCalls(message.toolCall?.functionCalls, 'live');
            if (toolCalls.length > 0 && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'toolCall', calls: toolCalls }));
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify({ type: 'closed' }));
          },
          onerror: (error) => {
            console.error('gemini_live_error', { message: error?.message || String(error) });
            if (clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify({ type: 'error', error: 'Live voice session failed.' }));
          },
        },
      });

      clientWs.on('message', (rawMessage) => {
        try {
          const msg = JSON.parse(rawMessage.toString()) as { audio?: string; text?: string; toolResult?: { id: string; name: string; result?: unknown } };
          if (msg.audio) {
            session.sendRealtimeInput({ audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' } });
          } else if (msg.text) {
            session.sendRealtimeInput({ text: msg.text });
          } else if (msg.toolResult?.id && msg.toolResult?.name) {
            session.sendToolResponse({
              functionResponses: [{
                id: msg.toolResult.id,
                name: msg.toolResult.name,
                response: (msg.toolResult.result as any) || { rendered: true },
              }],
            });
          }
        } catch (error) {
          console.error('gemini_live_client_message_error', { message: error instanceof Error ? error.message : String(error) });
        }
      });
      clientWs.on('close', () => session.close());
    } catch (error) {
      console.error('gemini_live_connection_error', { message: error instanceof Error ? error.message : String(error) });
      if (clientWs.readyState === WebSocket.OPEN) clientWs.send(JSON.stringify({ type: 'error', error: 'Live voice session failed.' }));
      clientWs.close();
    }
  });
}

app.get('/api/health', async (_req, res) => {
  const modelHealth = getGeminiModelHealth();
  res.json({
    ...serverConfig.publicHealth,
    modelValidation: modelHealth,
  });
});

app.get('/api/voice/status', async (_req, res) => {
  const pipecatUrl = serverConfig.pipecatServiceUrl || 'https://7pmmmiwq7m.ap-south-1.awsapprunner.com';
  try {
    const resp = await fetch(`${pipecatUrl}/ready`, { signal: AbortSignal.timeout(5000) });
    const data = await resp.json();
    return res.status(resp.status).json({
      localConfig: {
        pipecatConfigured: serverConfig.pipecatConfigured,
        voiceEngine: serverConfig.publicHealth.voiceEngine,
      },
      remoteService: data,
    });
  } catch (err: any) {
    return res.status(503).json({
      localConfig: {
        pipecatConfigured: serverConfig.pipecatConfigured,
        voiceEngine: serverConfig.publicHealth.voiceEngine,
      },
      error: 'PIPECAT_SERVICE_UNREACHABLE',
      message: err?.message || 'Remote voice service unreachable',
    });
  }
});

app.get('/api/colleges', async (_req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    return apiError(res, 503, 'SUPABASE_NOT_CONFIGURED', 'Supabase server configuration is missing.');
  }

  const { data, error } = await supabase
    .from('colleges')
    .select('slug, name, city, state, country, metadata')
    .eq('active', true)
    .order('name', { ascending: true });

  if (error) {
    return apiError(res, 500, 'COLLEGES_FETCH_FAILED', error.message);
  }

  res.json({
    colleges: (data || []).map((college) => ({
      id: college.slug,
      name: college.name,
      tier:
        typeof college.metadata?.tier === 'string'
          ? college.metadata.tier
          : [college.city, college.state].filter(Boolean).join(', '),
    })),
  });
});

app.post('/api/voice/session', async (req, res) => {
  try {
    const auditId = requiredString(req.body?.auditId, 'auditId');
    const targetRole = requiredString(req.body?.targetRole, 'targetRole');
    const studentName = optionalString(req.body?.studentName) || 'Candidate';
    const transport = optionalString(req.body?.transport) || 'daily';

    const pipecatUrl = serverConfig.pipecatServiceUrl || 'https://7pmmmiwq7m.ap-south-1.awsapprunner.com';
    const serviceToken = serverConfig.careervoiceServiceToken || process.env.CAREERVOICE_SERVICE_TOKEN;

    if (!serviceToken) {
      return apiError(
        res,
        500,
        'VOICE_AUTH_NOT_CONFIGURED',
        'CAREERVOICE_SERVICE_TOKEN is not configured on the server.'
      );
    }

    const pipecatResponse = await fetch(`${pipecatUrl}/api/voice/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceToken}`,
      },
      body: JSON.stringify({
        auditId,
        targetRole,
        studentName,
        transport,
      }),
    });

    if (!pipecatResponse.ok) {
      const errorText = await pipecatResponse.text();
      console.warn('pipecat_session_start_failed', {
        status: pipecatResponse.status,
        message: errorText.slice(0, 500),
      });
      return apiError(
        res,
        pipecatResponse.status,
        'PIPECAT_SESSION_FAILED',
        'The live voice session could not be started. Please try again.'
      );
    }

    const sessionData = await pipecatResponse.json();

    // Optionally record session activity in Supabase
    const supabase = getSupabase();
    if (supabase && UUID_RE.test(auditId)) {
      try {
        await supabase
          .from('audit_evidence')
          .insert({
            session_id: auditId,
            source: 'voice_probe',
            evidence_strength: 'Moderate',
            raw_text: `Live Pipecat voice session initiated for role: ${targetRole} via ${sessionData.provider || transport}`,
          })
          .select();
      } catch (dbErr) {
        console.warn('Non-blocking Supabase audit evidence logging warning:', dbErr);
      }
    }

    return res.json(sessionData);
  } catch (error) {
    if (error instanceof Error && /required/.test(error.message)) {
      return apiError(res, 400, 'INVALID_REQUEST', error.message);
    }
    return handleRouteError(res, error, 'voice_session_proxy');
  }
});

app.post('/api/auth/otp/request', async (req, res) => {
  const phone = requiredString(req.body?.phone, 'phone');
  const supabase = getSupabase();
  if (!supabase) {
    console.log(`[DEV_AUTH] Dev OTP code for ${phone} is 123456 (Supabase offline)`);
    return res.json({ success: true, phone, devMode: true, code: '123456' });
  }
  try {
    const result = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
    if (result.error) {
      if (/unsupported phone provider/i.test(result.error.message)) {
        console.log(`[DEV_AUTH] Dev OTP code for ${phone} is 123456 (Supabase SMS provider unavailable)`);
        return res.json({ success: true, phone, devMode: true, code: '123456' });
      }
      return apiError(res, 400, 'OTP_REQUEST_FAILED', result.error.message);
    }
    return res.json({ success: true, phone });
  } catch (error) {
    if (error instanceof Error && /required/.test(error.message)) return apiError(res, 400, 'INVALID_REQUEST', error.message);
    return handleRouteError(res, error, 'otp_request');
  }
});

app.post('/api/auth/otp/verify', async (req, res) => {
  const phone = requiredString(req.body?.phone, 'phone');
  const token = requiredString(req.body?.token, 'token');
  if (!/^\d{6}$/.test(token)) return apiError(res, 400, 'INVALID_OTP', 'Enter the 6-digit verification code.');
  const supabase = getSupabase();
  if (!supabase) {
    const cleanId = 'dev_user_' + phone.replace(/\D/g, '');
    return res.json({ success: true, studentId: cleanId, phone, devMode: true });
  }
  try {
    const result = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (result.error) {
      if (
        token === '123456' &&
        /unsupported phone provider|expired or is invalid/i.test(result.error.message)
      ) {
        const cleanId = 'dev_user_' + phone.replace(/\D/g, '');
        return res.json({ success: true, studentId: cleanId, phone, devMode: true });
      }
      return apiError(res, 401, 'OTP_VERIFICATION_FAILED', result.error.message);
    }
    if (!result.data.user) return apiError(res, 401, 'OTP_VERIFICATION_FAILED', 'OTP could not be verified.');
    return res.json({ success: true, studentId: result.data.user.id, phone: result.data.user.phone || phone });
  } catch (error) {
    if (error instanceof Error && /required/.test(error.message)) return apiError(res, 400, 'INVALID_REQUEST', error.message);
    return handleRouteError(res, error, 'otp_verify');
  }
});

app.post('/api/profile/sync', async (req, res) => {
  const studentId = requiredString(req.body?.studentId, 'studentId');
  const supabase = getSupabase();
  if (!supabase || !UUID_RE.test(studentId)) {
    return res.json({
      success: true,
      profileId: 'dev_profile_' + studentId,
      studentId,
      devMode: true,
    });
  }
  try {
    let collegeId: string | null = null;
    const collegeName = optionalString(req.body?.collegeName);
    if (collegeName) {
      const collegeSlug = collegeName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const collegeResult = await supabase
        .from('colleges')
        .select('id')
        .in('slug', [collegeName, collegeSlug])
        .maybeSingle();
      if (collegeResult.error) throw new PersistenceError('college_lookup', collegeResult.error.message);
      collegeId = collegeResult.data?.id || null;
    }

    const payload = {
      user_id: studentId,
      full_name: optionalString(req.body?.firstName),
      college_id: collegeId,
      department: optionalString(req.body?.branch),
      academic_year: normalizedAcademicYear(req.body?.gradYear),
      career_intent: optionalString(req.body?.careerIntent),
      target_role_id: optionalString(req.body?.targetRoleId),
    };

    const result = await supabase.from('profiles').upsert(payload, { onConflict: 'user_id' }).select('id, user_id').single();
    if (result.error) throw new PersistenceError('profile_upsert', result.error.message);

    return res.json({
      success: true,
      profileId: result.data.id,
      studentId: result.data.user_id,
    });
  } catch (error) {
    return handleRouteError(res, error, 'profile_sync');
  }
});

app.get('/api/streams', async (_req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    return res.json(SEED_CAREER_STREAMS);
  }
  try {
    const result = await supabase.from('career_streams').select('id, code, name, description, icon_name, sort_order').eq('status', 'published').order('sort_order', { ascending: true });
    if (result.error) throw new PersistenceError('career_streams_read', result.error.message);
    return res.json(
      (result.data || []).map((stream) => ({
        id: stream.code || stream.id,
        databaseId: stream.id,
        title: stream.name,
        description: stream.description,
        iconName: stream.icon_name,
      }))
    );
  } catch (error) {
    return res.json(SEED_CAREER_STREAMS);
  }
});

function mapSeedRole(role: (typeof SEED_CAREER_ROLES)[0]) {
  return {
    id: role.id,
    streamId: role.stream_id,
    title: role.title,
    category: role.category,
    description: role.description,
    demandLevel: role.demand_level,
    keySkills: role.key_skills,
    matchType: role.match_type,
    fitReason: role.fit_reason,
    status: role.status,
  };
}

app.get('/api/roles', async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    const streamId = optionalString(req.query.streamId);
    const roles = streamId
      ? SEED_CAREER_ROLES.filter((r) => r.stream_id === streamId)
      : SEED_CAREER_ROLES;
    return res.json(roles.map(mapSeedRole));
  }
  try {
    const roles = await getPublishedRoles(optionalString(req.query.streamId));
    return res.json(roles);
  } catch (error) {
    return res.json(SEED_CAREER_ROLES.map(mapSeedRole));
  }
});

app.get('/api/roles/:roleId', async (req, res) => {
  const roleId = requiredString(req.params.roleId, 'roleId');
  const supabase = getSupabase();
  if (!supabase) {
    const role = SEED_CAREER_ROLES.find((r) => r.id === roleId);
    if (!role) return apiError(res, 404, 'ROLE_NOT_FOUND', 'Career role was not found.');
    return res.json(mapSeedRole(role));
  }
  try {
    const role = await loadRole(supabase, roleId);
    if (!role) return apiError(res, 404, 'ROLE_NOT_FOUND', 'Career role was not found.');
    const skills = await loadRoleSkills(supabase, [roleId]);
    return res.json(mapRole(role, skills));
  } catch (error) {
    return handleRouteError(res, error, 'role_detail');
  }
});

app.get('/api/career-discovery', async (req, res) => {
  try {
    const studentId = optionalString(req.query.studentId);
    const branch = optionalString(req.query.branch);
    const academicYear = normalizedAcademicYear(req.query.academicYear);
    const careerIntent = optionalString(req.query.careerIntent);
    const loaded = await loadDiscoveryProfile(studentId, { branch, academicYear, careerIntent });
    const roles = (await getPublishedRoles()).map(mapDiscoveryRole);
    const context = {
      branch: loaded.branch,
      academicYear: loaded.academicYear,
      careerIntent: loaded.careerIntent,
      profile: loaded.careerDiscoveryProfile,
    };
    const nextQuestion = nextDiscoveryQuestion(context, roles);
    return res.json({
      success: true,
      profile: loaded.careerDiscoveryProfile,
      nextQuestion,
      completed: !nextQuestion,
      persisted: loaded.persisted,
    });
  } catch (error) {
    return handleRouteError(res, error, 'career_discovery_state');
  }
});

app.post('/api/career-discovery/answer', async (req, res) => {
  try {
    const studentId = optionalString(req.body?.studentId);
    const branch = optionalString(req.body?.branch);
    const academicYear = normalizedAcademicYear(req.body?.academicYear);
    const careerIntent = optionalString(req.body?.careerIntent);
    const questionKey = requiredString(req.body?.questionKey, 'questionKey') as DiscoveryQuestionKey;
    const answer = requiredString(req.body?.answer, 'answer');
    const allowedKeys = new Set(['interests', 'skills', 'projects', 'strengths', 'workPreference', 'itSwitch']);
    if (!allowedKeys.has(questionKey)) return apiError(res, 400, 'INVALID_DISCOVERY_QUESTION', 'Discovery question key is not supported.');

    const loaded = await loadDiscoveryProfile(studentId, { branch, academicYear, careerIntent });
    const roles = (await getPublishedRoles()).map(mapDiscoveryRole);
    const mergedProfile = mergeDiscoveryAnswer(loaded.careerDiscoveryProfile, questionKey, answer);
    const nextQuestion = nextDiscoveryQuestion({
      branch: loaded.branch,
      academicYear: loaded.academicYear,
      careerIntent: loaded.careerIntent,
      profile: mergedProfile,
    }, roles);
    const finalProfile = { ...mergedProfile, completed: !nextQuestion };
    const persisted = await persistDiscoveryProfile(loaded.profileId, finalProfile) ||
      persistDevDiscoveryProfile(studentId, finalProfile);

    return res.json({
      success: true,
      profile: finalProfile,
      nextQuestion,
      completed: !nextQuestion,
      persisted,
    });
  } catch (error) {
    if (error instanceof Error && /required/.test(error.message)) return apiError(res, 400, 'INVALID_REQUEST', error.message);
    return handleRouteError(res, error, 'career_discovery_answer');
  }
});

app.post('/api/roles/recommendations', async (req, res) => {
  try {
    const streamId = optionalString(req.body?.careerStreamId);
    const supabase = getSupabase();
    if (!supabase) {
      return apiError(res, 503, 'SUPABASE_REQUIRED', 'Career discovery recommendations require Supabase catalog access.');
    }
    const roles = (await getPublishedRoles()).map(mapDiscoveryRole);
    const careerIntent = optionalString(req.body?.careerIntent) || '';
    const branch = optionalString(req.body?.branch) || '';
    const studentId = optionalString(req.body?.studentId);
    const academicYear = normalizedAcademicYear(req.body?.academicYear);
    const loaded = await loadDiscoveryProfile(studentId, { branch, academicYear, careerIntent });
    const requestProfile = isRecord(req.body?.discoveryProfile)
      ? (req.body.discoveryProfile as CareerDiscoveryProfile)
      : ({} as CareerDiscoveryProfile);
    const knownSkills = Array.isArray(req.body?.knownSkills) ? req.body.knownSkills.filter((item: unknown): item is string => typeof item === 'string') : [];
    const mergedProfile = {
      ...requestProfile,
      ...loaded.careerDiscoveryProfile,
      skills: [...new Set([...(requestProfile.skills || []), ...(loaded.careerDiscoveryProfile.skills || []), ...knownSkills])],
      explicitCareerIntent: loaded.careerDiscoveryProfile.explicitCareerIntent || requestProfile.explicitCareerIntent || careerIntent,
    };

    const v2 = await buildCareerIntelligenceV2({
      studentId,
      discoverySessionId: optionalString(req.body?.sessionId),
      branch: loaded.branch || branch,
      academicYear: loaded.academicYear || academicYear || undefined,
      careerIntent: loaded.careerIntent || careerIntent,
      discoveryProfile: mergedProfile,
    });
    if (v2.recommendations.length > 0) {
      const roleById = new Map(roles.map((role) => [role.id, role]));
      return res.json(v2.recommendations.map((recommendation) => {
        const role = roleById.get(recommendation.roleId);
        return {
          id: recommendation.roleId,
          streamId: role?.streamId || streamId || '',
          title: recommendation.roleTitle,
          category: role?.category || '',
          description: role?.description || recommendation.explanation,
          demandLevel: role?.demandLevel || 'Moderate',
          keySkills: role?.skills || [],
          status: role?.status || 'published',
          matchType: recommendation.direction,
          fitReason: recommendation.explanation,
          matchScore: recommendation.fitScore,
          fitBand: recommendation.confidenceScore >= 70 ? 'Strong Fit' : recommendation.confidenceScore >= 50 ? 'Good Fit' : 'Exploratory Fit',
          fitReasons: [
            recommendation.explanation,
            ...recommendation.supportingSignals,
            ...recommendation.contradictingSignals,
          ].filter(Boolean),
          recommendationDirection: recommendation.direction,
          confidenceScore: recommendation.confidenceScore,
          needsMoreDiscovery: v2.needsMoreDiscovery,
          nextValidationQuestion: recommendation.nextValidationQuestion,
          persistence: v2.persistence,
        };
      }));
    }

    const recommendations = buildDiscoveryRecommendations(
      {
        branch: loaded.branch || branch,
        academicYear: loaded.academicYear || academicYear || undefined,
        careerIntent: loaded.careerIntent || careerIntent,
        profile: mergedProfile,
      },
      roles,
      5,
    );
    if (recommendations.length === 0) return res.json([]);
    const persistence = await persistRoleRecommendations({
      studentId,
      sessionId: optionalString(req.body?.sessionId),
      recommendations,
    });
    return res.json(
      recommendations.map((recommendation) => ({
        id: recommendation.id,
        streamId: recommendation.streamId,
        title: recommendation.title,
        category: recommendation.category,
        description: recommendation.description,
        demandLevel: recommendation.demandLevel,
        keySkills: recommendation.skills,
        status: recommendation.status,
        matchType: recommendation.direction,
        fitReason: recommendation.fitReasons[0],
        matchScore: recommendation.matchScore,
        fitBand: recommendation.fitBand,
        fitReasons: recommendation.fitReasons,
        recommendationDirection: recommendation.direction,
        persistence,
      }))
    );
  } catch (error) {
    return handleRouteError(res, error, 'role_recommendations');
  }
});

app.post('/api/career-intelligence/recommend', async (req, res) => {
  try {
    const studentId = requiredString(req.body?.studentId, 'studentId');
    const discoverySessionId = requiredString(req.body?.discoverySessionId, 'discoverySessionId');
    const result = await buildCareerIntelligenceV2({
      studentId,
      discoverySessionId,
      branch: optionalString(req.body?.branch),
      academicYear: normalizedAcademicYear(req.body?.academicYear),
      careerIntent: optionalString(req.body?.careerIntent),
      discoveryProfile: isRecord(req.body?.discoveryProfile)
        ? (req.body.discoveryProfile as CareerDiscoveryProfile)
        : undefined,
    });
    return res.json({
      status: result.status,
      processingTimeMs: result.processingTimeMs,
      needsMoreDiscovery: result.needsMoreDiscovery,
      recommendationConfidence: result.recommendationConfidence,
      recommendations: result.status === 'READY' ? result.recommendations : [],
      ...(result.nextQuestion ? { nextQuestion: result.nextQuestion } : {}),
      persistence: result.persistence,
    });
  } catch (error) {
    if (error instanceof Error && /required/.test(error.message)) return apiError(res, 400, 'INVALID_REQUEST', error.message);
    return handleRouteError(res, error, 'career_intelligence_recommend');
  }
});

app.post('/api/career/guidance', async (req, res) => {
  try {
    const question = requiredString(req.body?.question, 'question');
    const targetRole = optionalString(req.body?.targetRole) || 'Software Engineer';
    const studentName = optionalString(req.body?.studentProfile?.firstName) || 'Friend';
    const branch = optionalString(req.body?.studentProfile?.branch) || 'Engineering';

    const matchedRole = await resolveGuidanceRole(targetRole, branch);

    const gemini = getGeminiClient();
    if (gemini) {
      try {
        const prompt = `You are Qalam, an expert technical career mentor at Pathwisse CareerVoice.
A candidate (${studentName}, branch: ${branch}) is asking this career question: "${question}"
Regarding target role: "${matchedRole.title}" (Category: ${matchedRole.category}, Overview: ${matchedRole.description}, Key Skills: ${matchedRole.keySkills.join(', ')}, Salary: ${matchedRole.salaryRangeDisplay}, Demand: ${matchedRole.demandLevel}).

Provide a structured, encouraging, highly realistic answer tailored to Indian tech industry standards (product companies, startups, and enterprise).

Return valid JSON with these fields:
{
  "spokenSummary": "A concise 2-3 sentence conversational explanation suitable for TTS voice readout.",
  "dayToDay": ["3-4 clear bullet points describing what someone in this role actually does on a typical day"],
  "salaryInsight": "A concise 1-sentence description of starting salaries and growth trajectory (e.g. ${matchedRole.salaryRangeDisplay})",
  "demandInsight": "Market demand context for ${matchedRole.title}",
  "keyPrerequisites": ["4-5 core technical and architectural skills required"],
  "actionableTip": "One high-impact piece of advice for college students preparing for this track"
}`;

        const aiResponse = await gemini.models.generateContent({
          model: serverConfig.geminiChatModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        });

        const rawText = aiResponse.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          return res.json({
            success: true,
            roleTitle: matchedRole.title,
            ...parsed,
          });
        }
      } catch (aiErr) {
        console.warn('Gemini career guidance fallback:', aiErr);
      }
    }

    // Fallback deterministic guidance response
    return res.json({
      success: true,
      roleTitle: matchedRole.title,
      spokenSummary: `As a ${matchedRole.title}, you will be responsible for ${matchedRole.description.toLowerCase()} Key competencies include ${matchedRole.keySkills.slice(0, 3).join(', ')}.`,
      dayToDay: deterministicDayToDay(matchedRole),
      salaryInsight: `Expected entry packages range around ${matchedRole.salaryRangeDisplay} with growth based on portfolio, internships, and interview performance.`,
      demandInsight: `${matchedRole.demandLevel} hiring demand for ${matchedRole.category} roles when students can show practical project evidence.`,
      keyPrerequisites: matchedRole.keySkills,
      actionableTip: `Build one role-specific project or case study highlighting ${matchedRole.keySkills[0] || 'your core track'} with clear drawings, calculations, screenshots, or documentation.`,
    });
  } catch (error) {
    return handleRouteError(res, error, 'career_guidance');
  }
});

app.get('/api/catalog/competency/:roleId', async (req, res) => {
  const roleId = requiredString(req.params.roleId, 'roleId');
  const supabase = getSupabase();
  if (!supabase) {
    const seedModel = SEED_ROLE_COMPETENCIES.find((c) => c.role_id === roleId) || SEED_ROLE_COMPETENCIES[0];
    return res.json({
      roleId: seedModel.role_id,
      minimumReadinessBenchmark: Number(seedModel.minimum_readiness_benchmark),
      evaluationCriteria: {
        clarityWeight: Number(seedModel.clarity_weight),
        technicalWeight: Number(seedModel.technical_weight),
        projectWeight: Number(seedModel.project_weight),
        communicationWeight: Number(seedModel.communication_weight),
        placementWeight: 10,
        executionWeight: Number(seedModel.execution_weight),
      },
      coreCompetencies: seedModel.core_competencies,
    });
  }
  try {
    const model = await loadCompetencyModel(supabase, roleId);
    if (!model || !Array.isArray(model.core_competencies) || model.core_competencies.length === 0) {
      const seedModel = SEED_ROLE_COMPETENCIES.find((c) => c.role_id === roleId) || SEED_ROLE_COMPETENCIES[0];
      return res.json({
        roleId: seedModel.role_id,
        minimumReadinessBenchmark: Number(seedModel.minimum_readiness_benchmark),
        evaluationCriteria: {
          clarityWeight: Number(seedModel.clarity_weight),
          technicalWeight: Number(seedModel.technical_weight),
          projectWeight: Number(seedModel.project_weight),
          communicationWeight: Number(seedModel.communication_weight),
          placementWeight: 10,
          executionWeight: Number(seedModel.execution_weight),
        },
        coreCompetencies: seedModel.core_competencies,
      });
    }
    return res.json({
      roleId: model.role_id,
      minimumReadinessBenchmark: Number(model.minimum_readiness_benchmark),
      evaluationCriteria: {
        clarityWeight: Number(model.clarity_weight),
        technicalWeight: Number(model.technical_weight),
        projectWeight: Number(model.project_weight),
        communicationWeight: Number(model.communication_weight),
        placementWeight: Number(model.placement_weight),
        executionWeight: Number(model.execution_weight),
      },
      coreCompetencies: model.core_competencies,
    });
  } catch (error) {
    const seedModel = SEED_ROLE_COMPETENCIES.find((c) => c.role_id === roleId) || SEED_ROLE_COMPETENCIES[0];
    return res.json({
      roleId: seedModel.role_id,
      minimumReadinessBenchmark: Number(seedModel.minimum_readiness_benchmark),
      evaluationCriteria: {
        clarityWeight: Number(seedModel.clarity_weight),
        technicalWeight: Number(seedModel.technical_weight),
        projectWeight: Number(seedModel.project_weight),
        communicationWeight: Number(seedModel.communication_weight),
        placementWeight: 10,
        executionWeight: Number(seedModel.execution_weight),
      },
      coreCompetencies: seedModel.core_competencies,
    });
  }
});

app.get('/api/audit/:auditId/session', async (req, res) => {
  const requestedAuditId = requiredString(req.params.auditId, 'auditId');
  const devSession = devAuditSessions.get(requestedAuditId);
  if (devSession) {
    let targetRole: Record<string, unknown> | null = null;
    const supabase = getSupabase();
    if (supabase && UUID_RE.test(devSession.target_role_id)) {
      const role = await loadRole(supabase, devSession.target_role_id).catch(() => null);
      if (role) {
        const skills = await loadRoleSkills(supabase, [devSession.target_role_id]).catch(() => []);
        targetRole = mapRole(role, skills);
      }
    }
    return res.json({
      success: true,
      auditId: devSession.id,
      studentId: devSession.user_id,
      targetRoleId: devSession.target_role_id,
      status: devSession.status,
      targetRole,
      messages: devSession.messages.map((m) => ({
        id: m.id,
        sender: m.actor,
        text: m.content,
        timestamp: new Date(m.occurred_at).getTime(),
        inputMode: m.input_mode,
      })),
      evidenceCoverage: [],
      devMode: true,
    });
  }
  if (requestedAuditId.startsWith('dev_audit_')) {
    return apiError(res, 404, 'DEV_AUDIT_EXPIRED', 'This local dev audit session expired after the server restarted. Start a new audit.');
  }
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const auditId = requestedAuditId;
    const session = await getAuditSession(supabase, auditId);
    let targetRole: Record<string, unknown> | null = null;
    let competencyModel: Record<string, unknown> | null = null;

    if (session.target_role_id) {
      const role = await loadRole(supabase, session.target_role_id);
      if (role) {
        const skills = await loadRoleSkills(supabase, [session.target_role_id]);
        targetRole = mapRole(role, skills);
      }
      competencyModel = await loadCompetencyModel(supabase, session.target_role_id);
    }

    const messages = await loadAuditMessages(supabase, auditId);
    const rawSignals = await supabase
      .from('audit_skill_signals')
      .select('id,skill_slug,skill_name,extracted_level,confidence_score,evidence_strength,source,created_at')
      .eq('session_id', auditId)
      .order('created_at', { ascending: true });

    const coreCompetencies = (competencyModel?.core_competencies || []) as Array<Record<string, unknown>>;
    const signals = (rawSignals.data || []) as Array<Record<string, unknown>>;

    const evidenceCoverage = coreCompetencies.map((comp) => {
      const skillName = String(comp.skillName || comp.skill_name || '');
      const skillSignals = signals.filter(
        (s) => String(s.skill_name).toLowerCase() === skillName.toLowerCase()
      );
      const strongestSignal = skillSignals[skillSignals.length - 1];
      const strength = (strongestSignal?.evidence_strength as string) || 'None';
      let status = 'Insufficient Evidence';
      if (strength === 'Strong') status = 'Strong Evidence';
      else if (strength === 'Moderate') status = 'Moderate Evidence';
      else if (strength === 'Weak') status = 'Weak Evidence';

      return {
        skillId: String(comp.skillId || comp.skill_id || skillName),
        skillName,
        category: String(comp.category || 'Core'),
        expectedScore: Number(comp.expectedScore || comp.expected_score || 70),
        evidenceStrength: strength,
        evidenceStatus: status,
        confidenceScore: strongestSignal ? Number(strongestSignal.confidence_score || 0) : 0,
        observationsCount: skillSignals.length,
      };
    });

    return res.json({
      auditId: session.id,
      studentId: session.user_id,
      targetRoleId: session.target_role_id,
      status: session.status,
      targetRole,
      messages: messages.map((m) => ({
        id: m.id,
        sender: m.actor,
        text: m.content,
        timestamp: new Date(m.occurred_at || Date.now()).getTime(),
        inputMode: m.input_mode,
      })),
      evidenceCoverage,
    });
  } catch (error) {
    return handleRouteError(res, error, 'audit_session_get');
  }
});

app.post('/api/audit/session', async (req, res) => {
  try {
    const studentId = requiredString(req.body?.studentId, 'studentId');
    const targetRoleId = requiredString(req.body?.targetRoleId, 'targetRoleId');
    const context = isRecord(req.body?.context) ? req.body.context : {};
    if (!UUID_RE.test(targetRoleId)) return apiError(res, 400, 'INVALID_REQUEST', 'targetRoleId must be a UUID.');
    if (!UUID_RE.test(studentId)) {
      const idempotencyKey = optionalString(req.body?.idempotencyKey);
      const existing = idempotencyKey
        ? [...devAuditSessions.values()].find((session) => session.user_id === studentId && session.context.idempotencyKey === idempotencyKey)
        : undefined;
      const session = existing || {
        id: `dev_audit_${randomUUID()}`,
        user_id: studentId,
        target_role_id: targetRoleId,
        status: 'created',
        context: { ...context, idempotencyKey },
        messages: [],
      };
      devAuditSessions.set(session.id, session);
      return res.status(201).json({
        success: true,
        auditId: session.id,
        studentId: session.user_id,
        targetRoleId: session.target_role_id,
        status: session.status,
        devMode: true,
      });
    }

    const supabase = await requireDatabase(res);
    if (!supabase) return;
    const role = await supabase.from('career_roles').select('id').eq('id', targetRoleId).eq('status', 'published').maybeSingle();
    if (role.error) throw new PersistenceError('audit_session_role_read', role.error.message);
    if (!role.data) return apiError(res, 404, 'TARGET_ROLE_NOT_FOUND', 'Selected target role is not published.');
    const session = await createOrResumeAuditSession(supabase, {
      studentId,
      targetRoleId,
      idempotencyKey: optionalString(req.body?.idempotencyKey),
      context,
    });
    return res.status(201).json({
      success: true,
      auditId: session.id,
      studentId: session.user_id,
      targetRoleId: session.target_role_id,
      status: session.status,
    });
  } catch (error) {
    return handleRouteError(res, error, 'audit_session_create');
  }
});

app.post('/api/qalam/chat', async (req, res) => {
  try {
    const auditId = requiredString(req.body?.auditId, 'auditId');
    const userText = requiredString(req.body?.userText, 'userText');
    const inputMethod = requiredString(req.body?.inputMethod, 'inputMethod');
    const clientMessageId = requiredString(req.body?.clientMessageId, 'clientMessageId');
    const targetRole = requiredString(req.body?.targetRole, 'targetRole');
    const targetRoleId = requiredString(req.body?.targetRoleId, 'targetRoleId');
    const currentStage = requiredString(req.body?.currentStage, 'currentStage');
    const nextQuestion = optionalString(req.body?.nextQuestion) || '';

    const devSession = devAuditSessions.get(auditId);
    if (devSession) {
      const sourceMessageId = `dev_msg_${randomUUID()}`;
      const qalamMessageId = `dev_msg_${randomUUID()}`;
      devSession.messages.push({
        id: sourceMessageId,
        actor: 'user',
        content: userText,
        occurred_at: new Date().toISOString(),
        input_mode: inputMethod,
      });
      const qalamText = nextQuestion || `Good. I captured that evidence for ${targetRole}. Tell me one more concrete example.`;
      devSession.messages.push({
        id: qalamMessageId,
        actor: 'assistant',
        content: qalamText,
        occurred_at: new Date().toISOString(),
        input_mode: 'system',
      });
      devSession.status = 'in_progress';
      return res.json({
        success: true,
        sourceMessageId,
        qalamMessageId,
        qalamText,
        qalamState: 'CURIOUS',
        evidenceStrength: userText.length > 80 ? 'Moderate' : 'Weak',
        needsFollowUp: false,
        followUpQuestion: '',
        nextAction: 'continue',
        extractedSkills: [
          {
            skillName: targetRole.includes('HVAC') ? 'Heat Load Calculations' : 'Domain Fundamentals',
            extractedLevel: userText.length > 80 ? 'Intermediate' : 'Beginner',
            confidenceScore: userText.length > 80 ? 65 : 40,
            evidenceStrength: userText.length > 80 ? 'Moderate' : 'Weak',
          },
        ],
        devMode: true,
      });
    }

    const supabase = await requireDatabase(res);
    if (!supabase) return;
    const session = await getAuditSession(supabase, auditId);
    const userMessage = await persistAuditMessage(supabase, {
      auditId,
      studentId: session.user_id,
      actor: 'user',
      content: userText,
      inputMode: inputMethod as 'voice' | 'text' | 'tap' | 'system',
      clientMessageId,
      metadata: { stage: currentStage, targetRole },
    });

    const aiPrompt = `Target Career Role: "${targetRole}".
Current Audit Stage: "${currentStage}".
Recommended Next Stage Question: "${nextQuestion}".
Student Answer: "${userText}".

Evaluate this answer. Return JSON strictly complying with the schema.`;

    const aiResponse = await generateStructuredJson({
      model: serverConfig.geminiChatModel,
      prompt: aiPrompt,
      systemInstruction: `You are Qalam, Pathwisse CareerVoice.
Conduct a strict, professional career readiness audit.
Evaluate if the candidate provided concrete evidence of applied software, tools, libraries, or architecture.
If the answer is vague or lacks concrete evidence, set evidenceStrength to Weak or None, and needsFollowUp to true.
Speak in 1-2 conversational sentences.`,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          qalamText: { type: Type.STRING },
          qalamState: { type: Type.STRING },
          evidenceStrength: { type: Type.STRING },
          needsFollowUp: { type: Type.BOOLEAN },
          followUpQuestion: { type: Type.STRING },
          nextAction: { type: Type.STRING },
          extractedSkills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                skillName: { type: Type.STRING },
                extractedLevel: { type: Type.STRING },
                confidenceScore: { type: Type.NUMBER },
                evidenceStrength: { type: Type.STRING },
              },
              required: ['skillName', 'extractedLevel', 'confidenceScore', 'evidenceStrength'],
            },
          },
        },
        required: ['qalamText', 'qalamState', 'evidenceStrength', 'needsFollowUp', 'followUpQuestion', 'nextAction', 'extractedSkills'],
      },
      validate: (value: any) => value,
    });

    const evidenceUpdate = await supabase
      .from('audit_evidence')
      .update({ primary_signal_id: null })
      .eq('session_id', auditId)
      .eq('source_message_id', userMessage.id);
    if (evidenceUpdate.error) throw new PersistenceError('chat_evidence_update', evidenceUpdate.error.message);

    const qalamMessage = await persistAuditMessage(supabase, {
      auditId,
      studentId: session.user_id,
      actor: 'assistant',
      content: aiResponse.qalamText,
      inputMode: 'system',
      clientMessageId: `${clientMessageId}:qalam`,
      metadata: { stage: currentStage, needsFollowUp: aiResponse.needsFollowUp },
    });
    await updateAuditSession(supabase, auditId, { status: 'in_progress', current_question_key: currentStage });

    return res.json({ success: true, sourceMessageId: userMessage.id, qalamMessageId: qalamMessage.id, ...aiResponse });
  } catch (error) {
    return handleRouteError(res, error, 'qalam_chat');
  }
});

function verifyServiceToken(providedHeader: string | undefined, expectedToken: string | undefined): boolean {
  if (!expectedToken) return true; // development mode if unconfigured
  if (!providedHeader || !providedHeader.startsWith('Bearer ')) return false;
  const provided = providedHeader.slice(7).trim();
  if (!provided) return false;
  const h1 = crypto.createHash('sha256').update(expectedToken).digest();
  const h2 = crypto.createHash('sha256').update(provided).digest();
  return crypto.timingSafeEqual(h1, h2);
}

app.post('/api/audit/evidence/signal', async (req, res) => {
  try {
    const serviceToken = serverConfig.careervoiceServiceToken || process.env.CAREERVOICE_SERVICE_TOKEN;
    if (serviceToken) {
      const authHeader = req.headers.authorization;
      if (!verifyServiceToken(authHeader, serviceToken)) {
        return apiError(res, 401, 'UNAUTHORIZED', 'Invalid or missing Bearer service token.');
      }
    }

    const signal = parseSkillSignalInput(req.body);
    if (signal.auditId.startsWith('dev_audit_') && devAuditSessions.has(signal.auditId)) {
      return res.status(201).json({
        success: true,
        signalId: `dev_signal_${randomUUID()}`,
        evidenceId: `dev_evidence_${randomUUID()}`,
        devMode: true,
      });
    }
    const supabase = await requireDatabase(res);
    if (!supabase) return;
    const persisted = await persistSkillSignal(supabase, signal);
    return res.status(201).json({ success: true, ...persisted });
  } catch (error) {
    if (error instanceof PersistenceError && error.operation === 'skill_signal_authorization') {
      return apiError(res, 403, 'FORBIDDEN', error.message);
    }
    if (error instanceof PersistenceError && error.operation === 'audit_session_read') {
      return apiError(res, 404, 'AUDIT_NOT_FOUND', error.message);
    }
    if (error instanceof Error && !(error instanceof PersistenceError)) {
      return apiError(res, 400, 'INVALID_SIGNAL_CONTRACT', error.message);
    }
    return handleRouteError(res, error, 'evidence_signal');
  }
});

app.post('/api/audit/:auditId/evidence', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const auditId = requiredString(req.params.auditId, 'auditId');
    const session = await getAuditSession(supabase, auditId);
    const evidenceType = requiredString(req.body?.evidenceType, 'evidenceType');
    const rawText = requiredString(req.body?.rawText, 'rawText');
    const source = requiredString(req.body?.source, 'source');
    if (!['resume', 'project', 'github', 'document'].includes(source)) return apiError(res, 400, 'INVALID_REQUEST', 'Evidence source is invalid.');
    const evidenceId = await persistTextEvidence(supabase, {
      auditId,
      studentId: session.user_id,
      evidenceType,
      rawText,
      source: source as 'resume' | 'project' | 'github' | 'document',
      metadata: isRecord(req.body?.metadata) ? req.body.metadata : {},
    });
    return res.status(201).json({ success: true, evidenceId });
  } catch (error) {
    return handleRouteError(res, error, 'audit_evidence');
  }
});

app.post('/api/audit/:auditId/finalize', async (req, res) => {
  try {
    const auditId = requiredString(req.params.auditId, 'auditId');
    const devSession = devAuditSessions.get(auditId);
    if (devSession) {
      devSession.status = 'completed';
      const targetRole = await resolveGuidanceRole(devSession.target_role_id, String(devSession.context.branch || 'Engineering'));
      const roleTitle = targetRole.title || String(devSession.context.targetRole || 'Career Specialist');
      const keySkill = targetRole.keySkills[0] || 'Domain Fundamentals';
      return res.json({
        success: true,
        auditId,
        targetRoleId: devSession.target_role_id,
        targetRole: roleTitle,
        overallScore: 58,
        readinessStatus: 'Developing',
        hiringBenchmark: 75,
        distanceFromBenchmark: 17,
        dimensionScores: {
          careerClarity: 68,
          technicalReadiness: 55,
          projectReadiness: 50,
          communication: 62,
          placementReadiness: 54,
          executionReadiness: 60,
        },
        diagnosisSummary: `Local dev evaluation completed for ${roleTitle}. This deterministic report is for testing the frontend flow because Gemini is not configured locally.`,
        whyRoleFits: [
          `${roleTitle} matches the selected career direction.`,
          `The audit captured initial evidence around ${keySkill}.`,
          'More project-level proof is needed before marking the student placement-ready.',
        ],
        strengths: [
          {
            skillId: 'dev_strength_1',
            skillName: keySkill,
            demonstratedScore: 60,
            evidence: 'Student provided conversational evidence during the dev audit.',
            confidenceScore: 65,
            whyItMatters: `${keySkill} is a core competency for ${roleTitle}.`,
          },
        ],
        gaps: [
          {
            gapId: 'dev_gap_1',
            skillId: 'dev_skill_1',
            skillName: targetRole.keySkills[1] || 'Project Evidence',
            expectedScore: 75,
            demonstratedScore: 45,
            gap: 30,
            priorityWeight: 80,
            weightedGap: 24,
            priority: 'High',
            evidenceIds: [],
            signalIds: [],
            evidenceBasis: 'No persisted project artifact was uploaded in this local dev audit.',
            recommendedAction: 'Add one role-specific project with screenshots, calculations, design files, or implementation notes.',
            mappingStatus: 'UNMAPPED',
            recommendedStageIds: [],
          },
        ],
        evidenceLedger: [
          {
            skillId: 'dev_skill_1',
            skillName: keySkill,
            observedEvidence: devSession.messages.filter((m) => m.actor === 'user').map((m) => m.content).slice(0, 3),
            missingEvidence: ['Project files', 'Internship proof', 'Tool-specific screenshots or calculations'],
            weakEvidence: [],
            contradictoryEvidence: [],
          },
        ],
        priorityRecommendations: [
          {
            recommendationId: 'dev_rec_1',
            gapId: 'dev_gap_1',
            rank: 1,
            recommendedAction: `Build and document one ${roleTitle} mini-project focused on ${keySkill}.`,
            reason: 'This converts conversational interest into verifiable placement evidence.',
            mappingStatus: 'UNMAPPED',
            recommendedStageIds: [],
          },
        ],
        diagnosticConclusions: [
          {
            id: 'dev_conclusion_1',
            skillName: keySkill,
            studentAnswerSnippet: devSession.messages.find((m) => m.actor === 'user')?.content || 'No answer captured.',
            evidenceVerified: 'Initial answer captured in local dev session.',
            evidenceStrength: 'Moderate',
            score: 60,
            confidenceScore: 65,
            confidenceLevel: 'Medium',
            gapSeverity: 'ORANGE',
            gapDescription: 'Evidence is directionally relevant but needs stronger project proof.',
            recommendedAction: `Prepare a role-specific artifact for ${roleTitle}.`,
          },
        ],
        devMode: true,
      });
    }

    const supabase = await requireDatabase(res);
    if (!supabase) return;
    if (!serverConfig.geminiConfigured) return apiError(res, 503, 'AI_UNAVAILABLE', 'Career audit AI is temporarily unavailable.');
    const report = await finalizeCareerAudit(supabase, auditId);
    return res.json(report);
  } catch (error) {
    return handleRouteError(res, error, 'audit_finalize');
  }
});

app.post('/api/qalam/evaluate', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    if (!serverConfig.geminiConfigured) return apiError(res, 503, 'AI_UNAVAILABLE', 'Career audit AI is temporarily unavailable.');
    const auditId = requiredString(req.body?.auditId, 'auditId');
    const report = await finalizeCareerAudit(supabase, auditId);
    return res.json(report);
  } catch (error) {
    if (error instanceof Error && /auditId is required/.test(error.message)) return apiError(res, 400, 'AUDIT_ID_REQUIRED', error.message);
    return handleRouteError(res, error, 'qalam_evaluate');
  }
});

app.get('/api/audit/:auditId/report', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const report = await getPersistedReport(supabase, requiredString(req.params.auditId, 'auditId'));
    if (!report) return apiError(res, 404, 'REPORT_NOT_FOUND', 'Career audit report has not been finalized.');
    return res.json(report);
  } catch (error) {
    return handleRouteError(res, error, 'audit_report');
  }
});

app.get('/api/audit/:auditId/roadmap-handoff', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const handoff = await getPersistedHandoff(supabase, requiredString(req.params.auditId, 'auditId'));
    if (!handoff) return apiError(res, 404, 'HANDOFF_NOT_FOUND', 'Career audit roadmap handoff has not been generated.');
    return res.json({ success: true, ...handoff });
  } catch (error) {
    return handleRouteError(res, error, 'audit_handoff');
  }
});

app.get('/api/pricing', async (_req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  const result = await supabase.from('pricing_plans').select('*').eq('is_active', true);
  if (result.error) return apiError(res, 500, 'PRICING_READ_FAILED', 'Pricing could not be loaded.');
  return res.json((result.data || []).map((plan) => ({
    id: plan.id,
    planName: plan.plan_name,
    priceInr: plan.price_inr,
    originalPriceInr: plan.original_price_inr,
    badge: plan.badge,
    highlight: plan.highlight,
    features: plan.features,
    ctaText: plan.cta_text,
  })));
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());

app.post('/api/analytics/track', async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    // In local dev without Supabase, acknowledge analytics without throwing 503
    return res.json({ success: true, mode: 'local_noop' });
  }
  try {
    const eventName = requiredString(req.body?.eventName, 'eventName');
    const auditId = optionalString(req.body?.auditId);
    const studentId = optionalString(req.body?.studentId);
    const result = await supabase.from('analytics_events').insert({
      id: randomUUID(),
      user_id: studentId && UUID_RE.test(studentId) ? studentId : null,
      audit_session_id: auditId && UUID_RE.test(auditId) ? auditId : null,
      event_name: eventName,
      event_time: new Date().toISOString(),
      source: 'pathwisse_qalam',
      properties: {
        anonymousId: req.body?.anonymousId || null,
        sessionId: req.body?.sessionId || null,
        auditId: auditId || null,
        screenName: req.body?.screenName || null,
        careerRole: req.body?.careerRole || null,
        collegeId: req.body?.collegeId || null,
        campaignId: req.body?.campaignId || null,
        referralCode: req.body?.referralCode || null,
        metadata: isRecord(req.body?.metadata) ? req.body.metadata : {},
      },
    });
    if (result.error) {
      console.warn('Analytics logging notice:', result.error.message);
      return res.json({ success: true, mode: 'fallback' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.warn('Analytics tracking error caught:', error instanceof Error ? error.message : error);
    return res.json({ success: true, mode: 'fallback' });
  }
});

app.get('/api/supabase/status', async (_req, res) => {
  const supabase = getSupabase();
  if (!supabase) return res.json({ configured: false, connected: false, message: 'Supabase server configuration is missing.' });
  try {
    const tableChecks = await Promise.all([
      supabase.from('colleges').select('id', { count: 'exact', head: true }),
      supabase.from('career_roles').select('id', { count: 'exact', head: true }),
      supabase.from('role_competencies').select('id', { count: 'exact', head: true }),
      supabase.from('audit_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('audit_skill_scores').select('id', { count: 'exact', head: true }),
      supabase.from('audit_skill_gaps').select('id', { count: 'exact', head: true }),
    ]);
    const tableNames = ['colleges', 'career_roles', 'role_competencies', 'audit_sessions', 'audit_skill_scores', 'audit_skill_gaps'];
    const checks = tableChecks.map((check, index) => ({
      table: tableNames[index],
      reachable: !check.error,
      error: check.error?.message,
    }));
    const publicCatalogConnected = checks.slice(0, 3).every((check) => check.reachable);
    const privilegedAuditConnected = checks.slice(3).every((check) => check.reachable);
    return res.json({
      configured: true,
      connected: publicCatalogConnected,
      privilegedAuditConnected,
      message: privilegedAuditConnected
        ? 'CareerVoice canonical audit schema is reachable.'
        : 'Supabase public catalog is reachable. Privileged audit checks require a real SUPABASE_SERVICE_ROLE_KEY.',
      checks,
    });
  } catch (error) {
    return res.json({ configured: true, connected: false, message: error instanceof Error ? error.message : String(error) });
  }
});

async function startServer() {
  const modelValidation = await validateConfiguredGeminiModels();
  console.log('career_voice_startup_health', {
    geminiConfigured: serverConfig.geminiConfigured,
    supabaseConfigured: serverConfig.supabaseConfigured,
    evaluationEngine: 'gemini-http',
    voiceEngine: serverConfig.publicHealth.voiceEngine,
    geminiLiveExperimental: serverConfig.enableGeminiLive,
    modelValidation,
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Pathwisse CareerVoice server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('career_voice_startup_failed', { message: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
});
