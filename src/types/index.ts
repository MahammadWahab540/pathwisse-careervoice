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

export interface CompetencySkillBenchmark {
  skillName: string;
  category: 'Core Theory' | 'Applied Engineering' | 'Tools & Infrastructure' | 'Problem Solving';
  expectedLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  weight: number;
}

export interface RoleCompetencyModel {
  roleId: string;
  roleTitle: string;
  description: string;
  minimumReadinessBenchmark: number; // e.g. 70
  coreCompetencies: CompetencySkillBenchmark[];
  evaluationCriteria: {
    clarityWeight: number;
    technicalWeight: number;
    projectWeight: number;
    communicationWeight: number;
    executionWeight: number;
  };
}

export interface DiagnosticConclusion {
  id: string;
  skillName: string;
  studentAnswerSnippet: string;
  evidenceVerified: string;
  evidenceStrength: 'Strong' | 'Moderate' | 'Weak' | 'None';
  score: number; // 0 - 100
  confidenceScore: number; // 0 - 100
  confidenceLevel: 'High' | 'Medium' | 'Low';
  gapSeverity: 'RED' | 'ORANGE' | 'GREEN';
  gapDescription: string;
  recommendedAction: string;
}

export interface SkillEvidence {
  skillName: string;
  claimedLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  evidenceLevel: 'None' | 'Beginner' | 'Intermediate' | 'Advanced';
  confidenceScore: number; // 0 - 100
  confidenceLevel?: 'High' | 'Medium' | 'Low';
  notes?: string;
  mappedEvidence?: string;
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
  associatedSkill?: string;
  evidenceBasis?: string;
}

export interface RoadmapTopic {
  name: string;
  description: string;
  learningOutcome: string;
  type: 'Concept' | 'Project' | 'Practice' | 'Interview';
  completed?: boolean;
}

export interface RoadmapWeek {
  weekNumber: number;
  title: string;
  focusArea: string;
  estimatedHours: number;
  topics: RoadmapTopic[];
  completed?: boolean;
}

export interface CareerAuditResult {
  overallScore: number;
  dimensionScores: DimensionScores;
  diagnosisSummary: string;
  diagnosticConclusions: DiagnosticConclusion[];
  gaps: CareerGap[];
  roadmap: RoadmapWeek[];
  recommendedPathwissePlan: {
    planName: string;
    highlight: string;
    features: string[];
  };
  auditTimestamp?: string;
  auditIteration?: number; // 1 for first audit, 2+ for re-audits
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
  adaptiveEvidence?: Array<{
    skillName: string;
    fileName?: string;
    url?: string;
    note?: string;
  }>;
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
