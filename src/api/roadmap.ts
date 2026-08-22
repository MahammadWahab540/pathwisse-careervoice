import { api } from './client';
import type { CareerAuditRoadmapHandoffDto } from '../types/roadmap';

export async function getRoadmapHandoff(auditId: string): Promise<CareerAuditRoadmapHandoffDto> {
  return api.get<CareerAuditRoadmapHandoffDto>(`/api/audit/${encodeURIComponent(auditId)}/roadmap-handoff`);
}
