import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  mergeDiscoveryAnswer,
  nextDiscoveryQuestion,
  type CareerDiscoveryProfile,
  type DiscoveryQuestion,
  type DiscoveryQuestionKey,
} from '../domain/careerDiscovery';

export type DiscoverySessionStatus = 'in_progress' | 'completed';

export interface DiscoverySessionRow {
  id: string;
  user_id: string;
  profile_id: string;
  status: DiscoverySessionStatus;
  current_question_key: DiscoveryQuestionKey | null;
  current_step: number;
  state_version: number;
  branch?: string | null;
  academic_year?: number | null;
  career_intent?: string | null;
  started_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface DiscoveryAnswerRow {
  id: string;
  discovery_session_id: string;
  user_id: string;
  question_key: DiscoveryQuestionKey;
  answer_text: string;
  input_mode: string;
  sequence_no: number;
  client_answer_id: string;
  created_at: string;
  updated_at: string;
}

export interface DiscoveryState {
  sessionId: string;
  status: DiscoverySessionStatus;
  currentQuestion: DiscoveryQuestion | null;
  nextQuestion?: DiscoveryQuestion | null;
  completedQuestionKeys: DiscoveryQuestionKey[];
  stateVersion: number;
  profile: CareerDiscoveryProfile;
  completed: boolean;
}

export interface DiscoveryAnswerResult extends DiscoveryState {
  accepted: true;
  completedQuestion: DiscoveryQuestionKey;
  nextQuestion: DiscoveryQuestion | null;
}

export class CareerDiscoveryStateError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly session?: DiscoveryState,
  ) {
    super(message);
    this.name = 'CareerDiscoveryStateError';
  }
}

export interface DiscoveryStateStore {
  findActiveSession(userId: string): Promise<DiscoverySessionRow | null>;
  createSession(input: {
    userId: string;
    profileId: string;
    branch?: string | null;
    academicYear?: number | null;
    careerIntent?: string | null;
    currentQuestionKey: DiscoveryQuestionKey | null;
  }): Promise<DiscoverySessionRow>;
  getSession(sessionId: string): Promise<DiscoverySessionRow | null>;
  listAnswers(sessionId: string): Promise<DiscoveryAnswerRow[]>;
  findAnswerByClientId(sessionId: string, clientAnswerId: string): Promise<DiscoveryAnswerRow | null>;
  insertAnswer(input: {
    sessionId: string;
    userId: string;
    questionKey: DiscoveryQuestionKey;
    answer: string;
    inputMode: string;
    sequenceNo: number;
    clientAnswerId: string;
  }): Promise<DiscoveryAnswerRow>;
  updateSessionProgress(input: {
    sessionId: string;
    expectedStateVersion: number;
    status: DiscoverySessionStatus;
    currentQuestionKey: DiscoveryQuestionKey | null;
    currentStep: number;
    nextStateVersion: number;
    completedAt?: string | null;
  }): Promise<DiscoverySessionRow | null>;
  insertTranscriptLog?(input: {
    userId: string;
    sessionId: string;
    questionKey: DiscoveryQuestionKey;
    answer: string;
    inputMode: string;
    sequenceNo: number;
    clientMessageId: string;
  }): Promise<void>;
}

function profileFromAnswers(answers: DiscoveryAnswerRow[]): CareerDiscoveryProfile {
  return answers
    .sort((a, b) => a.sequence_no - b.sequence_no)
    .reduce<CareerDiscoveryProfile>((profile, answer) => {
      return mergeDiscoveryAnswer(profile, answer.question_key, answer.answer_text, answer.created_at);
    }, {});
}

function completedQuestionKeys(answers: DiscoveryAnswerRow[]): DiscoveryQuestionKey[] {
  return answers
    .sort((a, b) => a.sequence_no - b.sequence_no)
    .map((answer) => answer.question_key);
}

