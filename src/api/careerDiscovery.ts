import { api } from './client';

export interface DiscoveryQuestionDto {
  key: string;
  prompt: string;
  suggestions: string[];
}

export interface CareerDiscoveryProfileDto {
  interests?: string[];
  skills?: string[];
  projects?: string[];
  strengths?: string[];
  workPreference?: string;
  wantsIT?: boolean;
  explicitCareerIntent?: string;
  completed?: boolean;
}

export interface CareerDiscoveryStateDto {
  success: true;
  sessionId: string;
  status: 'in_progress' | 'completed';
  profile: CareerDiscoveryProfileDto;
  currentQuestion: DiscoveryQuestionDto | null;
  nextQuestion: DiscoveryQuestionDto | null;
  completedQuestionKeys: string[];
  stateVersion: number;
  completed: boolean;
}

export interface CareerDiscoveryInput {
  studentId?: string;
  phone?: string;
  branch?: string;
  academicYear?: string | number;
  careerIntent?: string;
  inputMethod?: 'voice' | 'type' | 'tap' | 'system' | string;
}

export async function getCareerDiscoveryState(input: CareerDiscoveryInput): Promise<CareerDiscoveryStateDto> {
  return api.post<CareerDiscoveryStateDto>('/api/career-discovery/session', input);
}

export async function submitCareerDiscoveryAnswer(
  input: CareerDiscoveryInput & {
    discoverySessionId: string;
    questionKey: string;
    answer: string;
    clientMessageId: string;
    stateVersion: number;
    inputMode?: string;
  },
): Promise<CareerDiscoveryStateDto> {
  return api.post<CareerDiscoveryStateDto>('/api/career-discovery/answer', input);
}
