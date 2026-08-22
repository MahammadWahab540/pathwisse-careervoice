import { api } from './client';

export interface AnalyticsEventPayload {
  eventName: string;
  studentId?: string;
  anonymousId?: string;
  sessionId?: string;
  auditId?: string;
  screenName?: string;
  careerRole?: string;
  collegeId?: string;
  campaignId?: string;
  referralCode?: string;
  metadata?: Record<string, unknown>;
}

export async function trackAnalyticsEvent(payload: AnalyticsEventPayload): Promise<void> {
  try {
    await api.post('/api/analytics/track', payload);
  } catch (error) {
    console.warn('analytics_track_notice', error);
  }
}