function normalizeInputMode(value: string): 'voice' | 'text' | 'tap' | 'system' {
  if (value === 'voice' || value === 'tap' || value === 'system') return value;
  if (value === 'type' || value === 'typed' || value === 'text') return 'text';
  return 'text';
}

async function buildState(
  store: DiscoveryStateStore,
  session: DiscoverySessionRow,
): Promise<DiscoveryState> {
  const answers = await store.listAnswers(session.id);
  const profile = profileFromAnswers(answers);
  const question = nextDiscoveryQuestion(
    {
      branch: session.branch || undefined,
      academicYear: session.academic_year || undefined,
      careerIntent: session.career_intent || undefined,
      profile,
    },
    [],
  );
  const keys = completedQuestionKeys(answers);
  if (question && keys.includes(question.key)) {
    throw new CareerDiscoveryStateError(500, 'DISCOVERY_STATE_INVARIANT_VIOLATION', 'Next discovery question was already completed.');
  }
  return {
    sessionId: session.id,
    status: session.status,
    currentQuestion: session.status === 'completed' ? null : question,
    nextQuestion: session.status === 'completed' ? null : question,
    completedQuestionKeys: keys,
    stateVersion: session.state_version,
    profile: { ...profile, completed: session.status === 'completed' },
    completed: session.status === 'completed',
  };
}

export async function startOrResumeDiscoverySession(
  store: DiscoveryStateStore,
  input: {
    userId: string;
    profileId: string;
    branch?: string | null;
    academicYear?: number | null;
    careerIntent?: string | null;
  },
): Promise<DiscoveryState> {
  const existing = await store.findActiveSession(input.userId);
  if (existing) return buildState(store, existing);

  const firstQuestion = nextDiscoveryQuestion({
    branch: input.branch || undefined,
    academicYear: input.academicYear || undefined,
    careerIntent: input.careerIntent || undefined,
    profile: {},
  });
  const created = await store.createSession({
    ...input,
    currentQuestionKey: firstQuestion?.key || null,
  });
  return buildState(store, created);
}

