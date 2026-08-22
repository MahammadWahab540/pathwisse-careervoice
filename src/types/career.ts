export interface CareerStreamDto {
  id: string;
  databaseId?: string;
  title: string;
  description: string;
  iconName?: string;
}

export interface CareerRoleDto {
  id: string;
  streamId: string;
  slug?: string;
  title: string;
  category: string;
  description: string;
  demandLevel: 'High' | 'Extremely High' | 'Moderate';
  keySkills: string[];
  status?: 'published' | 'draft';
  fitReason?: string;
  matchType?: 'Strong match' | 'Worth exploring' | 'Alternative path';
}

export interface RoleRecommendationDto extends CareerRoleDto {
  matchScore: number;
  fitBand: 'Strong Fit' | 'Good Fit' | 'Exploratory Fit' | 'Stretch Fit';
  fitReasons: string[];
}

export interface CompetencyBenchmarkDto {
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
}

export interface RoleCompetencyDto {
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
  coreCompetencies: CompetencyBenchmarkDto[];
}

export interface RoleComparisonDto {
  roles: RoleRecommendationDto[];
  comparisonMetrics: Array<{
    dimension: string;
    description: string;
    scores: Record<string, string | number>;
  }>;
}
