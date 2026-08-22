export type EvidenceStrength = 'Strong' | 'Moderate' | 'Weak' | 'None';
export type EvidenceSource =
  | 'voice_probe'
  | 'typed_probe'
  | 'resume'
  | 'project'
  | 'github'
  | 'document';

export type ReadinessStatus = 'Ready' | 'Nearly Ready' | 'Developing' | 'Early Stage';
export type GapPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface SkillSignalInput {
  auditId: string;
  studentId?: string;
  phone?: string;
  skillName: string;
  claimedLevel?: string;
  extractedLevel: string;
  confidenceScore: number;
  evidenceStrength: EvidenceStrength;
  rawAnswerSnippet: string;
  source: EvidenceSource;
  sourceMessageId?: string;
  idempotencyKey?: string;
}

export interface CompetencyBenchmark {
  skillId: string;
  skillName: string;
  category: string;
  expectedScore: number;
  importanceWeight: number;
  dependencyWeight: number;
  employabilityWeight: number;
  requiredLevel?: string;
  pathwisseSkillId?: string | null;
  recommendedStageIds?: string[];
}

export interface ScoringSignal {
  id: string;
  skillName: string;
  extractedLevel: string;
  confidenceScore: number;
  evidenceStrength: EvidenceStrength;
  evidenceId?: string;
}

export interface DeterministicSkillScore {
  skillId: string;
  skillName: string;
  demonstratedScore: number;
  signalIds: string[];
  evidenceIds: string[];
}

export interface DeterministicSkillGap extends DeterministicSkillScore {
  expectedScore: number;
  gap: number;
  priorityWeight: number;
  weightedGap: number;
  priority: GapPriority;
}

export interface DimensionScores {
  careerClarity: number;
  technicalReadiness: number;
  projectReadiness: number;
  communication: number;
  placementReadiness: number;
  executionReadiness: number;
}

export interface ReadinessWeights {
  careerClarity: number;
  technicalReadiness: number;
  projectReadiness: number;
  communication: number;
  placementReadiness: number;
  executionReadiness: number;
}

export const DEFAULT_READINESS_WEIGHTS: ReadinessWeights = {
  careerClarity: 0.1,
  technicalReadiness: 0.3,
  projectReadiness: 0.2,
  communication: 0.15,
  placementReadiness: 0.1,
  executionReadiness: 0.15,
};

export const READINESS_THRESHOLDS = {
  ready: 85,
  nearlyReady: 70,
  developing: 45,
} as const;

export interface RoleFitProfile {
  careerIntent: string;
  branch: string;
  knownSkills: string[];
}

export interface RoleFitRole {
  roleId: string;
  title: string;
  category: string;
  keySkills: string[];
}

export interface RoleFitResult {
  roleId: string;
  matchScore: number;
  fitBand: 'Strong Fit' | 'Good Fit' | 'Exploratory Fit' | 'Stretch Fit';
  fitReasons: string[];
}

const EVIDENCE_STRENGTHS: EvidenceStrength[] = ['Strong', 'Moderate', 'Weak', 'None'];
const EVIDENCE_SOURCES: EvidenceSource[] = [
  'voice_probe',
  'typed_probe',
  'resume',
  'project',
  'github',
  'document',
];

const LEVEL_BASE_SCORE: Record<string, number> = {
  none: 0,
  beginner: 35,
  intermediate: 60,
  advanced: 85,
  expert: 95,
};

const EVIDENCE_MULTIPLIER: Record<EvidenceStrength, number> = {
  Strong: 1,
  Moderate: 0.8,
  Weak: 0.55,
  None: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  return value.trim();
}

