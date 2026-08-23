import { api } from './client';

export interface ProfileSyncInput {
  studentId: string;
  firstName?: string;
  collegeName?: string;
  branch?: string;
  gradYear?: string;
  careerIntent?: string;
  targetRoleId?: string;
}

export interface ProfileSyncResponse {
  success: boolean;
  profileId: string;
  studentId: string;
}

export async function syncProfile(input: ProfileSyncInput): Promise<ProfileSyncResponse> {
  return api.post<ProfileSyncResponse>('/api/profile/sync', input);
}
