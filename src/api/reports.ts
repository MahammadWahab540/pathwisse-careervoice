import { api } from './client';
import type { CareerAuditReportDto } from '../types/report';

export async function getAuditReport(auditId: string): Promise<CareerAuditReportDto> {
  return api.get<CareerAuditReportDto>(`/api/audit/${encodeURIComponent(auditId)}/report`);
}
