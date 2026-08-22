export type EvidenceStrength = 'Strong' | 'Moderate' | 'Weak' | 'None';
export type EvidenceStatus = 'Strong Evidence' | 'Moderate Evidence' | 'Weak Evidence' | 'Insufficient Evidence';

export interface AuditSessionDto {
  auditId: string;
  studentId: string;
  targetRoleId: string;
  status: string;
  targetRole?: {
    id: string;
    title: string;
    category?: string;
    description?: string;
    demandLevel?: string;
    keySkills?: string[];
  };
  messages?: AuditMessageDto[];
  evidenceCoverage?: EvidenceCoverageItemDto[];
}

export interface AuditMessageDto {
  id: string;
  sender: 'qalam' | 'user' | 'system';
  text: string;
  timestamp: number;
  qalamState?: string;
  inputMode?: 'voice' | 'text' | 'tap' | 'system';
}

export interface EvidenceCoverageItemDto {
  skillId: string;
  skillName: string;
  category: string;
  expectedScore: number;
  demonstratedScore?: number;
  evidenceStrength: EvidenceStrength;
  evidenceStatus: EvidenceStatus;
  confidenceScore: number;
  observationsCount: number;
}

export interface QalamChatResponseDto {
  success: true;
  sourceMessageId: string;
  qalamMessageId: string;
  qalamText: string;
  qalamState: string;
  evidenceStrength: EvidenceStrength;
  needsFollowUp: boolean;
  followUpQuestion: string;
  nextAction?: 'probe' | 'challenge' | 'scenario' | 'switch_skill' | 'request_evidence' | 'complete';
  extractedSkills: Array<{
    skillName: string;
    extractedLevel: string;
    confidenceScore: number;
    evidenceStrength: EvidenceStrength;
  }>;
}

export interface SkillEvidenceDto {
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

export interface EvidenceUploadsDto {
  resumeFileName?: string;
  resumeText?: string;
  linkedInUrl?: string;
  gitHubUrl?: string;
  portfolioUrl?: string;
  internshipDetails?: string;
  projectDocumentText?: string;
}
