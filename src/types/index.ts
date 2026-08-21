export type QalamState = 
  | 'IDLE'
  | 'WELCOME'
  | 'LISTENING'
  | 'SPEAKING'
  | 'THINKING'
  | 'CURIOUS'
  | 'SURPRISED'
  | 'ENCOURAGING'
  | 'CELEBRATING';

export interface UserIdentity {
  phone: string;
  countryCode: string;
  isOtpVerified: boolean;
  anonymousId: string;
  sessionId: string;
  referralCode?: string;
  campaignId?: string;
  collegeId?: string;
}

export interface StudentContext {
  degree: string;
  year: string;
  collegeName: string;
  branch: string;
}

export interface CareerRoleTarget {
  id: string;
  title: string;
  category: string;
  description: string;
  demandLevel: 'High' | 'Extremely High' | 'Moderate';
  keySkills: string[];
}

export interface SkillEvidence {
  skillName: string;
  claimedLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  evidenceLevel: 'None' | 'Beginner' | 'Intermediate' | 'Advanced';
  confidenceScore: number; // 0 - 100
  notes?: string;
}

export interface DimensionScores {
  careerClarity: number;      // 0 - 100
  technicalReadiness: number; // 0 - 100
  projectReadiness: number;   // 0 - 100
  communication: number;      // 0 - 100
  placementReadiness: number; // 0 - 100
  executionReadiness: number; // 0 - 100
}

export interface CareerGap {
  id: string;
  title: string;
  severity: 'RED' | 'ORANGE' | 'GREEN'; // RED = critical, ORANGE = moderate, GREEN = strength
  description: string;
  pathwisseSkillId?: string;
  recommendedAction: string;
}

export interface RoadmapWeek {
  weekNumber: number;
  title: string;
  focusArea: string;
  estimatedHours: number;
  topics: {
    name: string;
    description: string;
    learningOutcome: string;
    type: 'Concept' | 'Project' | 'Practice' | 'Interview';
  }[];
}

export interface CareerAuditResult {
  overallScore: number;
  dimensionScores: DimensionScores;
  diagnosisSummary: string;
  gaps: CareerGap[];
  roadmap: RoadmapWeek[];
  recommendedPathwissePlan: {
    planName: string;
    highlight: string;
    features: string[];
  };
}

export interface AuditMessage {
  id: string;
  sender: 'qalam' | 'user';
  text: string;
  timestamp: number;
  qalamState?: QalamState;
  audioUrl?: string;
}

export interface EvidenceUploads {
  resumeFileName?: string;
  resumeText?: string;
  linkedInUrl?: string;
  gitHubUrl?: string;
  portfolioUrl?: string;
  internshipDetails?: string;
}

export interface AnalyticsEvent {
  id: string;
  eventName: string;
  userId?: string;
  anonymousId: string;
  sessionId: string;
  auditId: string;
  screenName: string;
  questionId?: string;
  careerRole?: string;
  collegeId?: string;
  campaignId?: string;
  referralCode?: string;
  inputMethod?: 'voice' | 'tap' | 'type';
  timestamp: string;
  timeOnScreenMs?: number;
  metadata?: Record<string, any>;
}

export interface VoiceMetrics {
  speechToTextLatencyMs: number;
  llmResponseLatencyMs: number;
  textToSpeechLatencyMs: number;
  totalTurnLatencyMs: number;
  interruptedCount: number;
}