export async function submitDiscoveryAnswer(
  store: DiscoveryStateStore,
  input: {
    userId: string;
    discoverySessionId: string;
    questionKey: DiscoveryQuestionKey;
    answer: string;
    clientMessageId: string;
    stateVersion: number;
    inputMode: string;
  },
): Promise<DiscoveryAnswerResult> {
  const session = await store.getSession(input.discoverySessionId);
  if (!session) throw new CareerDiscoveryStateError(404, 'SESSION_MISSING', 'Discovery session was not found.');
  if (session.user_id !== input.userId) {
    throw new CareerDiscoveryStateError(403, 'SESSION_FORBIDDEN', 'Discovery session belongs to another authenticated user.');
  }

  const duplicate = await store.findAnswerByClientId(session.id, input.clientMessageId);
  if (duplicate) {
    const current = await buildState(store, session);
    return {
      ...current,
      accepted: true,
      completedQuestion: duplicate.question_key,
      nextQuestion: current.currentQuestion,
    };
  }

  if (session.status !== 'in_progress') {
    throw new CareerDiscoveryStateError(409, 'DISCOVERY_SESSION_COMPLETED', 'Discovery session is already completed.', await buildState(store, session));
  }

  const before = await buildState(store, session);
  if (input.stateVersion !== session.state_version) {
    throw new CareerDiscoveryStateError(409, 'STALE_DISCOVERY_STATE', 'Discovery state is stale.', before);
  }
  if (before.currentQuestion?.key !== input.questionKey) {
    throw new CareerDiscoveryStateError(409, 'INVALID_DISCOVERY_QUESTION', 'Submitted question does not match the expected discovery question.', before);
  }

  const sequenceNo = before.completedQuestionKeys.length + 1;
  const answer = await store.insertAnswer({
    sessionId: session.id,
    userId: input.userId,
    questionKey: input.questionKey,
    answer: input.answer,
    inputMode: normalizeInputMode(input.inputMode),
    sequenceNo,
    clientAnswerId: input.clientMessageId,
  });

  await store.insertTranscriptLog?.({
    userId: input.userId,
    sessionId: session.id,
    questionKey: input.questionKey,
    answer: input.answer,
      inputMode: normalizeInputMode(input.inputMode),
    sequenceNo,
    clientMessageId: input.clientMessageId,
  });

  const afterAnswers = [...(await store.listAnswers(session.id)).filter((row) => row.id !== answer.id), answer];
  const afterProfile = profileFromAnswers(afterAnswers);
  const nextQuestion = nextDiscoveryQuestion({
    branch: session.branch || undefined,
    academicYear: session.academic_year || undefined,
    careerIntent: session.career_intent || undefined,
    profile: afterProfile,
  });
  const afterKeys = completedQuestionKeys(afterAnswers);
  if (nextQuestion && afterKeys.includes(nextQuestion.key)) {
    throw new CareerDiscoveryStateError(500, 'DISCOVERY_STATE_INVARIANT_VIOLATION', 'Next discovery question was already completed.');
  }

  const nextStateVersion = session.state_version + 1;
  const updated = await store.updateSessionProgress({
    sessionId: session.id,
    expectedStateVersion: session.state_version,
    status: nextQuestion ? 'in_progress' : 'completed',
    currentQuestionKey: nextQuestion?.key || null,
    currentStep: afterKeys.length,
    nextStateVersion,
    completedAt: nextQuestion ? null : new Date().toISOString(),
  });
  if (!updated) {
    throw new CareerDiscoveryStateError(409, 'STALE_DISCOVERY_STATE', 'Discovery state was advanced by another request.', before);
  }

  return {
    sessionId: updated.id,
    status: updated.status,
    currentQuestion: nextQuestion,
    nextQuestion,
    completedQuestionKeys: afterKeys,
    stateVersion: updated.state_version,
    profile: { ...afterProfile, completed: updated.status === 'completed' },
    completed: updated.status === 'completed',
    accepted: true,
    completedQuestion: input.questionKey,
  };
}

export function createInMemoryDiscoveryStore(): DiscoveryStateStore & {
  sessions: DiscoverySessionRow[];
  answers: DiscoveryAnswerRow[];
} {
  const store = {
    sessions: [] as DiscoverySessionRow[],
    answers: [] as DiscoveryAnswerRow[],
    async findActiveSession(userId: string) {
      return store.sessions.find((session) => session.user_id === userId && session.status === 'in_progress') || null;
    },
    async createSession(input: {
      userId: string;
      profileId: string;
      branch?: string | null;
      academicYear?: number | null;
      careerIntent?: string | null;
      currentQuestionKey: DiscoveryQuestionKey | null;
    }) {
      const now = new Date().toISOString();
      const session: DiscoverySessionRow = {
        id: randomUUID(),
        user_id: input.userId,
        profile_id: input.profileId,
        status: 'in_progress',
        current_question_key: input.currentQuestionKey,
        current_step: 0,
        state_version: 1,
        branch: input.branch || null,
        academic_year: input.academicYear || null,
        career_intent: input.careerIntent || null,
        started_at: now,
        updated_at: now,
        completed_at: null,
      };
      store.sessions.push(session);
      return session;
    },
    async getSession(sessionId: string) {
      return store.sessions.find((session) => session.id === sessionId) || null;
    },
    async listAnswers(sessionId: string) {
      return store.answers.filter((answer) => answer.discovery_session_id === sessionId);
    },
    async findAnswerByClientId(sessionId: string, clientAnswerId: string) {
      return store.answers.find((answer) => answer.discovery_session_id === sessionId && answer.client_answer_id === clientAnswerId) || null;
    },
    async insertAnswer(input: {
      sessionId: string;
      userId: string;
      questionKey: DiscoveryQuestionKey;
      answer: string;
      inputMode: string;
      sequenceNo: number;
      clientAnswerId: string;
    }) {
      const duplicate = store.answers.find((answer) => answer.discovery_session_id === input.sessionId && answer.client_answer_id === input.clientAnswerId);
      if (duplicate) return duplicate;
      if (store.answers.some((answer) => answer.discovery_session_id === input.sessionId && answer.question_key === input.questionKey)) {
        throw new CareerDiscoveryStateError(409, 'DUPLICATE_DISCOVERY_QUESTION', 'Question already has a canonical answer.');
      }
      const now = new Date().toISOString();
      const answer: DiscoveryAnswerRow = {
        id: randomUUID(),
        discovery_session_id: input.sessionId,
        user_id: input.userId,
        question_key: input.questionKey,
        answer_text: input.answer,
        input_mode: input.inputMode,
        sequence_no: input.sequenceNo,
        client_answer_id: input.clientAnswerId,
        created_at: now,
        updated_at: now,
      };
      store.answers.push(answer);
      return answer;
    },
    async updateSessionProgress(input: {
      sessionId: string;
      expectedStateVersion: number;
      status: DiscoverySessionStatus;
      currentQuestionKey: DiscoveryQuestionKey | null;
      currentStep: number;
      nextStateVersion: number;
      completedAt?: string | null;
    }) {
      const session = store.sessions.find((item) => item.id === input.sessionId);
      if (!session || session.state_version !== input.expectedStateVersion) return null;
      session.status = input.status;
      session.current_question_key = input.currentQuestionKey;
      session.current_step = input.currentStep;
      session.state_version = input.nextStateVersion;
      session.updated_at = new Date().toISOString();
      session.completed_at = input.completedAt || null;
      return session;
    },
  };
  return store;
}

