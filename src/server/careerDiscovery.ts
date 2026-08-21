import { Type } from '@google/genai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StudentCareerProfile } from '../domain/careerAudit';
import { serverConfig } from './config';
import { generateStructuredJson } from './gemini';
import {
  getAuditSession,
  loadAuditMessages,
  loadCareerDiscoveryProfile,
  persistAuditMessage,
  saveCareerDiscoveryProfile,
  updateAuditSession,
} from './auditRepository';

export const DISCOVERY_DIMENSIONS = [
  'education',
  'branch',
  'academicYear',
  'interests',
  'technicalSkills',
  'nontechnicalStrengths',
  'projects',
  'internships',
  'workExperience',
  'preferredWork',
  'enjoyedProblems',
  'analyticalInclination',
  'technicalInclination',
  'communicationInclination',
  'leadershipInclination',
  'careerAspirations',
] as const;

export type DiscoveryDimension = (typeof DISCOVERY_DIMENSIONS)[number];

const EMPTY_PROFILE: StudentCareerProfile = {
  education: '',
  branch: '',
  academicYear: '',
  interests: [],
  technicalSkills: [],
  nontechnicalStrengths: [],
  projects: [],
  internships: [],
  workExperience: [],
  preferredWork: '',
  enjoyedProblems: '',
  analyticalInclination: '',
  technicalInclination: '',
  communicationInclination: '',
  leadershipInclination: '',
  careerAspirations: '',
};

interface DiscoveryAiResponse {
  qalamText: string;
  answeredDimensions: DiscoveryDimension[];
  profilePatch: Partial<StudentCareerProfile>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
}

function validateDiscoveryResponse(value: unknown): DiscoveryAiResponse {
  if (!isRecord(value)) throw new Error('Discovery response must be an object.');
  const qalamText = stringValue(value.qalamText);
  if (!qalamText) throw new Error('Discovery qalamText is required.');
  if (!Array.isArray(value.answeredDimensions)) throw new Error('answeredDimensions must be an array.');
  const answeredDimensions = value.answeredDimensions
    .filter((item): item is string => typeof item === 'string')
    .filter((item): item is DiscoveryDimension => (DISCOVERY_DIMENSIONS as readonly string[]).includes(item));
  if (!isRecord(value.profilePatch)) throw new Error('profilePatch must be an object.');

  const patch: Partial<StudentCareerProfile> = {};
  const scalarFields: DiscoveryDimension[] = [
    'education',
    'branch',
    'academicYear',
    'preferredWork',
    'enjoyedProblems',
    'analyticalInclination',
    'technicalInclination',
    'communicationInclination',
    'leadershipInclination',
    'careerAspirations',
  ];
  const arrayFields: DiscoveryDimension[] = [
    'interests',
    'technicalSkills',
    'nontechnicalStrengths',
    'projects',
    'internships',
    'workExperience',
  ];

  for (const field of scalarFields) {
    const parsed = stringValue(value.profilePatch[field]);
    if (parsed !== undefined) (patch as Record<string, unknown>)[field] = parsed;
  }
  for (const field of arrayFields) {
    const parsed = stringArray(value.profilePatch[field]);
    if (parsed !== undefined) (patch as Record<string, unknown>)[field] = parsed;
  }

  return { qalamText, answeredDimensions, profilePatch: patch };
}

function mergeProfile(
  current: StudentCareerProfile | null,
  patch: Partial<StudentCareerProfile>
): StudentCareerProfile {
  return {
    ...EMPTY_PROFILE,
    ...(current || {}),
    ...patch,
    interests: patch.interests ?? current?.interests ?? [],
    technicalSkills: patch.technicalSkills ?? current?.technicalSkills ?? [],
    nontechnicalStrengths: patch.nontechnicalStrengths ?? current?.nontechnicalStrengths ?? [],
    projects: patch.projects ?? current?.projects ?? [],
    internships: patch.internships ?? current?.internships ?? [],
    workExperience: patch.workExperience ?? current?.workExperience ?? [],
  };
}

function answeredFromContext(context: Record<string, unknown>): Set<DiscoveryDimension> {
  const stored = Array.isArray(context.discoveryAnsweredDimensions)
    ? context.discoveryAnsweredDimensions.filter((item): item is string => typeof item === 'string')
    : [];
  return new Set(
    stored.filter((item): item is DiscoveryDimension => (DISCOVERY_DIMENSIONS as readonly string[]).includes(item))
  );
}

export function discoveryMissingDimensions(answered: Set<DiscoveryDimension>): DiscoveryDimension[] {
  return DISCOVERY_DIMENSIONS.filter((dimension) => !answered.has(dimension));
}

export async function getDiscoveryState(supabase: SupabaseClient, auditId: string) {
  const session = await getAuditSession(supabase, auditId);
  const [profile, messages] = await Promise.all([
    loadCareerDiscoveryProfile(supabase, session.user_id),
    loadAuditMessages(supabase, auditId),
  ]);
  const answered = answeredFromContext(session.context || {});
  const missingDimensions = discoveryMissingDimensions(answered);
  return {
    profile: profile || EMPTY_PROFILE,
    answeredDimensions: Array.from(answered),
    missingDimensions,
    complete: missingDimensions.length === 0,
    messages: messages.filter((message) => message.metadata?.phase === 'DISCOVERY'),
  };
}

