export interface CareerRoleGenome {
  roleId: string;
  title: string;
  domains: string[];
  requiredSkills: Array<{
    skill: string;
    weight: number;
    minimumLevel?: number;
  }>;
  preferredInterests: string[];
  problemTypes: string[];
  workStyles: string[];
  environments: string[];
  preferredEvidence: string[];
  prerequisites: string[];
  antiSignals: string[];
  adjacentRoleIds: string[];
  transitionDifficulty: number;
  marketDemandScore?: number;
}

export interface PublishedCareerRoleGenome extends CareerRoleGenome {
  category?: string;
  description?: string;
  demandLevel?: string;
  streamId?: string;
  status: 'published';
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function requiredSkills(value: unknown): CareerRoleGenome['requiredSkills'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return { skill: item, weight: 0.5 };
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const skill = String(record.skill || '').trim();
      if (!skill) return null;
      const rawWeight = Number(record.weight);
      const minimumLevel = record.minimumLevel == null ? undefined : Math.max(0, Math.min(100, Math.round(Number(record.minimumLevel))));
      return {
        skill,
        weight: Number.isFinite(rawWeight) ? Math.max(0, Math.min(1, rawWeight)) : 0.5,
        ...(minimumLevel == null || Number.isNaN(minimumLevel) ? {} : { minimumLevel }),
      };
    })
    .filter((item): item is CareerRoleGenome['requiredSkills'][number] => Boolean(item));
}

export function normalizeCareerRoleGenome(value: unknown): CareerRoleGenome | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const roleId = String(record.roleId || record.role_id || '').trim();
  const title = String(record.title || '').trim();
  if (!roleId || !title) return null;
  return {
    roleId,
    title,
    domains: stringArray(record.domains),
    requiredSkills: requiredSkills(record.requiredSkills || record.required_skills),
    preferredInterests: stringArray(record.preferredInterests || record.preferred_interests),
    problemTypes: stringArray(record.problemTypes || record.problem_types),
    workStyles: stringArray(record.workStyles || record.work_styles),
    environments: stringArray(record.environments),
    preferredEvidence: stringArray(record.preferredEvidence || record.preferred_evidence),
    prerequisites: stringArray(record.prerequisites),
    antiSignals: stringArray(record.antiSignals || record.anti_signals),
    adjacentRoleIds: stringArray(record.adjacentRoleIds || record.adjacent_role_ids),
    transitionDifficulty: Math.max(1, Math.min(10, Math.round(Number(record.transitionDifficulty || record.transition_difficulty || 5)))),
    marketDemandScore: record.marketDemandScore == null && record.market_demand_score == null
      ? undefined
      : Math.max(0, Math.min(100, Math.round(Number(record.marketDemandScore ?? record.market_demand_score)))),
  };
}
