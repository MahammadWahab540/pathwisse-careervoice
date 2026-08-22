import express from 'express';
import http from 'http';
import path from 'path';
import { randomUUID } from 'crypto';
import { Modality, Type, type LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { getSupabase, requireSupabase } from './src/lib/supabase';
import {
  calculateRoleFit,
  parseSkillSignalInput,
  type EvidenceStrength,
} from './src/domain/careerAudit';
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

const app = express();
const PORT = Number(process.env.PORT || 5000);
app.use(express.json({ limit: '10mb' }));

const httpServer = http.createServer(app);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

// Gemini Live is deliberately experimental and does not participate in audit scoring.
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
          systemInstruction:
            'You are Qalam, Pathwisse CareerVoice. This is an experimental voice transport only. Never calculate or persist career readiness scores.',
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
          const payload = JSON.parse(rawMessage.toString()) as { audio?: string; text?: string };
          if (payload.audio) session.sendRealtimeInput({ audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' } });
          else if (payload.text) session.sendRealtimeInput({ text: payload.text });
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

app.post('/api/auth/otp/request', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const phone = requiredString(req.body?.phone, 'phone');
    const result = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true } });
    if (result.error) return apiError(res, 400, 'OTP_REQUEST_FAILED', result.error.message);
    return res.json({ success: true, phone });
  } catch (error) {
    if (error instanceof Error && /required/.test(error.message)) return apiError(res, 400, 'INVALID_REQUEST', error.message);
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
    if (result.error || !result.data.user) return apiError(res, 401, 'OTP_VERIFICATION_FAILED', result.error?.message || 'OTP could not be verified.');
    return res.json({ success: true, studentId: result.data.user.id, phone: result.data.user.phone || phone });
  } catch (error) {
    if (error instanceof Error && /required/.test(error.message)) return apiError(res, 400, 'INVALID_REQUEST', error.message);
    return handleRouteError(res, error, 'otp_verify');
  }
});

app.post('/api/profile/sync', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const studentId = requiredString(req.body?.studentId, 'studentId');
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
          career_intent: optionalString(req.body?.careerIntent) || null,
          target_role_id: optionalString(req.body?.targetRoleId) || null,
          onboarding_completed_at: req.body?.careerIntent ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('id,user_id')
      .single();
    if (profileResult.error || !profileResult.data) throw new PersistenceError('profile_upsert', profileResult.error?.message || 'Profile could not be saved.');
    return res.json({ success: true, profileId: profileResult.data.id, studentId: profileResult.data.user_id });
  } catch (error) {
    return handleRouteError(res, error, 'profile_sync');
  }
});

// Backward-safe alias while frontend migrates to the canonical endpoint.
app.post('/api/supabase/profile/sync', async (req, res, next) => {
  req.url = '/api/profile/sync';
  next();
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
  return res.json((result.data || []).map((stream) => ({ id: stream.code, databaseId: stream.id, title: stream.title, description: stream.description, iconName: stream.icon_name })));
});

async function getPublishedRoles(streamIdOrCode?: string) {
  const supabase = requireSupabase();
  const databaseStreamId = await resolveStreamDatabaseId(streamIdOrCode);
  let query = supabase
    .from('career_roles')
    .select('id,stream_id,slug,title,category,description,demand_level,status,fit_reason,match_type')
    .eq('status', 'published');
  if (databaseStreamId) query = query.eq('stream_id', databaseStreamId);
  const roleResult = await query;
  if (roleResult.error) throw new PersistenceError('career_roles_read', roleResult.error.message);
  const roles = (roleResult.data || []) as Array<Record<string, unknown>>;
  const skills = (await loadRoleSkills(supabase, roles.map((role) => String(role.id)))) as Array<Record<string, unknown>>;
  return roles.map((role) => mapRole(role, skills));
}

