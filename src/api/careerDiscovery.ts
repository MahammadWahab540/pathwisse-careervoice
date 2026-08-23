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
  profile: CareerDiscoveryProfileDto;
  nextQuestion: DiscoveryQuestionDto | null;
  completed: boolean;
}

export interface CareerDiscoveryInput {
  studentId?: string;
  branch?: string;
  academicYear?: string | number;
  careerIntent?: string;
}

export async function getCareerDiscoveryState(input: CareerDiscoveryInput): Promise<CareerDiscoveryStateDto> {
  const params = new URLSearchParams();
  if (input.studentId) params.set('studentId', input.studentId);
  if (input.branch) params.set('branch', input.branch);
  if (input.academicYear !== undefined) params.set('academicYear', String(input.academicYear));
  if (input.careerIntent) params.set('careerIntent', input.careerIntent);
  return api.get<CareerDiscoveryStateDto>(`/api/career-discovery?${params.toString()}`);
}

export async function submitCareerDiscoveryAnswer(
  input: CareerDiscoveryInput & { questionKey: string; answer: string },
): Promise<CareerDiscoveryStateDto> {
  return api.post<CareerDiscoveryStateDto>('/api/career-discovery/answer', input);
}
