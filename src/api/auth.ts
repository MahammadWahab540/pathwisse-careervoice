import { api } from './client';

export interface OtpRequestResponse {
  success: boolean;
  phone: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  studentId: string;
  phone: string;
  accessToken?: string;
}

export interface EmailOtpRequestResponse {
  success: boolean;
  email: string;
  devMode?: boolean;
}

export interface EmailOtpVerifyResponse {
  success: boolean;
  studentId: string;
  email: string;
  accessToken?: string;
  session?: any;
}

export async function requestOtp(phone: string): Promise<OtpRequestResponse> {
  return api.post<OtpRequestResponse>('/api/auth/otp/request', { phone });
}

export async function verifyOtp(phone: string, token: string): Promise<OtpVerifyResponse> {
  return api.post<OtpVerifyResponse>('/api/auth/otp/verify', { phone, token });
}

export async function requestEmailOtp(email: string): Promise<EmailOtpRequestResponse> {
  return api.post<EmailOtpRequestResponse>('/api/auth/email/request', { email });
}

export async function verifyEmailOtp(email: string, token: string): Promise<EmailOtpVerifyResponse> {
  return api.post<EmailOtpVerifyResponse>('/api/auth/email/verify', { email, token });
}

export interface UserProfileData {
  id: string;
  userId: string;
  fullName?: string | null;
  collegeId?: string | null;
  collegeName?: string | null;
  department?: string | null;
  academicYear?: string | number | null;
  careerIntent?: string | null;
  targetRoleId?: string | null;
  accountRole?: string | null;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string | null;
  collegeContext?: any;
  phone?: string | null;
  email?: string | null;
}

export interface UserProfileResponse {
  success: boolean;
  profile: UserProfileData | null;
}

export async function getProfile(userId?: string): Promise<UserProfileResponse> {
  const url = userId ? `/api/profile/${encodeURIComponent(userId)}` : '/api/profile/me';
  return api.get<UserProfileResponse>(url);
}

export async function saveWorkspace(context: {
  collegeId?: string;
  collegeName?: string;
  department?: string;
  officerName?: string;
  officerEmail?: string;
  targetBatch?: string;
  roleType?: string;
  leadershipTitle?: string;
  focusArea?: string;
  userId?: string;
}): Promise<{ success: boolean; collegeContext: any }> {
  return api.post('/api/college/workspace', context);
}

export async function logoutUser(): Promise<{ success: boolean }> {
  return api.post('/api/auth/logout', {});
}

export async function syncUserProfile(payload: {
  studentId: string;
  firstName?: string;
  fullName?: string;
  collegeName?: string;
  branch?: string;
  department?: string;
  gradYear?: string;
  academicYear?: string;
  careerIntent?: string;
  targetRoleId?: string;
  accountRole?: string;
  role?: string;
  onboardingCompleted?: boolean;
  collegeContext?: any;
}): Promise<{ success: boolean; profileId: string; studentId: string; onboardingCompleted?: boolean }> {
  return api.post('/api/profile/sync', payload);
}


