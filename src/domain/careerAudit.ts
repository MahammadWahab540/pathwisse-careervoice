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
export type ScoreStatus = 'SCORED' | 'INSUFFICIENT_EVIDENCE';
export type EvidenceCoverageLabel = 'Strong' | 'Moderate' | 'Weak Evidence' | 'Insufficient Evidence';
export type RecommendationType = 'Strong Direction' | 'Worth Exploring' | 'Alternative Path';

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
  evidenceId?: string;
  idempotencyKey?: string;
}

export interface CompetencyBenchmark {
  skillId: string;
  skillSlug?: string;
  skillName: string;
  category: string;
  expectedScore: number;
  importanceWeight: number;
  dependencyWeight: number;
  employabilityWeight: number;
  requiredLevel?: string;
  minimumEvidenceThreshold: number;
  minimumEvidenceStrength: 'Moderate' | 'Strong';
  evidenceRequirements?: Record<string, unknown>;
  evaluationRubric?: Record<string, unknown>;
  probeGuidance?: Record<string, unknown>;
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
  status: ScoreStatus;
  demonstratedScore: number | null;
  primarySignalId: string | null;
  primaryEvidenceId: string | null;
  signalIds: string[];
  evidenceIds: string[];
}

export interface DeterministicSkillGap {
  skillId: string;
  skillName: string;
  expectedScore: number;
  demonstratedScore: number;
  gap: number;
  priorityWeight: number;
  weightedGap: number;
  priority: GapPriority;
  signalIds: string[];
  evidenceIds: string[];
}

