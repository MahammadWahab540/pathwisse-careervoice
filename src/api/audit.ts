import { api, authenticatedFetch, ApiClientError } from './client';
import type {
  AuditSessionDto,
  QalamChatResponseDto,
  SkillEvidenceDto,
} from '../types/audit';
import type { CareerAuditReportDto } from '../types/report';

export interface CreateAuditSessionInput {
  studentId: string;
  targetRoleId: string;
  idempotencyKey?: string;
  context?: Record<string, unknown>;
}

export interface SendQalamChatInput {
  auditId: string;
  userText: string;
  inputMethod: 'voice' | 'type' | 'tap';
  clientMessageId: string;
  studentContext?: Record<string, unknown>;
  targetRoleId: string;
  targetRole: string;
  currentStage: string;
  nextQuestion?: string;
  stateVersion?: number;
  action?: 'ANSWER' | 'SKIP';
  explicitSkip?: boolean;
}

export interface SubmitSkillSignalInput {
  auditId: string;
  studentId: string;
  phone?: string;
  skillName: string;
  extractedLevel: string;
  confidenceScore: number;
  evidenceStrength: 'Strong' | 'Moderate' | 'Weak' | 'None';
  rawAnswerSnippet: string;
  source: 'voice_probe' | 'typed_probe' | 'resume' | 'project' | 'github' | 'document';
  sourceMessageId?: string;
  idempotencyKey?: string;
  claimedLevel?: string;
}

export interface UploadTextEvidenceInput {
  auditId: string;
  evidenceType: string;
  rawText: string;
  source: 'resume' | 'project' | 'github' | 'document';
  metadata?: Record<string, unknown>;
}

export async function createAuditSession(input: CreateAuditSessionInput): Promise<{
  success: true;
  auditId: string;
  studentId: string;
  targetRoleId: string;
  status: string;
}> {
  return api.post('/api/audit/session', input);
}

export async function getAuditSession(auditId: string): Promise<AuditSessionDto> {
  return api.get<AuditSessionDto>(`/api/audit/${encodeURIComponent(auditId)}/session`);
}

export async function sendQalamChat(input: SendQalamChatInput): Promise<QalamChatResponseDto> {
  return api.post<QalamChatResponseDto>('/api/ai/chat', input);
}

export async function submitSkillSignal(input: SubmitSkillSignalInput): Promise<{
  success: true;
  signalId: string | null;
  evidenceId: string;
}> {
  const response = await authenticatedFetch('/api/audit/evidence/signal', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const message = data?.message || data?.error || response.statusText || 'Failed to submit skill signal';
    const code = data?.code || (response.status === 401 ? 'UNAUTHORIZED' : 'REQUEST_FAILED');
    throw new ApiClientError(message, response.status, code, data?.details);
  }

  return data;
}

export async function uploadTextEvidence(input: UploadTextEvidenceInput): Promise<{
  success: true;
  evidenceId: string;
}> {
  return api.post(`/api/audit/${encodeURIComponent(input.auditId)}/evidence`, {
    evidenceType: input.evidenceType,
    rawText: input.rawText,
    source: input.source,
    metadata: input.metadata,
  });
}

export async function finalizeAudit(auditId: string): Promise<CareerAuditReportDto> {
  return api.post<CareerAuditReportDto>(`/api/audit/${encodeURIComponent(auditId)}/finalize`);
}
