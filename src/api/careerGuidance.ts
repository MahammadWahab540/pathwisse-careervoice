import { api } from './client';

export interface CareerGuidanceRequest {
  question: string;
  targetRole?: string;
  careerStream?: string;
  studentProfile?: {
    firstName?: string;
    branch?: string;
    academicYear?: string;
  };
}

export interface CareerGuidanceResponse {
  success: boolean;
  roleTitle: string;
  spokenSummary: string;
  dayToDay: string[];
  salaryInsight: string;
  demandInsight: string;
  keyPrerequisites: string[];
  actionableTip: string;
}

export async function askCareerGuidance(payload: CareerGuidanceRequest): Promise<CareerGuidanceResponse> {
  return api.post<CareerGuidanceResponse>('/api/career/guidance', payload);
}