app.get('/api/roles', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const roles = await getPublishedRoles(optionalString(req.query.streamId));
    return res.json(roles);
  } catch (error) {
    return handleRouteError(res, error, 'roles_catalog');
  }
});

app.get('/api/roles/:roleId', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const roleId = requiredString(req.params.roleId, 'roleId');
    const role = await loadRole(supabase, roleId);
    if (!role) return apiError(res, 404, 'ROLE_NOT_FOUND', 'Career role was not found.');
    const skills = await loadRoleSkills(supabase, [roleId]);
    return res.json(mapRole(role, skills));
  } catch (error) {
    return handleRouteError(res, error, 'role_detail');
  }
});

app.post('/api/roles/recommendations', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const roles = await getPublishedRoles(optionalString(req.body?.careerStreamId));
    const careerIntent = optionalString(req.body?.careerIntent) || '';
    const branch = optionalString(req.body?.branch) || '';
    const knownSkills = Array.isArray(req.body?.knownSkills) ? req.body.knownSkills.filter((item: unknown): item is string => typeof item === 'string') : [];
    const scored = roles
      .map((role) => ({
        ...role,
        ...calculateRoleFit(
          { careerIntent, branch, knownSkills },
          { roleId: role.id, title: String(role.title), category: String(role.category || ''), keySkills: role.keySkills }
        ),
      }))
      .sort((a, b) => b.matchScore - a.matchScore || String(a.title).localeCompare(String(b.title)));
    return res.json(scored);
  } catch (error) {
    return handleRouteError(res, error, 'role_recommendations');
  }
});

app.get('/api/catalog/competency/:roleId', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const roleId = requiredString(req.params.roleId, 'roleId');
    const model = await loadCompetencyModel(supabase, roleId);
    if (!model || !Array.isArray(model.core_competencies) || model.core_competencies.length === 0) {
      return apiError(res, 404, 'COMPETENCY_MODEL_MISSING', 'This published role does not have a configured competency model.');
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
    return handleRouteError(res, error, 'competency_catalog');
  }
});

app.get('/api/audit/:auditId/session', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const auditId = requiredString(req.params.auditId, 'auditId');
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
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const studentId = requiredString(req.body?.studentId, 'studentId');
    const targetRoleId = requiredString(req.body?.targetRoleId, 'targetRoleId');
    if (!UUID_RE.test(studentId) || !UUID_RE.test(targetRoleId)) return apiError(res, 400, 'INVALID_REQUEST', 'studentId and targetRoleId must be UUIDs.');
    const role = await supabase.from('career_roles').select('id').eq('id', targetRoleId).eq('status', 'published').maybeSingle();
    if (role.error) throw new PersistenceError('audit_session_role_read', role.error.message);
    if (!role.data) return apiError(res, 404, 'TARGET_ROLE_NOT_FOUND', 'Selected target role is not published.');
    const session = await createOrResumeAuditSession(supabase, {
      studentId,
      targetRoleId,
      idempotencyKey: optionalString(req.body?.idempotencyKey),
      context: isRecord(req.body?.context) ? req.body.context : {},
    });
    return res.status(201).json({ success: true, auditId: session.id, studentId: session.user_id, targetRoleId: session.target_role_id, status: session.status });
  } catch (error) {
    return handleRouteError(res, error, 'audit_session_create');
  }
});

interface ChatAiResponse {
  qalamText: string;
  qalamState: string;
  evidenceStrength: EvidenceStrength;
  needsFollowUp: boolean;
  followUpQuestion: string;
  extractedSkills: Array<{ skillName: string; extractedLevel: string; confidenceScore: number; evidenceStrength: EvidenceStrength }>;
}

