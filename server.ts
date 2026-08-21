import express from 'express';
import http from 'http';
import path from 'path';
import { randomUUID } from 'crypto';
import { createServer as createViteServer } from 'vite';
import { getSupabase } from './src/lib/supabase';
import { parseSkillSignalInput } from './src/domain/careerAudit';
import { serverConfig } from './src/server/config';
import {
  AiResponseValidationError,
  AiUnavailableError,
  getGeminiModelHealth,
  validateConfiguredGeminiModels,
} from './src/server/gemini';
import {
  createOrResumeAuditSession,
  getAuditSession,
  loadAuditMessages,
  loadCareerDiscoveryProfile,
  loadCompetencyModel,
  loadRoleRecommendations,
  loadRoleSkills,
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
  getDiscoveryState,
  processDiscoveryTurn,
} from './src/server/careerDiscovery';
import {
  confirmTargetRole,
  getPublishedRoleCatalog,
  getRoleExplanationForAudit,
  recommendRolesForAudit,
} from './src/server/roleDiscovery';
import {
  getEvidenceCoverage,
  getNextAdaptiveProbe,
  processAdaptiveTurn,
} from './src/server/adaptiveAudit';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const httpServer = http.createServer(app);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

app.use(express.json({ limit: '10mb' }));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${field} is required`);
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeInputMethod(value: unknown): 'voice' | 'text' | 'tap' {
  const input = requiredString(value, 'inputMethod');
  if (input === 'type') return 'text';
  if (input === 'voice' || input === 'text' || input === 'tap') return input;
  throw new Error('inputMethod is invalid');
}

function apiError(res: express.Response, status: number, code: string, message: string, details?: unknown) {
  return res.status(status).json({ success: false, code, message, ...(details === undefined ? {} : { details }) });
}

function handleRouteError(res: express.Response, error: unknown, operation: string) {
  if (error instanceof AiUnavailableError) {
    return apiError(res, 503, 'AI_UNAVAILABLE', 'CareerVoice AI is temporarily unavailable. Persisted answers can be retried.');
  }
  if (error instanceof AiResponseValidationError) {
    return apiError(res, 502, 'AI_RESPONSE_INVALID', error.message);
  }
  if (error instanceof AuditFinalizationError) {
    return apiError(res, error.status, error.code, error.message, error.details);
  }
  if (error instanceof PersistenceError) {
    const notFound = /not found/i.test(error.message);
    return apiError(
      res,
      notFound ? 404 : 500,
      error.code,
      notFound ? error.message : 'CareerVoice data could not be persisted.',
      { operation: error.operation }
    );
  }
  console.error('career_voice_route_error', {
    operation,
    message: error instanceof Error ? error.message : String(error),
  });
  const message = error instanceof Error ? error.message : 'CareerVoice could not complete this request.';
  const clientError = /required|invalid|must be|not published|must be selected|must be completed/i.test(message);
  return apiError(res, clientError ? 400 : 500, clientError ? 'INVALID_REQUEST' : 'INTERNAL_ERROR', message);
}

async function requireDatabase(res: express.Response) {
  const supabase = getSupabase();
  if (!supabase) {
    apiError(res, 503, 'DATABASE_UNAVAILABLE', 'CareerVoice database is temporarily unavailable.');
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

async function resolveStreamDatabaseId(supabase: NonNullable<ReturnType<typeof getSupabase>>, streamIdOrCode?: string) {
  if (!streamIdOrCode) return null;
  if (UUID_RE.test(streamIdOrCode)) return streamIdOrCode;
  const result = await supabase
    .from('career_streams')
    .select('id')
    .eq('code', streamIdOrCode)
    .eq('status', 'published')
    .maybeSingle();
  if (result.error) throw new PersistenceError('career_stream_lookup', result.error.message);
  return result.data?.id || null;
}

app.get('/api/health', async (_req, res) => {
  res.json({
    ...serverConfig.publicHealth,
    architecture: 'career-voice-adaptive-evidence:v2',
    stateAuthority: 'audit_sessions',
    scoringAuthority: 'backend-deterministic',
    modelValidation: getGeminiModelHealth(),
  });
});

app.post('/api/auth/otp/request', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const phone = requiredString(req.body?.phone, 'phone');
    const result = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
    if (result.error) return apiError(res, 400, 'OTP_REQUEST_FAILED', result.error.message);
    return res.json({ success: true, phone });
  } catch (error) {
    return handleRouteError(res, error, 'otp_request');
  }
});

app.post('/api/auth/otp/verify', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const phone = requiredString(req.body?.phone, 'phone');
    const token = requiredString(req.body?.token, 'token');
    if (!/^\d{6}$/.test(token)) return apiError(res, 400, 'INVALID_OTP', 'Enter the 6-digit verification code.');
    const result = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (result.error || !result.data.user) {
      return apiError(res, 401, 'OTP_VERIFICATION_FAILED', result.error?.message || 'OTP could not be verified.');
    }
    return res.json({ success: true, studentId: result.data.user.id, phone: result.data.user.phone || phone });
  } catch (error) {
    return handleRouteError(res, error, 'otp_verify');
  }
});

app.post('/api/profile/sync', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const studentId = requiredString(req.body?.studentId, 'studentId');
    if (!UUID_RE.test(studentId)) return apiError(res, 400, 'INVALID_REQUEST', 'studentId must be a UUID.');
    let collegeId: string | null = null;
    const collegeName = optionalString(req.body?.collegeName);
    if (collegeName) {
      const college = await supabase.from('colleges').select('id').ilike('name', collegeName).limit(1).maybeSingle();
      if (college.error) throw new PersistenceError('profile_college_lookup', college.error.message);
      collegeId = college.data?.id || null;
    }
    const profileResult = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: studentId,
          full_name: optionalString(req.body?.firstName) || null,
          college_id: collegeId,
          department: optionalString(req.body?.branch) || null,
          academic_year: normalizedAcademicYear(req.body?.gradYear),
          target_role_id: optionalString(req.body?.targetRoleId) || null,
          onboarding_completed_at: req.body?.branch && req.body?.gradYear ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('id,user_id')
      .single();
    if (profileResult.error || !profileResult.data) {
      throw new PersistenceError('profile_upsert', profileResult.error?.message || 'Profile could not be saved.');
    }
    return res.json({ success: true, profileId: profileResult.data.id, studentId: profileResult.data.user_id });
  } catch (error) {
    return handleRouteError(res, error, 'profile_sync');
  }
});

app.post('/api/supabase/profile/sync', async (req, res) => {
  req.url = '/api/profile/sync';
  app._router?.handle(req, res, () => undefined);
});

app.get('/api/streams', async (_req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  const result = await supabase
    .from('career_streams')
    .select('id,code,title,description,icon_name,sort_order')
    .eq('status', 'published')
    .order('sort_order', { ascending: true });
  if (result.error) return apiError(res, 500, 'CATALOG_READ_FAILED', 'Career streams could not be loaded.');
  return res.json(
    (result.data || []).map((stream) => ({
      id: stream.code,
      databaseId: stream.id,
      title: stream.title,
      description: stream.description,
      iconName: stream.icon_name,
    }))
  );
});

app.get('/api/roles', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const streamId = await resolveStreamDatabaseId(supabase, optionalString(req.query.streamId));
    return res.json(await getPublishedRoleCatalog(supabase, streamId));
  } catch (error) {
    return handleRouteError(res, error, 'roles_catalog');
  }
});

app.post('/api/discovery/session', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const studentId = requiredString(req.body?.studentId, 'studentId');
    const idempotencyKey = requiredString(req.body?.idempotencyKey, 'idempotencyKey');
    if (!UUID_RE.test(studentId)) return apiError(res, 400, 'INVALID_REQUEST', 'studentId must be a UUID.');
    const session = await createOrResumeAuditSession(supabase, {
      studentId,
      targetRoleId: null,
      idempotencyKey,
      applicationState: 'DISCOVERY',
      context: isRecord(req.body?.context) ? req.body.context : {},
    });
    return res.status(201).json({
      success: true,
      auditId: session.id,
      studentId: session.user_id,
      targetRoleId: session.target_role_id,
      status: session.status,
      applicationState: session.application_state,
    });
  } catch (error) {
    return handleRouteError(res, error, 'discovery_session_create');
  }
});

app.get('/api/discovery/:auditId/state', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    return res.json({ success: true, ...(await getDiscoveryState(supabase, requiredString(req.params.auditId, 'auditId'))) });
  } catch (error) {
    return handleRouteError(res, error, 'discovery_state');
  }
});

app.post('/api/discovery/:auditId/message', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    if (!serverConfig.geminiConfigured) return apiError(res, 503, 'AI_UNAVAILABLE', 'CareerVoice AI is temporarily unavailable.');
    const result = await processDiscoveryTurn(supabase, {
      auditId: requiredString(req.params.auditId, 'auditId'),
      userText: requiredString(req.body?.userText, 'userText'),
      inputMethod: normalizeInputMethod(req.body?.inputMethod),
      clientMessageId: requiredString(req.body?.clientMessageId, 'clientMessageId'),
    });
    return res.json(result);
  } catch (error) {
    return handleRouteError(res, error, 'discovery_message');
  }
});

app.post('/api/roles/recommendations', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const auditId = requiredString(req.body?.auditId, 'auditId');
    const discovery = await getDiscoveryState(supabase, auditId);
    if (!discovery.complete) {
      return apiError(res, 409, 'DISCOVERY_INCOMPLETE', 'Conversational career discovery must be completed first.', {
        missingDimensions: discovery.missingDimensions,
      });
    }
    return res.json(await recommendRolesForAudit(supabase, auditId));
  } catch (error) {
    return handleRouteError(res, error, 'role_recommendations');
  }
});

app.get('/api/roles/:roleId/explanation', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const auditId = requiredString(req.query.auditId, 'auditId');
    const roleId = requiredString(req.params.roleId, 'roleId');
    return res.json({ success: true, ...(await getRoleExplanationForAudit(supabase, auditId, roleId)) });
  } catch (error) {
    return handleRouteError(res, error, 'role_explanation');
  }
});

app.post('/api/audit/:auditId/target-role', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    return res.json(
      await confirmTargetRole(
        supabase,
        requiredString(req.params.auditId, 'auditId'),
        requiredString(req.body?.targetRoleId, 'targetRoleId')
      )
    );
  } catch (error) {
    return handleRouteError(res, error, 'target_role_confirm');
  }
});

// Compatibility endpoint for direct targeted audits. New E2E should create the session at discovery time.
app.post('/api/audit/session', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const studentId = requiredString(req.body?.studentId, 'studentId');
    const targetRoleId = requiredString(req.body?.targetRoleId, 'targetRoleId');
    if (!UUID_RE.test(studentId) || !UUID_RE.test(targetRoleId)) {
      return apiError(res, 400, 'INVALID_REQUEST', 'studentId and targetRoleId must be UUIDs.');
    }
    const role = await supabase.from('career_roles').select('id').eq('id', targetRoleId).eq('status', 'published').maybeSingle();
    if (role.error) throw new PersistenceError('audit_session_role_read', role.error.message);
    if (!role.data) return apiError(res, 404, 'TARGET_ROLE_NOT_FOUND', 'Selected target role is not published.');
    const session = await createOrResumeAuditSession(supabase, {
      studentId,
      targetRoleId,
      idempotencyKey: optionalString(req.body?.idempotencyKey),
      context: isRecord(req.body?.context) ? req.body.context : {},
      applicationState: 'AUDIT_SETUP',
    });
    return res.status(201).json({
      success: true,
      auditId: session.id,
      studentId: session.user_id,
      targetRoleId: session.target_role_id,
      status: session.status,
      applicationState: session.application_state,
    });
  } catch (error) {
    return handleRouteError(res, error, 'audit_session_create');
  }
});

app.get('/api/catalog/competency/:roleId', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const roleId = requiredString(req.params.roleId, 'roleId');
    const [model, skills] = await Promise.all([
      loadCompetencyModel(supabase, roleId),
      loadRoleSkills(supabase, [roleId]),
    ]);
    if (!model || skills.length === 0) {
      return apiError(res, 404, 'COMPETENCY_MODEL_MISSING', 'This published role has no configured assessment model.');
    }
    return res.json({
      roleId,
      readinessBenchmark: Number(model.minimum_readiness_benchmark),
      roleSkills: skills.map((skill: Record<string, unknown>) => ({
        skillId: skill.id,
        skillSlug: skill.skill_slug,
        skillName: skill.skill_name,
        requiredLevel: skill.required_level,
        expectedReadiness: Number(skill.expected_readiness),
        weight: Number(skill.weight),
        minimumEvidenceThreshold: Number(skill.minimum_evidence_threshold),
        minimumEvidenceStrength: skill.minimum_evidence_strength,
        employabilityImportance: Number(skill.employability_importance),
        dependencyWeight: Number(skill.dependency_weight),
        evidenceRequirements: skill.evidence_requirements,
        evaluationRubric: skill.evaluation_rubric,
        probeGuidance: skill.probe_guidance,
      })),
    });
  } catch (error) {
    return handleRouteError(res, error, 'competency_catalog');
  }
});

app.get('/api/audit/:auditId/state', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const auditId = requiredString(req.params.auditId, 'auditId');
    const session = await getAuditSession(supabase, auditId);
    const [messages, discoveryProfile, recommendations, report] = await Promise.all([
      loadAuditMessages(supabase, auditId),
      loadCareerDiscoveryProfile(supabase, session.user_id),
      loadRoleRecommendations(supabase, auditId),
      getPersistedReport(supabase, auditId),
    ]);
    const evidenceState = session.target_role_id ? await getEvidenceCoverage(supabase, auditId) : null;
    return res.json({
      success: true,
      auditId,
      studentId: session.user_id,
      targetRoleId: session.target_role_id,
      status: session.status,
      applicationState: session.application_state,
      currentCompetencySkillId: session.current_competency_skill_id,
      context: session.context,
      discoveryProfile,
      recommendations,
      messages,
      evidenceCoverage: evidenceState?.coverage || [],
      interviewComplete: evidenceState?.complete || false,
      report,
    });
  } catch (error) {
    return handleRouteError(res, error, 'audit_state');
  }
});

app.get('/api/audit/:auditId/next-probe', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    if (!serverConfig.geminiConfigured) return apiError(res, 503, 'AI_UNAVAILABLE', 'CareerVoice AI is temporarily unavailable.');
    return res.json(await getNextAdaptiveProbe(supabase, requiredString(req.params.auditId, 'auditId')));
  } catch (error) {
    return handleRouteError(res, error, 'adaptive_next_probe');
  }
});

app.post('/api/qalam/chat', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    if (!serverConfig.geminiConfigured) return apiError(res, 503, 'AI_UNAVAILABLE', 'CareerVoice AI is temporarily unavailable.');
    return res.json(
      await processAdaptiveTurn(supabase, {
        auditId: requiredString(req.body?.auditId, 'auditId'),
        userText: requiredString(req.body?.userText, 'userText'),
        inputMethod: normalizeInputMethod(req.body?.inputMethod),
        clientMessageId: requiredString(req.body?.clientMessageId, 'clientMessageId'),
      })
    );
  } catch (error) {
    return handleRouteError(res, error, 'qalam_chat');
  }
});

// Compatibility write path. New adaptive chat persists evidence + signals atomically on the backend.
app.post('/api/audit/evidence/signal', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const persisted = await persistSkillSignal(supabase, parseSkillSignalInput(req.body));
    return res.status(201).json({ success: true, ...persisted });
  } catch (error) {
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
    if (!['resume', 'project', 'github', 'document'].includes(source)) {
      return apiError(res, 400, 'INVALID_REQUEST', 'Evidence source is invalid.');
    }
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
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    if (!serverConfig.geminiConfigured) return apiError(res, 503, 'AI_UNAVAILABLE', 'CareerVoice AI is temporarily unavailable.');
    return res.json(await finalizeCareerAudit(supabase, requiredString(req.params.auditId, 'auditId')));
  } catch (error) {
    return handleRouteError(res, error, 'audit_finalize');
  }
});

app.post('/api/qalam/evaluate', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    if (!serverConfig.geminiConfigured) return apiError(res, 503, 'AI_UNAVAILABLE', 'CareerVoice AI is temporarily unavailable.');
    return res.json(await finalizeCareerAudit(supabase, requiredString(req.body?.auditId, 'auditId')));
  } catch (error) {
    return handleRouteError(res, error, 'qalam_evaluate');
  }
});

app.get('/api/audit/:auditId/report', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const report = await getPersistedReport(supabase, requiredString(req.params.auditId, 'auditId'));
    if (!report) return apiError(res, 404, 'REPORT_NOT_FOUND', 'CareerVoice readiness report has not been finalized.');
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
    if (!handoff) return apiError(res, 404, 'HANDOFF_NOT_FOUND', 'Pathwisse handoff has not been generated.');
    return res.json({ success: true, ...handoff });
  } catch (error) {
    return handleRouteError(res, error, 'audit_handoff');
  }
});

app.get('/api/pathwisse/mapping-coverage', async (_req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const summary = await supabase.from('career_voice_mapping_coverage').select('*').single();
    if (summary.error) throw new PersistenceError('mapping_coverage_read', summary.error.message);
    const unmapped = await supabase
      .from('career_voice_pathwisse_mappings')
      .select('role_id,career_voice_skill_slug,career_voice_skill_name,pathwisse_skill_id,pathwisse_stage_ids,mapping_status')
      .or('mapping_status.eq.UNMAPPED,pathwisse_skill_id.is.null')
      .order('career_voice_skill_name', { ascending: true });
    if (unmapped.error) throw new PersistenceError('mapping_unmapped_read', unmapped.error.message);
    return res.json({ success: true, ...summary.data, unmappedSkills: unmapped.data || [] });
  } catch (error) {
    return handleRouteError(res, error, 'mapping_coverage');
  }
});

app.get('/api/pricing', async (_req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  const result = await supabase.from('pricing_plans').select('*').eq('is_active', true);
  if (result.error) return apiError(res, 500, 'PRICING_READ_FAILED', 'Pricing could not be loaded.');
  return res.json(
    (result.data || []).map((plan) => ({
      id: plan.id,
      planName: plan.plan_name,
      priceInr: plan.price_inr,
      originalPriceInr: plan.original_price_inr,
      badge: plan.badge,
      highlight: plan.highlight,
      features: plan.features,
      ctaText: plan.cta_text,
    }))
  );
});

app.post('/api/analytics/track', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
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
    if (result.error) throw new PersistenceError('analytics_event_insert', result.error.message);
    return res.json({ success: true });
  } catch (error) {
    return handleRouteError(res, error, 'analytics_track');
  }
});

app.get('/api/supabase/status', async (_req, res) => {
  const supabase = getSupabase();
  if (!supabase) return res.json({ configured: false, connected: false, message: 'Supabase server configuration is missing.' });
  try {
    const checks = await Promise.all([
      supabase.from('career_roles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('career_role_skills').select('id', { count: 'exact', head: true }),
      supabase.from('audit_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('audit_skill_scores').select('id', { count: 'exact', head: true }),
      supabase.from('career_voice_mapping_coverage').select('*').single(),
    ]);
    const failure = checks.find((check) => check.error)?.error;
    if (failure) return res.json({ configured: true, connected: false, message: failure.message });
    return res.json({ configured: true, connected: true, message: 'CareerVoice adaptive canonical schema is reachable.' });
  } catch (error) {
    return res.json({ configured: true, connected: false, message: error instanceof Error ? error.message : String(error) });
  }
});

async function startServer() {
  const modelValidation = await validateConfiguredGeminiModels();
  console.log('career_voice_startup_health', {
    geminiConfigured: serverConfig.geminiConfigured,
    supabaseConfigured: serverConfig.supabaseConfigured,
    architecture: 'career-voice-adaptive-evidence:v2',
    evaluationEngine: 'gemini-http',
    voiceEngine: 'browser-speech',
    modelValidation,
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
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
