import type { PublishedCareerRoleGenome } from './careerRoleGenome';
import { clampCareerScore, type CareerSignal, type StudentCareerSignalProfile } from './careerSignals';

export type RecommendationStrength = 'EARLY_DIRECTION' | 'WORTH_EXPLORING' | 'STRONG_DIRECTION';
export type CareerRecommendationDirection = 'BEST_FIT' | 'ADJACENT_PATH' | 'ASPIRATIONAL_PATH';

export interface CareerRecommendationV2 {
  roleId: string;
  roleTitle: string;
  direction: CareerRecommendationDirection;
  fitScore: number;
  confidenceScore: number;
  supportingSignals: string[];
  contradictingSignals: string[];
  evidenceUsed: string[];
  missingEvidence: string[];
  transitionDifficulty: 'LOW' | 'MEDIUM' | 'HIGH';
  nextValidationQuestion?: string;
  explanation: string;
}

export interface CareerFitV2Result {
  role: PublishedCareerRoleGenome;
  fitScore: number;
  confidenceScore: number;
  recommendationStrength: RecommendationStrength;
  components: Record<string, number>;
  supportingSignals: string[];
  contradictingSignals: string[];
  evidenceUsed: string[];
  missingEvidence: string[];
}

function text(values: unknown[]): string {
  return values.flat().filter(Boolean).join(' ').toLowerCase();
}

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().split(/[^a-z0-9+#.]+/).filter((token) => token.length >= 2));
}

function overlap(left: string, right: string): number {
  const a = tokens(left);
  const b = tokens(right);
  if (a.size === 0 || b.size === 0) return 0;
  let hits = 0;
  for (const token of a) if (b.has(token)) hits += 1;
  return clampCareerScore((hits / Math.min(a.size, b.size)) * 100);
}

function signalText(signals: CareerSignal[]): string {
  return text(signals.map((signal) => signal.name));
}

function roleText(role: PublishedCareerRoleGenome): string {
  return text([
    role.title,
    role.category,
    role.description,
    role.domains,
    role.requiredSkills.map((skill) => skill.skill),
    role.preferredInterests,
    role.problemTypes,
    role.workStyles,
    role.environments,
    role.preferredEvidence,
    role.prerequisites,
  ]);
}

function branchFamily(branch?: string): string {
  const normalized = (branch || '').toLowerCase();
  if (/mechanical|mech/.test(normalized)) return 'mechanical';
  if (/civil/.test(normalized)) return 'civil';
  if (/ece|electronics|communication/.test(normalized)) return 'electronics';
  if (/eee|electrical/.test(normalized)) return 'electrical';
  if (/computer|software|information|it|cse|cs/.test(normalized)) return 'software';
  return normalized;
}

function difficultyBand(value: number): CareerRecommendationV2['transitionDifficulty'] {
  if (value <= 3) return 'LOW';
  if (value <= 6) return 'MEDIUM';
  return 'HIGH';
}

function confidenceBand(score: number): RecommendationStrength {
  if (score >= 70) return 'STRONG_DIRECTION';
  if (score >= 50) return 'WORTH_EXPLORING';
  return 'EARLY_DIRECTION';
}

export function calculateCareerFitV2(profile: StudentCareerSignalProfile, role: PublishedCareerRoleGenome): CareerFitV2Result {
  const descriptor = roleText(role);
  const demonstrated = text([
    profile.demonstratedSkills.map((signal) => signal.name),
    profile.projects.map((signal) => `${signal.name} ${signal.description || ''}`),
    profile.internships.map((signal) => `${signal.name} ${signal.description || ''}`),
  ]);
  const claimed = signalText(profile.claimedSkills);
  const interests = signalText(profile.interests);
  const preferences = signalText(profile.workPreferences);
  const problemStyle = signalText(profile.problemSolvingStyle);
  const branch = branchFamily(profile.branch);
  const intent = profile.explicitCareerIntent || '';

  const requiredSkillText = text(role.requiredSkills.map((skill) => skill.skill));
  const demonstratedCapability = Math.max(overlap(demonstrated, requiredSkillText), Math.round(overlap(claimed, requiredSkillText) * 0.55));
  const evidenceFit = Math.max(overlap(demonstrated, text(role.preferredEvidence)), overlap(demonstrated, descriptor));
  const interestFit = Math.max(overlap(interests, text(role.preferredInterests)), overlap(interests, descriptor));
  const workPreferenceFit = Math.max(overlap(preferences, text(role.workStyles)), overlap(preferences, text(role.environments)));
  const problemSolvingFit = overlap(problemStyle, text(role.problemTypes));
  const foundationFit = branch && descriptor.includes(branch) ? 100 : profile.willingToSwitchDomain ? 55 : 35;
  const transition = clampCareerScore(100 - role.transitionDifficulty * 8 + (profile.learningWillingness || 50) * 0.2);
  const intentFit = intent ? overlap(intent, descriptor) : 0;
  const market = clampCareerScore(role.marketDemandScore ?? 50);

  let fitScore = Math.round(
    demonstratedCapability * 0.25 +
      evidenceFit * 0.20 +
      interestFit * 0.15 +
      workPreferenceFit * 0.10 +
      problemSolvingFit * 0.10 +
      foundationFit * 0.05 +
      transition * 0.05 +
      intentFit * 0.05 +
      market * 0.05,
  );

  const dislikeText = signalText(profile.dislikedWork);
  const constraintsText = signalText(profile.constraints);
  const prerequisiteGap = role.prerequisites.filter((item) => !demonstrated.includes(item.toLowerCase()) && !claimed.includes(item.toLowerCase()));
  const contradictingSignals: string[] = [];
  if (
    overlap(dislikeText, descriptor) > 20 ||
    overlap(dislikeText, requiredSkillText) > 20 ||
    overlap(dislikeText, text(role.antiSignals)) > 20
  ) {
    fitScore -= overlap(dislikeText, text(role.antiSignals)) > 20 ? 40 : 25;
    contradictingSignals.push('Student explicitly dislikes work that overlaps this role.');
  }
  if (overlap(constraintsText, descriptor) > 20) {
    fitScore -= 40;
    contradictingSignals.push('A hard constraint conflicts with this role.');
  }
  if (prerequisiteGap.length >= 2) {
    fitScore -= 15;
    contradictingSignals.push(`Missing prerequisite evidence: ${prerequisiteGap.slice(0, 3).join(', ')}.`);
  }
  if (!profile.willingToSwitchDomain && foundationFit < 50 && role.transitionDifficulty >= 7) {
    fitScore -= 10;
    contradictingSignals.push('High transition difficulty without clear domain-switch intent.');
  }
  fitScore = clampCareerScore(fitScore);

  const evidenceCoverage = clampCareerScore(((profile.projects.length + profile.internships.length + profile.demonstratedSkills.length) / Math.max(3, role.requiredSkills.length)) * 100);
  const evidenceQuality = clampCareerScore(
    [...profile.demonstratedSkills, ...profile.projects, ...profile.internships].reduce((sum, signal) => sum + signal.confidence, 0) /
      Math.max(1, profile.demonstratedSkills.length + profile.projects.length + profile.internships.length),
    35,
  );
  const discoveryCompleteness = clampCareerScore(
    [profile.interests, profile.demonstratedSkills, profile.claimedSkills, profile.projects, profile.workPreferences, profile.problemSolvingStyle]
      .filter((items) => items.length > 0).length / 6 * 100,
  );
  const signalConsistency = contradictingSignals.length > 0 ? 45 : prerequisiteGap.length > 0 ? 65 : 80;
  const confidenceScore = clampCareerScore(evidenceCoverage * 0.40 + evidenceQuality * 0.25 + discoveryCompleteness * 0.20 + signalConsistency * 0.15);

  const supportingSignals = [
    demonstratedCapability > 0 ? 'Demonstrated or claimed skills overlap role requirements.' : '',
    evidenceFit > 0 ? 'Project or internship evidence is relevant to this direction.' : '',
    interestFit > 0 ? 'Interests align with the role domain.' : '',
    foundationFit >= 55 ? 'Academic background or switch intent keeps this path eligible.' : '',
  ].filter(Boolean);

  const evidenceUsed = [
    ...profile.demonstratedSkills.map((signal) => signal.source || signal.name),
    ...profile.projects.map((signal) => signal.source || signal.name),
    ...profile.internships.map((signal) => signal.source || signal.name),
  ].slice(0, 6);
  const missingEvidence = role.requiredSkills
    .filter((required) => !demonstrated.includes(required.skill.toLowerCase()))
    .map((required) => required.skill)
    .slice(0, 5);

  return {
    role,
    fitScore,
    confidenceScore,
    recommendationStrength: confidenceBand(confidenceScore),
    components: {
      demonstratedCapability,
      evidenceFit,
      interestFit,
      workPreferenceFit,
      problemSolvingFit,
      foundationFit,
      transition,
      intentFit,
      market,
    },
    supportingSignals,
    contradictingSignals,
    evidenceUsed,
    missingEvidence,
  };
}

export function buildCareerRecommendationsV2(results: CareerFitV2Result[]): CareerRecommendationV2[] {
  const sorted = [...results].sort((a, b) => b.fitScore - a.fitScore || b.confidenceScore - a.confidenceScore || a.role.title.localeCompare(b.role.title));
  return sorted.slice(0, 3).map((result, index) => {
    const direction: CareerRecommendationDirection =
      index === 0 ? 'BEST_FIT' : result.role.transitionDifficulty <= 5 ? 'ADJACENT_PATH' : 'ASPIRATIONAL_PATH';
    return {
      roleId: result.role.roleId,
      roleTitle: result.role.title,
      direction,
      fitScore: result.fitScore,
      confidenceScore: result.confidenceScore,
      supportingSignals: result.supportingSignals,
      contradictingSignals: result.contradictingSignals,
      evidenceUsed: result.evidenceUsed,
      missingEvidence: result.missingEvidence,
      transitionDifficulty: difficultyBand(result.role.transitionDifficulty),
      explanation: `${result.role.title} is a ${direction.toLowerCase().replace('_', ' ')} based on the current evidence. The fit is strongest where your signals overlap the role requirements; missing evidence should be validated before treating it as final.`,
    };
  });
}
