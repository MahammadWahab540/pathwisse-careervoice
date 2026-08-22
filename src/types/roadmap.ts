import type { GapPriority } from './report';

export interface PriorityGapHandoffDto {
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
}

export interface CareerAuditRoadmapHandoffDto {
  contract: 'career-audit-roadmap-contract:v1';
  auditId: string;
  studentId: string;
  targetRoleId: string;
  readinessScore: number;
  priorityGaps: PriorityGapHandoffDto[];
}
