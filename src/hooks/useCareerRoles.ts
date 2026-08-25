import { useQuery } from '@tanstack/react-query';
import { getCareerRoles, getRoleDetail, getRoleRecommendations, getRoleCompetencies, type RecommendationInput } from '../api/careers';
import type { CareerRoleDto, RoleRecommendationDto, RoleCompetencyDto } from '../types/career';

export function useCareerRoles(streamId?: string) {
  return useQuery<CareerRoleDto[], Error>({
    queryKey: ['career-roles', streamId || 'all'],
    queryFn: () => getCareerRoles(streamId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRoleDetail(roleId?: string) {
  return useQuery<CareerRoleDto, Error>({
    queryKey: ['career-role', roleId],
    queryFn: () => getRoleDetail(roleId!),
    enabled: Boolean(roleId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRoleRecommendations(input: RecommendationInput, enabled = true) {
  return useQuery<RoleRecommendationDto[], Error>({
    queryKey: [
      'role-recommendations',
      input.studentId,
      input.careerStreamId,
      input.careerIntent,
      input.branch,
      input.academicYear,
      input.knownSkills,
      input.discoveryProfile,
    ],
    queryFn: () => getRoleRecommendations(input),
    enabled: enabled && Boolean(input.careerStreamId || input.careerIntent),
    staleTime: 2 * 60 * 1000,
  });
}

export function useRoleCompetencies(roleId?: string) {
  return useQuery<RoleCompetencyDto, Error>({
    queryKey: ['role-competencies', roleId],
    queryFn: () => getRoleCompetencies(roleId!),
    enabled: Boolean(roleId),
    staleTime: 5 * 60 * 1000,
  });
}