function validateChatAiResponse(value: unknown, allowedSkills: Set<string>): ChatAiResponse {
  if (!isRecord(value)) throw new Error('Qalam response must be an object');
  const qalamText = requiredString(value.qalamText, 'qalamText');
  const qalamState = requiredString(value.qalamState, 'qalamState');
  const evidenceStrength = requiredString(value.evidenceStrength, 'evidenceStrength') as EvidenceStrength;
  if (!['Strong', 'Moderate', 'Weak', 'None'].includes(evidenceStrength)) throw new Error('evidenceStrength is invalid');
  if (typeof value.needsFollowUp !== 'boolean') throw new Error('needsFollowUp is required');
  const followUpQuestion = typeof value.followUpQuestion === 'string' ? value.followUpQuestion.trim() : '';
  if (!Array.isArray(value.extractedSkills)) throw new Error('extractedSkills must be an array');
  const extractedSkills = value.extractedSkills.map((item, index) => {
    if (!isRecord(item)) throw new Error(`extractedSkills[${index}] is invalid`);
    const skillName = requiredString(item.skillName, `extractedSkills[${index}].skillName`);
    if (!allowedSkills.has(skillName)) throw new Error(`Unknown extracted skill ${skillName}`);
    const extractedLevel = requiredString(item.extractedLevel, `extractedSkills[${index}].extractedLevel`);
    const confidenceScore = Number(item.confidenceScore);
    if (!Number.isFinite(confidenceScore) || confidenceScore < 0 || confidenceScore > 100) throw new Error('confidenceScore is invalid');
    const skillStrength = requiredString(item.evidenceStrength, `extractedSkills[${index}].evidenceStrength`) as EvidenceStrength;
    if (!['Strong', 'Moderate', 'Weak', 'None'].includes(skillStrength)) throw new Error('skill evidenceStrength is invalid');
    return { skillName, extractedLevel, confidenceScore, evidenceStrength: skillStrength };
  });
  return { qalamText, qalamState, evidenceStrength, needsFollowUp: value.needsFollowUp, followUpQuestion, extractedSkills };
}

