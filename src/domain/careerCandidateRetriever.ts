import type { PublishedCareerRoleGenome } from './careerRoleGenome';
import type { StudentCareerSignalProfile } from './careerSignals';

function textOf(values: unknown[]): string {
  return values.flat().filter(Boolean).join(' ').toLowerCase();
}

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().split(/[^a-z0-9+#.]+/).filter((token) => token.length >= 2));
}

function overlapScore(left: string, right: string): number {
  const a = tokens(left);
  const b = tokens(right);
  if (a.size === 0 || b.size === 0) return 0;
  let hits = 0;
  for (const token of a) if (b.has(token)) hits += 1;
  return Math.min(100, Math.round((hits / Math.min(a.size, b.size)) * 100));
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

function hasExplicitSwitchIntent(profile: StudentCareerSignalProfile): boolean {
  const intent = (profile.explicitCareerIntent || '').toLowerCase();
  if (profile.willingToSwitchDomain === true && /software|data|developer|coding|programming|it|ai|ml|cloud|cyber/.test(intent)) return true;
  return /(switch|shift|move|change|transition|become|pursue|want|interested).*(software|data|developer|coding|programming|it|ai|ml|cloud|cyber)/.test(intent);
}

function genomeText(role: PublishedCareerRoleGenome): string {
  return textOf([
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
  ]);
}

export function retrieveCareerCandidates(
  profile: StudentCareerSignalProfile,
  roles: PublishedCareerRoleGenome[],
  options: { min?: number; max?: number } = {},
): PublishedCareerRoleGenome[] {
  const min = Math.max(1, options.min ?? 8);
  const max = Math.max(min, options.max ?? 15);
  const profileText = textOf([
    profile.branch,
    profile.explicitCareerIntent,
    profile.interests.map((signal) => signal.name),
    profile.demonstratedSkills.map((signal) => signal.name),
    profile.claimedSkills.map((signal) => signal.name),
    profile.projects.map((signal) => `${signal.name} ${signal.description || ''}`),
    profile.internships.map((signal) => `${signal.name} ${signal.description || ''}`),
    profile.workPreferences.map((signal) => signal.name),
    profile.problemSolvingStyle.map((signal) => signal.name),
  ]);
  const family = branchFamily(profile.branch);
  const intent = (profile.explicitCareerIntent || '').toLowerCase();
  const explicitSwitchIntent = hasExplicitSwitchIntent(profile);

  const scored = roles
    .filter((role) => role.status === 'published')
    .map((role) => {
      const text = genomeText(role);
      const routeType = role.branchAffinity?.routeType;
      const affinityScore = role.branchAffinity?.affinityScore;
      const branchRelevance = affinityScore != null
        ? affinityScore * 0.30
        : family && text.includes(family) ? 28 : 0;
      const intentRelevance = intent ? overlapScore(intent, text) * 0.35 : 0;
      const signalRelevance = overlapScore(profileText, text) * 0.45;
      const isCrossTrack = routeType === 'cross_track' || (family && !text.includes(family) && /software|data|cloud|frontend|backend|developer|ml|ai|cyber/.test(text));
      const switchPenalty = isCrossTrack && !explicitSwitchIntent ? -26 : 0;
      const switchBoost = isCrossTrack && explicitSwitchIntent ? 12 : 0;
      return { role, score: branchRelevance + intentRelevance + signalRelevance + switchPenalty + switchBoost };
    })
    .sort((a, b) => b.score - a.score || a.role.title.localeCompare(b.role.title));

  const selected: PublishedCareerRoleGenome[] = [];
  const domainCounts = new Map<string, number>();
  for (const item of scored) {
    const domainKey = item.role.domains[0] || item.role.category || 'general';
    if ((domainCounts.get(domainKey) || 0) >= 3 && selected.length >= min) continue;
    selected.push(item.role);
    domainCounts.set(domainKey, (domainCounts.get(domainKey) || 0) + 1);
    if (selected.length >= max) break;
  }
  return selected;
}
