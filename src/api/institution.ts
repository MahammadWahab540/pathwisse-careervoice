import { api } from './client';

export type AccountRole = 'student' | 'placement_team' | 'college_management';

export interface InstitutionMembership {
  id: string;
  collegeId: string;
  department?: string | null;
  role: Exclude<AccountRole, 'student'>;
}

export interface ShareLink {
  id: string;
  token: string;
  collegeId: string;
  department?: string | null;
  campaign?: string | null;
  status: 'active' | 'revoked' | 'expired';
  expiresAt?: string | null;
  usageCount?: number;
}

export interface CollegeAnalytics {
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  readinessDistribution: Record<string, number>;
  recentSessions: Array<Record<string, unknown>>;
}

export const saveAccountRole = (accountRole: AccountRole) =>
  api.post<{ success: boolean }>('/api/onboarding/role', { accountRole });

export const saveInstitutionMembership = (input: { collegeId: string; department?: string; role: Exclude<AccountRole, 'student'> }) =>
  api.post<{ success: boolean; membership: InstitutionMembership }>('/api/onboarding/institution', input);

export const listShareLinks = () => api.get<{ links: ShareLink[] }>('/api/college/share-links');

export const createShareLink = (input: { department?: string; campaign?: string; expiresAt?: string }) =>
  api.post<{ link: ShareLink }>('/api/college/share-links', input);

export const revokeShareLink = (id: string) => api.post<{ success: boolean }>(`/api/college/share-links/${id}/revoke`, {});

export const getCollegeAnalytics = () => api.get<CollegeAnalytics>('/api/college/analytics');

export const resolveShareLink = (token: string) => api.get<{ link: ShareLink }>(`/api/share/${encodeURIComponent(token)}`);
