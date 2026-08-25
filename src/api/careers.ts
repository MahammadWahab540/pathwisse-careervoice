import { api } from './client';
import type {
  CareerStreamDto,
  CareerRoleDto,
  RoleRecommendationDto,
  RoleCompetencyDto,
} from '../types/career';

export interface RecommendationInput {
  careerStreamId?: string;
  careerIntent?: string;
  branch?: string;
  knownSkills?: string[];
  studentId?: string;
  academicYear?: string | number;
  discoveryProfile?: Record<string, unknown>;
}

export async function getCareerStreams(): Promise<CareerStreamDto[]> {
  return api.get<CareerStreamDto[]>('/api/streams');
}

export async function getCareerRoles(streamId?: string): Promise<CareerRoleDto[]> {
  const url = streamId ? `/api/roles?streamId=${encodeURIComponent(streamId)}` : '/api/roles';
  return api.get<CareerRoleDto[]>(url);
}

export async function getRoleDetail(roleId: string): Promise<CareerRoleDto> {
  return api.get<CareerRoleDto>(`/api/roles/${encodeURIComponent(roleId)}`);
}

export async function getRoleRecommendations(input: RecommendationInput): Promise<RoleRecommendationDto[]> {
  return api.post<RoleRecommendationDto[]>('/api/roles/recommendations', input);
}

export async function getRoleCompetencies(roleId: string): Promise<RoleCompetencyDto> {
  return api.get<RoleCompetencyDto>(`/api/catalog/competency/${encodeURIComponent(roleId)}`);
}
