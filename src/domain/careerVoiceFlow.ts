import type { UserIdentity } from '../types';

export type CareerVoiceStep =
  | 'BOOTSTRAPPING'
  | 'WELCOME'
  | 'PHONE_OTP'
  | 'ASK_NAME'
  | 'ASK_COLLEGE'
  | 'ASK_DEPARTMENT'
  | 'ASK_YEAR'
  | 'CAREER_DISCOVERY'
  | 'ROLE_DISCOVERY'
  | 'ROLE_EXPLANATION'
  | 'LOAD_COMPETENCY_MODEL'
  | 'CAREER_READINESS_AUDIT'
  | 'EVIDENCE_UPLOAD'
  | 'PROCESSING'
  | 'READINESS_REPORT'
  | 'GAP_REPORT'
  | 'ROADMAP';

export interface CareerVoiceCheckpoint {
  authenticated: boolean;
  identity: UserIdentity | null;
  onboardingCheckpoint: CareerVoiceStep;
  activeAuditId: string | null;
  updatedAt: string;
  flowGeneration: number;
}

export const FLOW_CHECKPOINT_KEY = 'careervoice_flow_checkpoint_v1';
export const STUDENT_ID_KEY = 'careervoice_student_id';
export const PHONE_KEY = 'careervoice_phone';
export const AUTH_ACCESS_TOKEN_KEY = 'careervoice_supabase_access_token';
export const ACTIVE_AUDIT_ID_KEY = 'careervoice_active_audit_id';

const VALID_STEPS = new Set<CareerVoiceStep>([
  'BOOTSTRAPPING',
  'WELCOME',
  'PHONE_OTP',
  'ASK_NAME',
  'ASK_COLLEGE',
  'ASK_DEPARTMENT',
  'ASK_YEAR',
  'CAREER_DISCOVERY',
  'ROLE_DISCOVERY',
  'ROLE_EXPLANATION',
  'LOAD_COMPETENCY_MODEL',
  'CAREER_READINESS_AUDIT',
  'EVIDENCE_UPLOAD',
  'PROCESSING',
  'READINESS_REPORT',
  'GAP_REPORT',
  'ROADMAP',
]);

export function isCareerVoiceStep(value: unknown): value is CareerVoiceStep {
  return typeof value === 'string' && VALID_STEPS.has(value as CareerVoiceStep);
}

export function logCareerVoiceEvent(eventName: string, metadata: Record<string, unknown> = {}) {
  if (typeof console !== 'undefined') {
    console.debug(eventName, { ...metadata, timestamp: new Date().toISOString() });
  }
}

export function buildVerifiedIdentity(
  studentId: string,
  phone: string,
  existing?: Partial<UserIdentity>
): UserIdentity {
  return {
    phone,
    countryCode: existing?.countryCode || '+91',
    isOtpVerified: true,
    studentId,
    accessToken: existing?.accessToken,
    anonymousId: existing?.anonymousId || crypto.randomUUID(),
    sessionId: existing?.sessionId || crypto.randomUUID(),
    referralCode: existing?.referralCode,
    campaignId: existing?.campaignId,
    collegeId: existing?.collegeId,
  };
}

export function readCareerVoiceCheckpoint(storage: Pick<Storage, 'getItem'>): CareerVoiceCheckpoint | null {
  const raw = storage.getItem(FLOW_CHECKPOINT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CareerVoiceCheckpoint>;
    if (!isCareerVoiceStep(parsed.onboardingCheckpoint)) return null;
    return {
      authenticated: Boolean(parsed.authenticated),
      identity: parsed.identity || null,
      onboardingCheckpoint: parsed.onboardingCheckpoint,
      activeAuditId: typeof parsed.activeAuditId === 'string' ? parsed.activeAuditId : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
      flowGeneration: Number(parsed.flowGeneration || 0),
    };
  } catch {
    return null;
  }
}

export function writeCareerVoiceCheckpoint(
  storage: Pick<Storage, 'setItem'>,
  checkpoint: CareerVoiceCheckpoint
) {
  storage.setItem(FLOW_CHECKPOINT_KEY, JSON.stringify(checkpoint));
  if (checkpoint.identity?.studentId) storage.setItem(STUDENT_ID_KEY, checkpoint.identity.studentId);
  if (checkpoint.identity?.phone) storage.setItem(PHONE_KEY, checkpoint.identity.phone);
  if (checkpoint.identity?.accessToken) storage.setItem(AUTH_ACCESS_TOKEN_KEY, checkpoint.identity.accessToken);
  if (checkpoint.activeAuditId) storage.setItem(ACTIVE_AUDIT_ID_KEY, checkpoint.activeAuditId);
}

export function clearCareerVoiceAuditId(
  storage: Pick<Storage, 'removeItem'>,
  currentUrl?: string
): string | null {
  storage.removeItem(ACTIVE_AUDIT_ID_KEY);
  if (!currentUrl) return null;
  const url = new URL(currentUrl);
  url.searchParams.delete('auditId');
  return url.toString();
}

export function resolveInitialCheckpoint(input: {
  checkpoint: CareerVoiceCheckpoint | null;
  storedStudentId?: string | null;
  storedPhone?: string | null;
  storedAuditId?: string | null;
  urlAuditId?: string | null;
  guestSessionId: string;
}): CareerVoiceCheckpoint {
  const activeAuditId = input.urlAuditId || input.storedAuditId || input.checkpoint?.activeAuditId || null;
  const identity =
    input.checkpoint?.identity ||
    (input.storedStudentId
      ? buildVerifiedIdentity(input.storedStudentId, input.storedPhone || '', {
          anonymousId: input.guestSessionId,
          sessionId: input.guestSessionId,
        })
      : null);

  const authenticated = Boolean(input.checkpoint?.authenticated || identity?.studentId);
  let onboardingCheckpoint: CareerVoiceStep = authenticated ? 'ASK_NAME' : 'WELCOME';
  if (authenticated && input.checkpoint?.onboardingCheckpoint && input.checkpoint.onboardingCheckpoint !== 'WELCOME' && input.checkpoint.onboardingCheckpoint !== 'PHONE_OTP') {
    onboardingCheckpoint = input.checkpoint.onboardingCheckpoint;
  }
  if (authenticated && activeAuditId && (!input.checkpoint || input.checkpoint.onboardingCheckpoint === 'WELCOME')) {
    onboardingCheckpoint = 'CAREER_READINESS_AUDIT';
  }

  return {
    authenticated,
    identity,
    onboardingCheckpoint,
    activeAuditId,
    updatedAt: new Date().toISOString(),
    flowGeneration: Number(input.checkpoint?.flowGeneration || 0),
  };
}
