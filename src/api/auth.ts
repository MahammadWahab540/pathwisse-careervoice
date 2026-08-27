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

export async function requestOtp(phone: string): Promise<OtpRequestResponse> {
  return api.post<OtpRequestResponse>('/api/auth/otp/request', { phone });
}

export async function verifyOtp(phone: string, token: string): Promise<OtpVerifyResponse> {
  return api.post<OtpVerifyResponse>('/api/auth/otp/verify', { phone, token });
}