function boundedNumber(value: unknown, field: string, min = 0, max = 100): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max}`);
  }
  return value;
}

export function parseSkillSignalInput(input: unknown): SkillSignalInput {
  if (!isRecord(input)) throw new Error('skill signal payload must be an object');

  const evidenceStrength = requiredString(input.evidenceStrength, 'evidenceStrength') as EvidenceStrength;
  if (!EVIDENCE_STRENGTHS.includes(evidenceStrength)) {
    throw new Error('evidenceStrength is invalid');
  }

  const source = requiredString(input.source, 'source') as EvidenceSource;
  if (!EVIDENCE_SOURCES.includes(source)) {
    throw new Error('source is invalid');
  }

  return {
    auditId: requiredString(input.auditId, 'auditId'),
    studentId: optionalString(input.studentId, 'studentId'),
    phone: optionalString(input.phone, 'phone'),
    skillName: requiredString(input.skillName, 'skillName'),
    claimedLevel: optionalString(input.claimedLevel, 'claimedLevel'),
    extractedLevel: requiredString(input.extractedLevel, 'extractedLevel'),
    confidenceScore: boundedNumber(input.confidenceScore, 'confidenceScore'),
    evidenceStrength,
    rawAnswerSnippet: requiredString(input.rawAnswerSnippet, 'rawAnswerSnippet'),
    source,
    sourceMessageId: optionalString(input.sourceMessageId, 'sourceMessageId'),
    idempotencyKey: optionalString(input.idempotencyKey, 'idempotencyKey'),
  };
}

export function readinessStatusForScore(score: number): ReadinessStatus {
  const bounded = Math.max(0, Math.min(100, score));
  if (bounded >= READINESS_THRESHOLDS.ready) return 'Ready';
  if (bounded >= READINESS_THRESHOLDS.nearlyReady) return 'Nearly Ready';
  if (bounded >= READINESS_THRESHOLDS.developing) return 'Developing';
  return 'Early Stage';
}

export function scoreSignal(signal: ScoringSignal): number {
  const levelScore = LEVEL_BASE_SCORE[signal.extractedLevel.trim().toLowerCase()] ?? 0;
  const confidenceFactor = 0.5 + Math.max(0, Math.min(100, signal.confidenceScore)) / 200;
  return Math.round(levelScore * EVIDENCE_MULTIPLIER[signal.evidenceStrength] * confidenceFactor);
}

export function calculateSkillScore(
  benchmark: CompetencyBenchmark,
  signals: ScoringSignal[]
): DeterministicSkillScore {
  const matching = signals.filter(
    (signal) => signal.skillName.trim().toLowerCase() === benchmark.skillName.trim().toLowerCase()
  );

  const ranked = matching
    .map((signal) => ({ signal, score: scoreSignal(signal) }))
    .sort((a, b) => b.score - a.score || a.signal.id.localeCompare(b.signal.id));

  const bestScore = ranked[0]?.score ?? 0;

  return {
    skillId: benchmark.skillId,
    skillName: benchmark.skillName,
    demonstratedScore: bestScore,
    signalIds: matching.map((signal) => signal.id).sort(),
    evidenceIds: matching
      .map((signal) => signal.evidenceId)
      .filter((id): id is string => Boolean(id))
      .sort(),
  };
}

function round(value: number, places = 3): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateSkillGap(
  benchmark: CompetencyBenchmark,
  demonstratedScore: number,
  trace: Pick<DeterministicSkillScore, 'signalIds' | 'evidenceIds'> = { signalIds: [], evidenceIds: [] }
): DeterministicSkillGap {
  const demonstrated = Math.max(0, Math.min(100, Math.round(demonstratedScore)));
  const expected = Math.max(0, Math.min(100, Math.round(benchmark.expectedScore)));
  const gap = Math.max(expected - demonstrated, 0);
  const priorityWeight = round(
    Math.max(0, benchmark.importanceWeight) *
      Math.max(0, benchmark.dependencyWeight) *
      Math.max(0, benchmark.employabilityWeight)
  );
  const weightedGap = round(gap * priorityWeight);
  const priority: GapPriority =
    weightedGap >= 30 ? 'Critical' : weightedGap >= 15 ? 'High' : weightedGap >= 5 ? 'Medium' : 'Low';

  return {
    skillId: benchmark.skillId,
    skillName: benchmark.skillName,
    expectedScore: expected,
    demonstratedScore: demonstrated,
    gap,
    priorityWeight,
    weightedGap,
    priority,
    signalIds: trace.signalIds,
    evidenceIds: trace.evidenceIds,
  };
}

export function calculateOverallReadiness(
  dimensions: DimensionScores,
  weights: ReadinessWeights = DEFAULT_READINESS_WEIGHTS
): number {
  const keys = Object.keys(weights) as Array<keyof ReadinessWeights>;
  const totalWeight = keys.reduce((sum, key) => sum + Math.max(0, weights[key]), 0);
  if (totalWeight === 0) return 0;

  const weighted = keys.reduce((sum, key) => {
    const score = Math.max(0, Math.min(100, dimensions[key]));
    return sum + score * Math.max(0, weights[key]);
  }, 0);

  return Math.round(weighted / totalWeight);
}

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9+#.]+/g, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  );
}

function tokenOverlap(left: string, right: string): number {
  const a = tokenize(left);
  const b = tokenize(right);
  if (a.size === 0 || b.size === 0) return 0;
  let hits = 0;
  for (const token of a) if (b.has(token)) hits += 1;
  return hits / Math.max(1, Math.min(a.size, b.size));
}

function skillMatches(known: string, required: string): boolean {
  const knownNormalized = known.trim().toLowerCase();
  const requiredNormalized = required.trim().toLowerCase();
  return (
    knownNormalized === requiredNormalized ||
    knownNormalized.includes(requiredNormalized) ||
    requiredNormalized.includes(knownNormalized) ||
    tokenOverlap(knownNormalized, requiredNormalized) >= 0.5
  );
}

export function calculateRoleFit(profile: RoleFitProfile, role: RoleFitRole): RoleFitResult {
  const roleDescriptor = `${role.title} ${role.category} ${role.keySkills.join(' ')}`;
  const intentOverlap = tokenOverlap(profile.careerIntent, roleDescriptor);
  const intentScore = Math.round(Math.min(1, intentOverlap * 1.8) * 45);

  const softwareRole = /(engineer|developer|data|cloud|devops|security|machine learning|ai|software)/i.test(
    `${role.title} ${role.category}`
  );
  const softwareBranch = /(computer|information technology|software|electronics|ece|data|ai|machine learning)/i.test(
    profile.branch
  );
  const exactBranchOverlap = tokenOverlap(profile.branch, role.category);
  const academicScore = exactBranchOverlap >= 0.3 ? 20 : softwareRole && softwareBranch ? 17 : 5;

  const matchedSkills = role.keySkills.filter((required) =>
    profile.knownSkills.some((known) => skillMatches(known, required))
  );
  const skillScore = role.keySkills.length === 0 ? 0 : Math.round((matchedSkills.length / role.keySkills.length) * 30);

  const preferenceScore = profile.careerIntent.trim().length > 0 && intentOverlap > 0 ? 5 : 0;
  const matchScore = Math.max(0, Math.min(100, intentScore + academicScore + skillScore + preferenceScore));

  const fitBand: RoleFitResult['fitBand'] =
    matchScore >= 75
      ? 'Strong Fit'
      : matchScore >= 60
      ? 'Good Fit'
      : matchScore >= 40
      ? 'Exploratory Fit'
      : 'Stretch Fit';

  const fitReasons: string[] = [];
  if (intentScore >= 20) fitReasons.push(`Your stated career intent aligns with ${role.title}.`);
  if (academicScore >= 17) fitReasons.push(`Your ${profile.branch} background is relevant to this role family.`);
  if (matchedSkills.length > 0) fitReasons.push(`You already show overlap in ${matchedSkills.slice(0, 3).join(', ')}.`);
  if (fitReasons.length === 0) fitReasons.push('This role is a stretch based on the evidence currently available.');

  return { roleId: role.roleId, matchScore, fitBand, fitReasons };
}
