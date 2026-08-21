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
export type RecommendationType = 'Strong Direction' | 'Worth Exploring' | 'Alternative Path';
export type ApplicationState =
  | 'AUTH'
  | 'PROFILE'
  | 'DISCOVERY'
  | 'ROLE_RECOMMENDATIONS'
  | 'ROLE_COMPARE'
  | 'ROLE_CONFIRM'
  | 'AUDIT_SETUP'
  | 'ADAPTIVE_AUDIT'
  | 'EVIDENCE_REVIEW'
  | 'PROCESSING'
  | 'READINESS_REPORT'
  | 'PRIORITY_GAPS'
  | 'PATHWISSE_HANDOFF';

export type { StudentCareerProfile, EvidenceCoverageItem } from '../domain/careerAudit';

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
  demandLevel: 'High' | 'Extremely High' | 'Moderate' | string;
  keySkills: string[];
}

export interface CareerRoleRecommendation extends CareerRoleTarget {
  recommendationType: RecommendationType;
  reasons: string[];
  supportingEvidence: string[];
}

export interface CareerRoleExplanation extends CareerRoleTarget {
  responsibilities: unknown[];
  typicalDay: string | null;
  problemsSolved: unknown[];
  toolsUsed: unknown[];
  careerProgression: unknown[];
  challenges: unknown[];
  whoEnjoys: string | null;
  contentStatus: 'partial' | 'complete' | string;
  skills: Array<{
    id: string;
    name: string;
    requiredLevel: string;
    expectedReadiness: number;
  }>;
  whyThisStudent: {
    recommendationType: RecommendationType;
    reason: string;
    supportingEvidence: string[];
  } | null;
  comparison: Array<{
    roleId: string;
    role: string;
    category: string;
    recommendationType: RecommendationType;
    reason: string;
    supportingEvidence: string[];
    keySkills: string[];
  }>;
}

export interface CompetencySkillBenchmark {
  skillId: string;
  skillSlug: string;
  skillName: string;
  requiredLevel: string;
  expectedReadiness: number;
  weight: number;
  minimumEvidenceThreshold: number;
  minimumEvidenceStrength: 'Moderate' | 'Strong';
  employabilityImportance: number;
  dependencyWeight: number;
  evidenceRequirements: Record<string, unknown>;
  evaluationRubric: Record<string, unknown>;
  probeGuidance: Record<string, unknown>;
}

export interface RoleCompetencyModel {
  roleId: string;
  readinessBenchmark: number;
  roleSkills: CompetencySkillBenchmark[];
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
  recommendedPathwisseSkillId?: string;
  recommendedStageIds?: string[];
  mappingStatus?: 'MAPPED' | 'UNMAPPED';
  recommendedAction: string;
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

export interface CompleteSkillMapItem {
  skillId: string;
  skillName: string;
  requiredLevel: string;
  expectedReadiness: number;
  demonstratedReadiness: number;
  evidenceConfidence: number;
  evidenceStrength: EvidenceStrength;
  evidenceObserved: string[];
  missingEvidence: string[];
  scoreId: string;
  gapId: string;
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

export interface CareerAuditRoadmapHandoff {
  contract: 'career-voice-pathwisse-handoff:v1';
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
  readinessBenchmark: number;
  distanceFromBenchmark: number;
  diagnosisSummary: string;
  whyRoleFits: string[];
  strengths: AuditStrength[];
  skillMap: CompleteSkillMapItem[];
  gaps: CareerGap[];
  evidenceCoverage: import('../domain/careerAudit').EvidenceCoverageItem[];
  evidenceLedger: EvidenceLedgerItem[];
  priorityRecommendations: AuditRecommendation[];
  diagnosticConclusions: DiagnosticConclusion[];
  roadmapHandoff?: CareerAuditRoadmapHandoff;
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