app.post('/api/qalam/chat', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    if (!serverConfig.geminiConfigured) return apiError(res, 503, 'AI_UNAVAILABLE', 'Career audit AI is temporarily unavailable.');
    const auditId = requiredString(req.body?.auditId, 'auditId');
    const userText = requiredString(req.body?.userText, 'userText');
    const inputMethod = requiredString(req.body?.inputMethod, 'inputMethod');
    if (!['voice', 'type', 'tap'].includes(inputMethod)) return apiError(res, 400, 'INVALID_REQUEST', 'inputMethod is invalid.');
    const clientMessageId = requiredString(req.body?.clientMessageId, 'clientMessageId');
    const targetRoleId = requiredString(req.body?.targetRoleId, 'targetRoleId');
    const targetRole = requiredString(req.body?.targetRole, 'targetRole');
    const currentStage = requiredString(req.body?.currentStage, 'currentStage');
    const session = await getAuditSession(supabase, auditId);
    if (session.target_role_id !== targetRoleId) return apiError(res, 409, 'AUDIT_ROLE_MISMATCH', 'Target role does not match the audit session.');

    const userMessage = await persistAuditMessage(supabase, {
      auditId,
      studentId: session.user_id,
      actor: 'user',
      content: userText,
      inputMode: inputMethod as 'voice' | 'text' | 'tap',
      clientMessageId,
      metadata: { stage: currentStage },
    });

    const existingEvidence = await supabase.from('audit_evidence').select('id').eq('source_message_id', userMessage.id).eq('evidence_type', 'student_answer').maybeSingle();
    if (existingEvidence.error) throw new PersistenceError('chat_evidence_lookup', existingEvidence.error.message);
    if (!existingEvidence.data) {
      const evidenceInsert = await supabase.from('audit_evidence').insert({
        session_id: auditId,
        user_id: session.user_id,
        evidence_type: 'student_answer',
        storage_path: null,
        source_message_id: userMessage.id,
        raw_text: userText,
        source: inputMethod === 'voice' ? 'voice_probe' : 'typed_probe',
        status: 'uploaded',
        metadata: { stage: currentStage },
      });
      if (evidenceInsert.error) throw new PersistenceError('chat_evidence_insert', evidenceInsert.error.message);
    }

    const model = await loadCompetencyModel(supabase, targetRoleId);
    if (!model || !Array.isArray(model.core_competencies) || model.core_competencies.length === 0) {
      return apiError(res, 409, 'COMPETENCY_MODEL_MISSING', 'Target role has no competency model.');
    }
    const skills = model.core_competencies.map((item: Record<string, unknown>) => String(item.skillName));
    const allowedSkills = new Set(skills);

    const aiResponse = await generateStructuredJson<ChatAiResponse>({
      model: serverConfig.geminiChatModel,
      systemInstruction: `You are Qalam, Pathwisse's rigorous Career Auditor for ${targetRole}. Your job is to verify claims through concrete evidence, not to encourage vague answers. The only role competencies you may extract are: ${skills.join(', ')}. If the student says only "I know X" or makes an unsupported claim, mark evidence Weak or None and ask one concise question for proof such as what they built, what they personally implemented, libraries used, deployment, trade-offs, bugs, or measurable outcome. Do not calculate readiness scores.`,
      prompt: `Audit stage: ${currentStage}\nStudent context: ${JSON.stringify(isRecord(req.body?.studentContext) ? req.body.studentContext : {})}\nStudent answer: ${JSON.stringify(userText)}\nClassify only this answer and respond concisely.`,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          qalamText: { type: Type.STRING },
          qalamState: { type: Type.STRING },
          evidenceStrength: { type: Type.STRING },
          needsFollowUp: { type: Type.BOOLEAN },
          followUpQuestion: { type: Type.STRING },
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
        required: ['qalamText', 'qalamState', 'evidenceStrength', 'needsFollowUp', 'followUpQuestion', 'extractedSkills'],
      },
      validate: (value) => validateChatAiResponse(value, allowedSkills),
    });

    const evidenceUpdate = await supabase
      .from('audit_evidence')
      .update({ evidence_strength: aiResponse.evidenceStrength, status: 'verified' })
      .eq('source_message_id', userMessage.id)
      .eq('evidence_type', 'student_answer');
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

app.post('/api/audit/evidence/signal', async (req, res) => {
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    const signal = parseSkillSignalInput(req.body);
    const persisted = await persistSkillSignal(supabase, signal);
    return res.status(201).json({ success: true, ...persisted });
  } catch (error) {
    if (error instanceof Error && !(error instanceof PersistenceError)) return apiError(res, 400, 'INVALID_SIGNAL_CONTRACT', error.message);
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
  const supabase = await requireDatabase(res);
  if (!supabase) return;
  try {
    if (!serverConfig.geminiConfigured) return apiError(res, 503, 'AI_UNAVAILABLE', 'Career audit AI is temporarily unavailable.');
    const report = await finalizeCareerAudit(supabase, requiredString(req.params.auditId, 'auditId'));
    return res.json(report);
  } catch (error) {
    return handleRouteError(res, error, 'audit_finalize');
  }
});

// Compatibility endpoint. Scores still come exclusively from deterministic finalization.
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
      supabase.from('career_roles').select('id', { count: 'exact', head: true }),
      supabase.from('role_competencies').select('id', { count: 'exact', head: true }),
      supabase.from('audit_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('audit_skill_scores').select('id', { count: 'exact', head: true }),
      supabase.from('audit_skill_gaps').select('id', { count: 'exact', head: true }),
    ]);
    const failure = checks.find((check) => check.error)?.error;
    if (failure) return res.json({ configured: true, connected: false, message: failure.message });
    return res.json({ configured: true, connected: true, message: 'CareerVoice canonical audit schema is reachable.' });
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
    voiceEngine: 'browser-speech',
    geminiLiveExperimental: serverConfig.enableGeminiLive,
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
