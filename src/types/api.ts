import type {
  EvidenceCoverageItem,
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
  targetRoleId?: string;
  idempotencyKey?: string;
  context?: Record<string, unknown>;
}

export interface AuditSessionResponse {
  success: true;
  auditId: string;
  studentId: string;
  targetRoleId: string | null;
  status: string;
  applicationState: string;
}

export interface QalamExtractedSignal {
  skillId: string;
  extractedLevel: string;
  confidenceScore: number;
  evidenceStrength: EvidenceStrength;
  rationale: string;
}

export interface QalamChatRequest {
  auditId: string;
  userText: string;
  inputMethod: 'voice' | 'type' | 'tap';
  clientMessageId: string;
}

export interface QalamChatResponse {
  success: true;
  sourceMessageId: string;
  evidenceId: string;
  qalamMessageId: string;
  qalamText: string;
  extractedSignals: QalamExtractedSignal[];
  coverage: EvidenceCoverageItem[];
  interviewComplete: boolean;
  nextCompetency: unknown | null;
  bareClaimGuardApplied: boolean;
}

export type AuditEvidenceSignalRequest = SkillSignalInput;

export interface RoleCompetencyResponse {
  roleId: string;
  readinessBenchmark: number;
  roleSkills: Array<{
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

export interface CareerAuditReportResponse {
  success: true;
  auditId: string;
  targetRoleId: string;
  targetRole: string;
  overallScore: number;
  readinessStatus: ReadinessStatus;
  readinessBenchmark: number;
  distanceFromBenchmark: number;
  diagnosisSummary: string;
  whyRoleFits: string[];
  strengths: AuditStrengthResponse[];
  skillMap: CompleteSkillMapItem[];
  gaps: AuditSkillGapResponse[];
  evidenceCoverage: EvidenceCoverageItem[];
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