function mapSession(row: Record<string, unknown>): DiscoverySessionRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    profile_id: String(row.profile_id),
    status: row.status === 'completed' ? 'completed' : 'in_progress',
    current_question_key: typeof row.current_question_key === 'string' ? row.current_question_key as DiscoveryQuestionKey : null,
    current_step: Number(row.current_step || 0),
    state_version: Number(row.state_version || 1),
    branch: typeof row.branch === 'string' ? row.branch : null,
    academic_year: typeof row.academic_year === 'number' ? row.academic_year : null,
    career_intent: typeof row.career_intent === 'string' ? row.career_intent : null,
    started_at: String(row.started_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
    completed_at: typeof row.completed_at === 'string' ? row.completed_at : null,
  };
}

function mapAnswer(row: Record<string, unknown>): DiscoveryAnswerRow {
  return {
    id: String(row.id),
    discovery_session_id: String(row.discovery_session_id),
    user_id: String(row.user_id),
    question_key: String(row.question_key) as DiscoveryQuestionKey,
    answer_text: String(row.answer_text || ''),
    input_mode: String(row.input_mode || 'unknown'),
    sequence_no: Number(row.sequence_no || 0),
    client_answer_id: String(row.client_answer_id || row.client_message_id || ''),
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

export function createSupabaseDiscoveryStore(supabase: SupabaseClient): DiscoveryStateStore {
  return {
    async findActiveSession(userId: string) {
      const result = await supabase
        .from('career_discovery_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (result.error) throw new CareerDiscoveryStateError(500, 'DISCOVERY_SESSION_READ_FAILED', result.error.message);
      return result.data ? mapSession(result.data as Record<string, unknown>) : null;
    },
    async createSession(input) {
      const now = new Date().toISOString();
      const result = await supabase
        .from('career_discovery_sessions')
        .insert({
          user_id: input.userId,
          profile_id: input.profileId,
          status: 'in_progress',
          current_question_key: input.currentQuestionKey,
          current_step: 0,
          state_version: 1,
          branch: input.branch || null,
          academic_year: input.academicYear || null,
          career_intent: input.careerIntent || null,
          started_at: now,
          updated_at: now,
        })
        .select('*')
        .single();
      if (result.error || !result.data) throw new CareerDiscoveryStateError(500, 'DISCOVERY_SESSION_CREATE_FAILED', result.error?.message || 'Session was not created.');
      return mapSession(result.data as Record<string, unknown>);
    },
    async getSession(sessionId: string) {
      const result = await supabase.from('career_discovery_sessions').select('*').eq('id', sessionId).maybeSingle();
      if (result.error) throw new CareerDiscoveryStateError(500, 'DISCOVERY_SESSION_READ_FAILED', result.error.message);
      return result.data ? mapSession(result.data as Record<string, unknown>) : null;
    },
    async listAnswers(sessionId: string) {
      const result = await supabase
        .from('career_discovery_answers')
        .select('*')
        .eq('discovery_session_id', sessionId)
        .order('sequence_no', { ascending: true });
      if (result.error) throw new CareerDiscoveryStateError(500, 'DISCOVERY_ANSWERS_READ_FAILED', result.error.message);
      return (result.data || []).map((row) => mapAnswer(row as Record<string, unknown>));
    },
    async findAnswerByClientId(sessionId: string, clientAnswerId: string) {
      const result = await supabase
        .from('career_discovery_answers')
        .select('*')
        .eq('discovery_session_id', sessionId)
        .eq('client_answer_id', clientAnswerId)
        .maybeSingle();
      if (result.error) throw new CareerDiscoveryStateError(500, 'DISCOVERY_IDEMPOTENCY_READ_FAILED', result.error.message);
      return result.data ? mapAnswer(result.data as Record<string, unknown>) : null;
    },
    async insertAnswer(input) {
      const now = new Date().toISOString();
      const result = await supabase
        .from('career_discovery_answers')
        .insert({
          discovery_session_id: input.sessionId,
          user_id: input.userId,
          question_key: input.questionKey,
          answer_text: input.answer,
          input_mode: normalizeInputMode(input.inputMode),
          sequence_no: input.sequenceNo,
          client_answer_id: input.clientAnswerId,
          client_message_id: input.clientAnswerId,
          answer_data: { text: input.answer },
          answer_json: { text: input.answer },
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();
      if (result.error || !result.data) {
        const duplicate = await this.findAnswerByClientId(input.sessionId, input.clientAnswerId);
        if (duplicate) return duplicate;
        throw new CareerDiscoveryStateError(409, 'DISCOVERY_ANSWER_CONFLICT', result.error?.message || 'Discovery answer could not be saved.');
      }
      return mapAnswer(result.data as Record<string, unknown>);
    },
    async updateSessionProgress(input) {
      const result = await supabase
        .from('career_discovery_sessions')
        .update({
          status: input.status,
          current_question_key: input.currentQuestionKey,
          current_step: input.currentStep,
          state_version: input.nextStateVersion,
          updated_at: new Date().toISOString(),
          completed_at: input.completedAt || null,
        })
        .eq('id', input.sessionId)
        .eq('state_version', input.expectedStateVersion)
        .select('*')
        .maybeSingle();
      if (result.error) throw new CareerDiscoveryStateError(500, 'DISCOVERY_SESSION_UPDATE_FAILED', result.error.message);
      return result.data ? mapSession(result.data as Record<string, unknown>) : null;
    },
    async insertTranscriptLog(input) {
      const result = await supabase.from('career_voice_transcript_logs').insert({
        flow: 'discovery',
        event_type: 'discovery_answer',
        actor: 'user',
        user_id: input.userId,
        discovery_session_id: input.sessionId,
        discovery_session_ref: input.sessionId,
        question_key: input.questionKey,
        sequence_no: input.sequenceNo,
        client_message_id: input.clientMessageId,
        input_mode: input.inputMode,
        content: input.answer,
        metadata: { stateMachine: 'v2' },
        occurred_at: new Date().toISOString(),
      });
      if (result.error) throw new CareerDiscoveryStateError(500, 'DISCOVERY_TRANSCRIPT_LOG_FAILED', result.error.message);
    },
  };
}