export interface EvidenceCoverageItem {
  skillId: string;
  skillSlug: string;
  skillName: string;
  expectedScore: number;
  requiredLevel?: string;
  coverage: EvidenceCoverageLabel;
  scoreStatus: ScoreStatus;
  demonstratedScore: number | null;
  confidenceScore: number | null;
  evidenceStrength: EvidenceStrength;
  primarySignalId: string | null;
  primaryEvidenceId: string | null;
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

export interface StudentCareerProfile {
  education: string;
  branch: string;
  academicYear: string;
  interests: string[];
  technicalSkills: string[];
  nontechnicalStrengths: string[];
  projects: string[];
  internships: string[];
  workExperience: string[];
  preferredWork: string;
  enjoyedProblems: string;
  analyticalInclination: string;
  technicalInclination: string;
  communicationInclination: string;
  leadershipInclination: string;
  careerAspirations: string;
}

export interface RoleDirectionRole {
  roleId: string;
  title: string;
  category: string;
  keySkills: string[];
}

export interface RoleDirectionResult {
  roleId: string;
  recommendationType: RecommendationType;
  reasons: string[];
  supportingEvidence: string[];
}

// Compatibility types retained only while older call sites migrate to calculateRoleDirection.
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

const EVIDENCE_RANK: Record<EvidenceStrength, number> = {
  None: 0,
  Weak: 1,
  Moderate: 2,
  Strong: 3,
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
    evidenceId: optionalString(input.evidenceId, 'evidenceId'),
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

export function isSignalSufficient(benchmark: CompetencyBenchmark, signal: ScoringSignal): boolean {
  const requiredRank = EVIDENCE_RANK[benchmark.minimumEvidenceStrength];
  return (
    EVIDENCE_RANK[signal.evidenceStrength] >= requiredRank &&
    signal.confidenceScore >= benchmark.minimumEvidenceThreshold &&
    Boolean(signal.evidenceId)
  );
}

export function calculateSkillScore(
  benchmark: CompetencyBenchmark,
  signals: ScoringSignal[]
): DeterministicSkillScore {
  const matching = signals.filter(
    (signal) => signal.skillName.trim().toLowerCase() === benchmark.skillName.trim().toLowerCase()
  );
  const sufficient = matching
    .filter((signal) => isSignalSufficient(benchmark, signal))
    .map((signal) => ({ signal, score: scoreSignal(signal) }))
    .sort((a, b) => b.score - a.score || b.signal.confidenceScore - a.signal.confidenceScore || a.signal.id.localeCompare(b.signal.id));

  const best = sufficient[0];
  if (!best) {
    return {
      skillId: benchmark.skillId,
      skillName: benchmark.skillName,
      status: 'INSUFFICIENT_EVIDENCE',
      demonstratedScore: null,
      primarySignalId: null,
      primaryEvidenceId: null,
      signalIds: matching.map((signal) => signal.id).sort(),
      evidenceIds: matching
        .map((signal) => signal.evidenceId)
        .filter((id): id is string => Boolean(id))
        .sort(),
    };
  }

  return {
    skillId: benchmark.skillId,
    skillName: benchmark.skillName,
    status: 'SCORED',
    demonstratedScore: best.score,
    primarySignalId: best.signal.id,
    primaryEvidenceId: best.signal.evidenceId || null,
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

export function buildEvidenceCoverage(
  competencies: CompetencyBenchmark[],
  signals: ScoringSignal[]
): EvidenceCoverageItem[] {
  return competencies.map((competency) => {
    const matching = signals
      .filter((signal) => signal.skillName.trim().toLowerCase() === competency.skillName.trim().toLowerCase())
      .sort((a, b) => EVIDENCE_RANK[b.evidenceStrength] - EVIDENCE_RANK[a.evidenceStrength] || b.confidenceScore - a.confidenceScore);
    const strongest = matching[0];
    const score = calculateSkillScore(competency, matching);
    let coverage: EvidenceCoverageLabel = 'Insufficient Evidence';
    if (strongest) {
      if (score.status === 'INSUFFICIENT_EVIDENCE') coverage = 'Weak Evidence';
      else coverage = strongest.evidenceStrength === 'Strong' ? 'Strong' : 'Moderate';
    }

    return {
      skillId: competency.skillId,
      skillSlug: competency.skillSlug || normalizeToken(compentencyName(competency)),
      skillName: competency.skillName,
      expectedScore: competency.expectedScore,
      requiredLevel: competency.requiredLevel,
      coverage,
      scoreStatus: score.status,
      demonstratedScore: score.demonstratedScore,
      confidenceScore: strongest?.confidenceScore ?? null,
      evidenceStrength: strongest?.evidenceStrength ?? 'None',
      primarySignalId: score.primarySignalId,
      primaryEvidenceId: score.primaryEvidenceId,
    };
  });
}

function compentencyName(competency: CompetencyBenchmark): string {
  return competency.skillName;
}

export function selectNextCompetency(
  competencies: CompetencyBenchmark[],
  signals: ScoringSignal[]
): CompetencyBenchmark | null {
  const coverage = new Map(buildEvidenceCoverage(competencies, signals).map((item) => [item.skillId, item]));
  const candidates = competencies
    .filter((competency) => coverage.get(competency.skillId)?.scoreStatus !== 'SCORED')
    .sort((a, b) => {
      const weightA = Math.max(0, a.importanceWeight) * Math.max(0, a.employabilityWeight) * Math.max(0, a.dependencyWeight);
      const weightB = Math.max(0, b.importanceWeight) * Math.max(0, b.employabilityWeight) * Math.max(0, b.dependencyWeight);
      return weightB - weightA || a.skillName.localeCompare(b.skillName);
    });
  return candidates[0] || null;
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

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim();
}

function tokenize(value: string): Set<string> {
  return new Set(
    normalizeToken(value)
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
  const knownNormalized = normalizeToken(known);
  const requiredNormalized = normalizeToken(required);
  return (
    knownNormalized === requiredNormalized ||
    knownNormalized.includes(requiredNormalized) ||
    requiredNormalized.includes(knownNormalized) ||
    tokenOverlap(knownNormalized, requiredNormalized) >= 0.5
  );
}

export function calculateRoleDirection(profile: StudentCareerProfile, role: RoleDirectionRole): RoleDirectionResult {
  const matchedSkills = role.keySkills.filter((required) =>
    profile.technicalSkills.some((known) => skillMatches(known, required))
  );
  const aspirationText = `${profile.careerAspirations} ${profile.preferredWork} ${profile.interests.join(' ')} ${profile.enjoyedProblems}`;
  const roleDescriptor = `${role.title} ${role.category} ${role.keySkills.join(' ')}`;
  const aspirationAligned = tokenOverlap(aspirationText, roleDescriptor) > 0;
  const technicalContext = /high|strong|technical|build|engineer|code|data|system|design/i.test(
    `${profile.technicalInclination} ${profile.preferredWork} ${profile.enjoyedProblems}`
  );
  const projectEvidence = profile.projects.filter(Boolean).slice(0, 2);
  const experienceEvidence = [...profile.internships, ...profile.workExperience].filter(Boolean).slice(0, 2);

  const reasons: string[] = [];
  const supportingEvidence: string[] = [];
  if (aspirationAligned) {
    reasons.push(`Your stated interests and preferred work align with ${role.title}.`);
    supportingEvidence.push(profile.careerAspirations || profile.preferredWork);
  }
  if (matchedSkills.length > 0) {
    reasons.push(`You already report relevant exposure in ${matchedSkills.slice(0, 3).join(', ')}.`);
    supportingEvidence.push(...matchedSkills.map((skill) => `Reported skill: ${skill}`));
  }
  if (projectEvidence.length > 0) {
    reasons.push('Your project history gives Qalam concrete material to validate for this direction.');
    supportingEvidence.push(...projectEvidence);
  }
  if (experienceEvidence.length > 0) {
    reasons.push('Your internship or work history adds relevant context for this role family.');
    supportingEvidence.push(...experienceEvidence);
  }
  if (technicalContext && /engineer|developer|data|cloud|security|software|bim|cad/i.test(`${role.title} ${role.category}`)) {
    reasons.push('Your preferred problem-solving style is compatible with the technical nature of this role.');
    supportingEvidence.push(`Technical inclination: ${profile.technicalInclination}`);
  }

  const evidenceSignals = [
    aspirationAligned,
    matchedSkills.length >= Math.min(2, Math.max(1, role.keySkills.length)),
    projectEvidence.length > 0,
    experienceEvidence.length > 0,
    technicalContext,
  ].filter(Boolean).length;

  const recommendationType: RecommendationType =
    evidenceSignals >= 3 && matchedSkills.length >= Math.min(2, Math.max(1, role.keySkills.length))
      ? 'Strong Direction'
      : evidenceSignals >= 2
        ? 'Worth Exploring'
        : 'Alternative Path';

  if (reasons.length === 0) {
    reasons.push('Current discovery evidence is limited, so this is an alternative direction rather than a readiness claim.');
    supportingEvidence.push('No strong discovery evidence yet');
  }

  return {
    roleId: role.roleId,
    recommendationType,
    reasons,
    supportingEvidence: supportingEvidence.filter(Boolean).slice(0, 6),
  };
}

/**
 * @deprecated Use calculateRoleDirection. This compatibility helper must not be rendered as a match percentage.
 */
export function calculateRoleFit(profile: RoleFitProfile, role: RoleFitRole): RoleFitResult {
  const direction = calculateRoleDirection(
    {
      education: '',
      branch: profile.branch,
      academicYear: '',
      interests: [profile.careerIntent],
      technicalSkills: profile.knownSkills,
      nontechnicalStrengths: [],
      projects: [],
      internships: [],
      workExperience: [],
      preferredWork: profile.careerIntent,
      enjoyedProblems: profile.careerIntent,
      analyticalInclination: '',
      technicalInclination: '',
      communicationInclination: '',
      leadershipInclination: '',
      careerAspirations: profile.careerIntent,
    },
    role
  );
  const matchScore = direction.recommendationType === 'Strong Direction' ? 80 : direction.recommendationType === 'Worth Exploring' ? 60 : 35;
  return {
    roleId: role.roleId,
    matchScore,
    fitBand: direction.recommendationType === 'Strong Direction' ? 'Strong Fit' : direction.recommendationType === 'Worth Exploring' ? 'Exploratory Fit' : 'Stretch Fit',
    fitReasons: direction.reasons,
  };
}
