import type {
  DimensionScores,
  EvidenceStrength,
  GapPriority,
  ReadinessStatus,
  SkillSignalInput,
} from '../domain/careerAudit';

export interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  details?: unknown;
}

export interface AuditSessionRequest {
  studentId: string;
  targetRoleId: string;
  phone?: string;
  idempotencyKey?: string;
  context?: Record<string, unknown>;
}

export interface AuditSessionResponse {
  success: true;
  auditId: string;
  studentId: string;
  targetRoleId: string;
  status: string;
}

export interface QalamExtractedSkill {
  skillName: string;
  extractedLevel: string;
  confidenceScore: number;
  evidenceStrength: EvidenceStrength;
}

export interface QalamChatRequest {
  auditId: string;
  userText: string;
  inputMethod: 'voice' | 'type' | 'tap';
  clientMessageId: string;
  studentContext?: Record<string, unknown>;
  targetRoleId: string;
  targetRole: string;
  currentStage: string;
}

export interface QalamChatResponse {
  success: true;
  sourceMessageId: string;
  qalamMessageId: string;
  qalamText: string;
  qalamState: string;
  evidenceStrength: EvidenceStrength;
  needsFollowUp: boolean;
  followUpQuestion: string;
  extractedSkills: QalamExtractedSkill[];
}

export type AuditEvidenceSignalRequest = SkillSignalInput;

export interface RoleCompetencyResponse {
  roleId: string;
  minimumReadinessBenchmark: number;
  evaluationCriteria: {
    clarityWeight: number;
    technicalWeight: number;
    projectWeight: number;
    communicationWeight: number;
    placementWeight: number;
    executionWeight: number;
  };
  coreCompetencies: Array<{
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
  }>;
}

export interface AuditSkillGapResponse {
  gapId: string;
  skillId: string;
  skillName: string;
  expectedScore: number;
  demonstratedScore: number;
  gap: number;
  priorityWeight: number;
  weightedGap: number;
  priority: GapPriority;
  evidenceIds: string[];
  signalIds: string[];
  evidenceBasis: string;
  recommendedAction: string;
  mappingStatus: 'MAPPED' | 'UNMAPPED';
  recommendedPathwisseSkillId?: string;
  recommendedStageIds: string[];
}

export interface AuditStrengthResponse {
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

export interface CareerAuditReportResponse {
  success: true;
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
  strengths: AuditStrengthResponse[];
  gaps: AuditSkillGapResponse[];
  evidenceLedger: EvidenceLedgerItem[];
  priorityRecommendations: Array<{
    recommendationId: string;
    gapId: string;
    rank: number;
    recommendedAction: string;
    reason: string;
    mappingStatus: 'MAPPED' | 'UNMAPPED';
    pathwisseSkillId?: string;
    recommendedStageIds: string[];
  }>;
  diagnosticConclusions: Array<{
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
  }>;
}

export interface CareerAuditRoadmapHandoffV1 {
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
