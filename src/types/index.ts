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

export type EvidenceStrength = 'Strong' | 'Moderate' | 'Weak' | 'None';
export type ReadinessStatus = 'Ready' | 'Nearly Ready' | 'Developing' | 'Early Stage';
export type GapPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface UserIdentity {
  phone: string;
  countryCode: string;
  isOtpVerified: boolean;
  studentId: string;
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
  matchScore?: number;
  fitBand?: string;
  fitReasons?: string[];
}

export interface CompetencySkillBenchmark {
  skillId: string;
  skillSlug?: string;
  skillName: string;
  category: string;
  requiredLevel?: string;
  expectedScore: number;
  importanceWeight: number;
  dependencyWeight: number;
  employabilityWeight: number;
  description: string;
}

export interface RoleCompetencyModel {
  roleId: string;
  roleTitle: string;
  description?: string;
  minimumReadinessBenchmark: number;
  coreCompetencies: CompetencySkillBenchmark[];
  evaluationCriteria: {
    clarityWeight: number;
    technicalWeight: number;
    projectWeight: number;
    communicationWeight: number;
    placementWeight: number;
    executionWeight: number;
  };
}

export interface DiagnosticConclusion {
  id: string;
  skillName: string;
  studentAnswerSnippet: string;
  evidenceVerified: string;
  evidenceStrength: EvidenceStrength;
  score: number;
  confidenceScore: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  gapSeverity: 'RED' | 'ORANGE' | 'GREEN';
  gapDescription: string;
  recommendedAction: string;
}

export interface SkillEvidence {
  skillName: string;
  claimedLevel?: string;
  extractedLevel: string;
  confidenceScore: number;
  confidenceLevel?: 'High' | 'Medium' | 'Low';
  evidenceStrength: EvidenceStrength;
  rawAnswerSnippet: string;
  source: 'voice_probe' | 'typed_probe' | 'resume' | 'project' | 'github' | 'document';
  signalId?: string;
  evidenceId?: string;
}

export interface DimensionScores {
  careerClarity: number;
  technicalReadiness: number;
  projectReadiness: number;
  communication: number;
  placementReadiness: number;
  executionReadiness: number;
}

export interface CareerGap {
  id: string;
  gapId?: string;
  skillId?: string;
  title: string;
  skillName?: string;
  severity: 'RED' | 'ORANGE' | 'GREEN';
  priority?: GapPriority;
  description: string;
  expectedScore?: number;
  demonstratedScore?: number;
  gap?: number;
  priorityWeight?: number;
  weightedGap?: number;
  pathwisseSkillId?: string;
  recommendedPathwisseSkillId?: string;
  recommendedStageIds?: string[];
  mappingStatus?: 'MAPPED' | 'UNMAPPED';
  recommendedAction: string;
  associatedSkill?: string;
  evidenceBasis?: string;
  evidenceIds?: string[];
  signalIds?: string[];
}

export interface AuditStrength {
  skillId: string;
  skillName: string;
  demonstratedScore: number;
  evidence: string;
  confidenceScore: number;
  whyItMatters: string;
}

export interface EvidenceLedgerItem {
  skillId: string;
  skillName: string;
  observedEvidence: string[];
  missingEvidence: string[];
  weakEvidence: string[];
  contradictoryEvidence: string[];
}

export interface AuditRecommendation {
  recommendationId: string;
  gapId: string;
  rank: number;
  recommendedAction: string;
  reason: string;
  mappingStatus: 'MAPPED' | 'UNMAPPED';
  pathwisseSkillId?: string;
  recommendedStageIds: string[];
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

export interface CareerAuditRoadmapHandoff {
  contract: 'career-audit-roadmap-contract:v1';
  auditId: string;
  studentId: string;
  targetRoleId: string;
  readinessScore: number;
  priorityGaps: Array<{
    gapId: string;
    skillId: string;
    skillName: string;
    expectedScore: number;
    demonstratedScore: number;
    gapScore: number;
    priority: GapPriority;
    mappingStatus: 'MAPPED' | 'UNMAPPED';
    recommendedPathwisseSkillId?: string;
    recommendedStageIds: string[];
    evidenceIds: string[];
  }>;
}

export interface CareerAuditResult {
  auditId: string;
  targetRoleId: string;
  targetRole: string;
  overallScore: number;
  readinessStatus: ReadinessStatus;
  hiringBenchmark: number;
  distanceFromBenchmark: number;
  dimensionScores: DimensionScores;
  diagnosisSummary: string;
  whyRoleFits: string[];
  strengths: AuditStrength[];
  gaps: CareerGap[];
  evidenceLedger: EvidenceLedgerItem[];
  priorityRecommendations: AuditRecommendation[];
  diagnosticConclusions: DiagnosticConclusion[];
  roadmapHandoff?: CareerAuditRoadmapHandoff;
  roadmap?: RoadmapWeek[];
  recommendedPathwissePlan?: {
    planName: string;
    highlight: string;
    features: string[];
  };
  auditTimestamp?: string;
  auditIteration?: number;
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
  studentId?: string;
  anonymousId: string;
  sessionId: string;
  auditId?: string;
  screenName: string;
  questionId?: string;
  careerRole?: string;
  collegeId?: string;
  campaignId?: string;
  referralCode?: string;
  inputMethod?: 'voice' | 'tap' | 'type';
  timestamp: string;
  timeOnScreenMs?: number;
  metadata?: Record<string, unknown>;
}

export interface VoiceMetrics {
  speechToTextLatencyMs: number;
  llmResponseLatencyMs: number;
  textToSpeechLatencyMs: number;
  totalTurnLatencyMs: number;
  interruptedCount: number;
}
