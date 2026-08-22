import type { EvidenceStrength } from './audit';

export type ReadinessStatus = 'Ready' | 'Nearly Ready' | 'Developing' | 'Early Stage';
export type GapPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface DimensionScoresDto {
  careerClarity: number;
  technicalReadiness: number;
  projectReadiness: number;
  communication: number;
  placementReadiness: number;
  executionReadiness: number;
}

export interface AuditStrengthDto {
  skillId: string;
  skillName: string;
  demonstratedScore: number;
  evidence: string;
  confidenceScore: number;
  whyItMatters: string;
}

export interface AuditSkillGapDto {
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

export interface EvidenceLedgerItemDto {
  skillId: string;
  skillName: string;
  observedEvidence: string[];
  missingEvidence: string[];
  weakEvidence: string[];
  contradictoryEvidence: string[];
}

export interface PriorityRecommendationDto {
  recommendationId: string;
  gapId: string;
  rank: number;
  recommendedAction: string;
  reason: string;
  mappingStatus: 'MAPPED' | 'UNMAPPED';
  pathwisseSkillId?: string;
  recommendedStageIds: string[];
}

export interface DiagnosticConclusionDto {
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

export interface CareerAuditReportDto {
  success: true;
  auditId: string;
  targetRoleId: string;
  targetRole: string;
  overallScore: number;
  readinessStatus: ReadinessStatus;
  hiringBenchmark: number;
  distanceFromBenchmark: number;
  dimensionScores: DimensionScoresDto;
  diagnosisSummary: string;
  whyRoleFits: string[];
  strengths: AuditStrengthDto[];
  gaps: AuditSkillGapDto[];
  evidenceLedger: EvidenceLedgerItemDto[];
  priorityRecommendations: PriorityRecommendationDto[];
  diagnosticConclusions: DiagnosticConclusionDto[];
}
