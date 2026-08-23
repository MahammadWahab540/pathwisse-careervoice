import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createAuditSession, getAuditSession, finalizeAudit, type CreateAuditSessionInput } from '../api/audit';
import { getAuditReport } from '../api/reports';
import { getRoadmapHandoff } from '../api/roadmap';
import type { AuditSessionDto } from '../types/audit';
import type { CareerAuditReportDto } from '../types/report';
import type { CareerAuditRoadmapHandoffDto } from '../types/roadmap';

export function useAuditSession(auditId?: string | null) {
  return useQuery<AuditSessionDto, Error>({
    queryKey: ['audit-session', auditId],
    queryFn: () => getAuditSession(auditId!),
    enabled: Boolean(auditId),
    staleTime: 30 * 1000,
    retry: 2,
  });
}

export function useCreateAuditSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAuditSessionInput) => createAuditSession(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['audit-session', data.auditId] });
    },
  });
}

export function useFinalizeAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (auditId: string) => finalizeAudit(auditId),
    onSuccess: (data) => {
      queryClient.setQueryData(['audit-report', data.auditId], data);
      queryClient.invalidateQueries({ queryKey: ['audit-session', data.auditId] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-handoff', data.auditId] });
    },
  });
}

export function useAuditReport(auditId?: string | null) {
  return useQuery<CareerAuditReportDto, Error>({
    queryKey: ['audit-report', auditId],
    queryFn: () => getAuditReport(auditId!),
    enabled: Boolean(auditId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRoadmapHandoff(auditId?: string | null) {
  return useQuery<CareerAuditRoadmapHandoffDto, Error>({
    queryKey: ['roadmap-handoff', auditId],
    queryFn: () => getRoadmapHandoff(auditId!),
    enabled: Boolean(auditId),
    staleTime: 5 * 60 * 1000,
  });
}
