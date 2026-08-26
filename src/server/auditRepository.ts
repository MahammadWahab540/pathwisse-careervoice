import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import type { SkillSignalInput } from '../domain/careerAudit';

export class PersistenceError extends Error {
  readonly code = 'PERSISTENCE_FAILED';
  readonly operation: string;

  constructor(operation: string, message: string) {
    super(message);
    this.name = 'PersistenceError';
    this.operation = operation;
  }
}

function fail(operation: string, error: { message?: string } | null | undefined): never {
  const message = error?.message || 'Unknown Supabase persistence error';
  console.error('career_voice_persistence_error', { operation, message });
  throw new PersistenceError(operation, message);
}

export interface AuditSessionRow {
  id: string;
  user_id: string;
  target_role_id: string | null;
  status: string;
  context: Record<string, unknown>;
  attempt_id?: string | null;
  current_stage?: string | null;
  current_competency_id?: string | null;
  current_question_id?: string | null;
  follow_up_count?: number | null;
  progress?: Record<string, unknown> | null;
  state_version?: number | null;
}

export async function createOrResumeAuditSession(
  supabase: SupabaseClient,
  input: {
    studentId: string;
    targetRoleId: string;
    idempotencyKey?: string;
    context?: Record<string, unknown>;
  }
): Promise<AuditSessionRow> {
  if (input.idempotencyKey) {
    const existing = await supabase
      .from('audit_sessions')
      .select('id,user_id,target_role_id,status,context,attempt_id,current_stage,current_competency_id,current_question_id,follow_up_count,progress,state_version')
      .eq('user_id', input.studentId)
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle();
    if (existing.error) fail('audit_session_lookup', existing.error);
    if (existing.data) return existing.data as AuditSessionRow;
  }

  const inserted = await supabase
    .from('audit_sessions')
    .insert({
      user_id: input.studentId,
      target_role_id: input.targetRoleId,
      status: 'created',
      current_step: 0,
      attempt_id: randomUUID(),
      current_stage: null,
      current_competency_id: null,
      current_question_id: null,
      follow_up_count: 0,
      progress: { completed: 0, total: 0, percentage: 0 },
      state_version: 0,
      idempotency_key: input.idempotencyKey || null,
      context: input.context || {},
      started_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .select('id,user_id,target_role_id,status,context,attempt_id,current_stage,current_competency_id,current_question_id,follow_up_count,progress,state_version')
    .single();

  if (inserted.error || !inserted.data) fail('audit_session_insert', inserted.error);
  return inserted.data as AuditSessionRow;
}

export async function getAuditSession(supabase: SupabaseClient, auditId: string): Promise<AuditSessionRow> {
  const result = await supabase
    .from('audit_sessions')
    .select('id,user_id,target_role_id,status,context,attempt_id,current_stage,current_competency_id,current_question_id,follow_up_count,progress,state_version')
    .eq('id', auditId)
    .maybeSingle();
  if (result.error) fail('audit_session_read', result.error);
  if (!result.data) throw new PersistenceError('audit_session_read', 'Audit session was not found.');
  return result.data as AuditSessionRow;
}

export async function updateAuditSession(
  supabase: SupabaseClient,
  auditId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const result = await supabase
    .from('audit_sessions')
    .update({ ...patch, updated_at: new Date().toISOString(), last_activity_at: new Date().toISOString() })
    .eq('id', auditId);
  if (result.error) fail('audit_session_update', result.error);
}

export async function persistAuditMessage(
  supabase: SupabaseClient,
  input: {
    auditId: string;
    studentId: string;
    actor: 'user' | 'assistant' | 'system';
    content: string;
    inputMode: 'voice' | 'text' | 'tap' | 'system';
    clientMessageId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ id: string; sequenceNo: number }> {
  if (input.clientMessageId) {
    const existing = await supabase
      .from('audit_messages')
      .select('id,sequence_no')
      .eq('session_id', input.auditId)
      .eq('client_message_id', input.clientMessageId)
      .maybeSingle();
    if (existing.error) fail('audit_message_idempotency_lookup', existing.error);
    if (existing.data) {
      return { id: existing.data.id as string, sequenceNo: Number(existing.data.sequence_no) };
    }
  }

  const latest = await supabase
    .from('audit_messages')
    .select('sequence_no')
    .eq('session_id', input.auditId)
    .order('sequence_no', { ascending: false })
    .limit(1);
  if (latest.error) fail('audit_message_sequence_read', latest.error);
  const sequenceNo = Number(latest.data?.[0]?.sequence_no || 0) + 1;

  const inserted = await supabase
    .from('audit_messages')
    .insert({
      session_id: input.auditId,
      user_id: input.studentId,
      sequence_no: sequenceNo,
      actor: input.actor,
      content: input.content,
      input_mode: input.inputMode,
      client_message_id: input.clientMessageId || null,
      metadata: input.metadata || {},
      occurred_at: new Date().toISOString(),
    })
    .select('id,sequence_no')
    .single();
  if (inserted.error || !inserted.data) fail('audit_message_insert', inserted.error);
  return { id: inserted.data.id as string, sequenceNo: Number(inserted.data.sequence_no) };
}

function toSkillSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function persistSkillSignal(
  supabase: SupabaseClient,
  input: SkillSignalInput
): Promise<{ signalId: string | null; evidenceId: string }> {
  const session = await getAuditSession(supabase, input.auditId);
  if (input.studentId && input.studentId !== session.user_id) {
    throw new PersistenceError('skill_signal_authorization', 'studentId does not match the audit session.');
  }

  if (input.idempotencyKey) {
    const existing = await supabase
      .from('audit_skill_signals')
      .select('id,evidence_id')
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle();
    if (existing.error) fail('skill_signal_idempotency_lookup', existing.error);
    if (existing.data?.evidence_id) {
      return { signalId: existing.data.id as string, evidenceId: existing.data.evidence_id as string };
    }

    const existingEvidence = await supabase
      .from('audit_evidence')
      .select('id')
      .eq('session_id', input.auditId)
      .contains('metadata', { idempotencyKey: input.idempotencyKey })
      .maybeSingle();
    if (existingEvidence.data?.id) {
      return { signalId: null, evidenceId: existingEvidence.data.id as string };
    }
  }

  const isDemonstrated = input.evidenceStrength === 'Strong' || input.evidenceStrength === 'Moderate';

  const evidenceInsert = await supabase
    .from('audit_evidence')
    .insert({
      session_id: input.auditId,
      user_id: session.user_id,
      evidence_type: 'student_answer',
      storage_path: null,
      source_message_id: input.sourceMessageId || null,
      raw_text: input.rawAnswerSnippet,
      evidence_strength: input.evidenceStrength,
      source: input.source,
      claimed_level: input.claimedLevel || null,
      status: isDemonstrated ? 'verified' : 'insufficient',
      metadata: {
        skillName: input.skillName,
        contractVersion: 'career-audit:v1',
        idempotencyKey: input.idempotencyKey || null,
      },
    })
    .select('id')
    .single();
  if (evidenceInsert.error || !evidenceInsert.data) fail('audit_evidence_insert', evidenceInsert.error);
  const evidenceId = evidenceInsert.data.id as string;

  // Weak or None evidence must NEVER create a demonstrated skill signal row
  if (!isDemonstrated) {
    await updateAuditSession(supabase, input.auditId, { status: 'in_progress' });
    return { signalId: null, evidenceId };
  }

  const signalInsert = await supabase
    .from('audit_skill_signals')
    .insert({
      session_id: input.auditId,
      user_id: session.user_id,
      role_id: session.target_role_id,
      skill_slug: toSkillSlug(input.skillName),
      skill_name: input.skillName,
      level: input.extractedLevel,
      score: null,
      confidence: input.confidenceScore / 100,
      source_message_id: input.sourceMessageId || null,
      idempotency_key: input.idempotencyKey || null,
      evidence_summary: input.rawAnswerSnippet,
      evidence_id: evidenceId,
      claimed_level: input.claimedLevel || null,
      extracted_level: input.extractedLevel,
      confidence_score: input.confidenceScore,
      evidence_strength: input.evidenceStrength,
      raw_answer_snippet: input.rawAnswerSnippet,
      source: input.source,
      contract_version: 'career-audit:v1',
      metadata: {},
    })
    .select('id')
    .single();

  if (signalInsert.error || !signalInsert.data) {
    const cleanup = await supabase.from('audit_evidence').delete().eq('id', evidenceId);
    if (cleanup.error) {
      console.error('career_voice_persistence_cleanup_error', {
        operation: 'audit_evidence_cleanup_after_signal_failure',
        evidenceId,
        message: cleanup.error.message,
      });
    }
    fail('audit_skill_signal_insert', signalInsert.error);
  }

  await updateAuditSession(supabase, input.auditId, { status: 'in_progress' });
  return { signalId: signalInsert.data.id as string, evidenceId };
}

export async function persistTextEvidence(
  supabase: SupabaseClient,
  input: {
    auditId: string;
    studentId: string;
    evidenceType: string;
    rawText: string;
    source: 'resume' | 'project' | 'github' | 'document';
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  const inserted = await supabase
    .from('audit_evidence')
    .insert({
      session_id: input.auditId,
      user_id: input.studentId,
      evidence_type: input.evidenceType,
      storage_path: null,
      raw_text: input.rawText,
      source: input.source,
      status: 'uploaded',
      metadata: input.metadata || {},
    })
    .select('id')
    .single();
  if (inserted.error || !inserted.data) fail('audit_text_evidence_insert', inserted.error);
  return inserted.data.id as string;
}

export async function loadAuditEvidence(supabase: SupabaseClient, auditId: string) {
  const result = await supabase
    .from('audit_evidence')
    .select('id,source_message_id,evidence_type,raw_text,evidence_strength,source,claimed_level,status,metadata,created_at')
    .eq('session_id', auditId)
    .order('created_at', { ascending: true });
  if (result.error) fail('audit_evidence_read', result.error);
  return result.data || [];
}

export async function loadAuditMessages(supabase: SupabaseClient, auditId: string) {
  const result = await supabase
    .from('audit_messages')
    .select('id,sequence_no,actor,content,input_mode,metadata,occurred_at')
    .eq('session_id', auditId)
    .order('sequence_no', { ascending: true });
  if (result.error) fail('audit_messages_read', result.error);
  return result.data || [];
}

export async function loadAuditSignals(supabase: SupabaseClient, auditId: string) {
  const result = await supabase
    .from('audit_skill_signals')
    .select('id,evidence_id,skill_slug,skill_name,claimed_level,extracted_level,confidence_score,evidence_strength,raw_answer_snippet,source,source_message_id,created_at')
    .eq('session_id', auditId)
    .eq('contract_version', 'career-audit:v1')
    .order('created_at', { ascending: true });
  if (result.error) fail('audit_skill_signals_read', result.error);
  return result.data || [];
}

export async function loadCompetencyModel(supabase: SupabaseClient, roleId: string) {
  const result = await supabase
    .from('role_competencies')
    .select('role_id,minimum_readiness_benchmark,clarity_weight,technical_weight,project_weight,communication_weight,placement_weight,execution_weight,core_competencies')
    .eq('role_id', roleId)
    .maybeSingle();
  if (result.error) fail('role_competency_read', result.error);
  return result.data;
}

export async function loadRole(supabase: SupabaseClient, roleId: string) {
  const result = await supabase
    .from('career_roles')
    .select('id,stream_id,slug,title,category,description,demand_level,status,fit_reason,match_type')
    .eq('id', roleId)
    .eq('status', 'published')
    .maybeSingle();
  if (result.error) fail('career_role_read', result.error);
  return result.data;
}

export async function loadRoleSkills(supabase: SupabaseClient, roleIds: string[]) {
  if (roleIds.length === 0) return [];
  const result = await supabase
    .from('career_role_skills')
    .select('id,role_id,skill_slug,skill_name,required_level,weight,sort_order')
    .in('role_id', roleIds)
    .order('sort_order', { ascending: true });
  if (result.error) fail('career_role_skills_read', result.error);
  return result.data || [];
}

export async function loadPathwisseMappings(supabase: SupabaseClient, roleId: string) {
  const result = await supabase
    .from('career_voice_pathwisse_mappings')
    .select('id,role_id,career_voice_skill_slug,career_voice_skill_name,pathwisse_skill_id,pathwisse_stage_ids,mapping_status')
    .eq('role_id', roleId);
  if (result.error) fail('pathwisse_mapping_read', result.error);
  return result.data || [];
}