export async function processDiscoveryTurn(
  supabase: SupabaseClient,
  input: {
    auditId: string;
    userText: string;
    inputMethod: 'voice' | 'text' | 'tap';
    clientMessageId: string;
  }
) {
  const session = await getAuditSession(supabase, input.auditId);
  const userMessage = await persistAuditMessage(supabase, {
    auditId: input.auditId,
    studentId: session.user_id,
    actor: 'user',
    content: input.userText,
    inputMode: input.inputMethod,
    clientMessageId: input.clientMessageId,
    metadata: { phase: 'DISCOVERY' },
  });

  const currentProfile = await loadCareerDiscoveryProfile(supabase, session.user_id);
  const answered = answeredFromContext(session.context || {});
  const missingBefore = discoveryMissingDimensions(answered);
  const messages = await loadAuditMessages(supabase, input.auditId);
  const discoveryHistory = messages
    .filter((message) => message.metadata?.phase === 'DISCOVERY')
    .slice(-12)
    .map((message) => ({ actor: message.actor, content: message.content }));

  const response = await generateStructuredJson<DiscoveryAiResponse>({
    model: serverConfig.geminiChatModel,
    systemInstruction:
      'You are Qalam, Pathwisse CareerVoice career discovery. Build an evidence-faithful student career profile through conversation. Extract only facts the student actually states. Do not invent projects, internships, experience, skills, strengths, preferences, aspirations, or inclination. A student explicitly saying they have no internship/project/work experience counts as answering that dimension and must be represented as an empty array. Ask one concise natural follow-up that covers the most important still-unanswered dimensions. Never recommend a role or calculate a fit/readiness score in this phase.',
    prompt: `Canonical student profile so far:\n${JSON.stringify(currentProfile || EMPTY_PROFILE)}\nAlready answered dimensions:\n${JSON.stringify(Array.from(answered))}\nStill missing before this turn:\n${JSON.stringify(missingBefore)}\nRecent discovery conversation:\n${JSON.stringify(discoveryHistory)}\nLatest student answer:\n${JSON.stringify(input.userText)}\nReturn a profilePatch containing only facts established by this answer, answeredDimensions for dimensions actually addressed, and qalamText for the next natural question. If this answer completes all remaining dimensions, qalamText should briefly confirm that discovery is complete without recommending a role.`,
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        qalamText: { type: Type.STRING },
        answeredDimensions: { type: Type.ARRAY, items: { type: Type.STRING } },
        profilePatch: {
          type: Type.OBJECT,
          properties: {
            education: { type: Type.STRING },
            branch: { type: Type.STRING },
            academicYear: { type: Type.STRING },
            interests: { type: Type.ARRAY, items: { type: Type.STRING } },
            technicalSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            nontechnicalStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            projects: { type: Type.ARRAY, items: { type: Type.STRING } },
            internships: { type: Type.ARRAY, items: { type: Type.STRING } },
            workExperience: { type: Type.ARRAY, items: { type: Type.STRING } },
            preferredWork: { type: Type.STRING },
            enjoyedProblems: { type: Type.STRING },
            analyticalInclination: { type: Type.STRING },
            technicalInclination: { type: Type.STRING },
            communicationInclination: { type: Type.STRING },
            leadershipInclination: { type: Type.STRING },
            careerAspirations: { type: Type.STRING },
          },
        },
      },
      required: ['qalamText', 'answeredDimensions', 'profilePatch'],
    },
    validate: validateDiscoveryResponse,
  });

  const nextProfile = mergeProfile(currentProfile, response.profilePatch);
  for (const dimension of response.answeredDimensions) answered.add(dimension);
  const missingDimensions = discoveryMissingDimensions(answered);
  const complete = missingDimensions.length === 0;

  await saveCareerDiscoveryProfile(supabase, session.user_id, nextProfile);
  const qalamMessage = await persistAuditMessage(supabase, {
    auditId: input.auditId,
    studentId: session.user_id,
    actor: 'assistant',
    content: response.qalamText,
    inputMode: 'system',
    clientMessageId: `${input.clientMessageId}:qalam`,
    metadata: { phase: 'DISCOVERY', complete, missingDimensions },
  });
  await updateAuditSession(supabase, input.auditId, {
    application_state: complete ? 'ROLE_RECOMMENDATIONS' : 'DISCOVERY',
    discovery_completed_at: complete ? new Date().toISOString() : null,
    context: {
      ...(session.context || {}),
      discoveryAnsweredDimensions: Array.from(answered),
      studentCareerProfile: nextProfile,
    },
  });

  return {
    success: true,
    sourceMessageId: userMessage.id,
    qalamMessageId: qalamMessage.id,
    qalamText: response.qalamText,
    profile: nextProfile,
    answeredDimensions: Array.from(answered),
    missingDimensions,
    complete,
  };
}
