export interface AuditAccessContext {
  sessionUserId: string;
  authenticatedUserId: string | null;
  isService: boolean;
}

/**
 * Service-to-service callers are trusted after their bearer token is verified.
 * Every user-session caller must own the requested audit session.
 */
export function canAccessAuditSession(input: AuditAccessContext): boolean {
  if (input.isService) return true;
  return Boolean(input.authenticatedUserId && input.authenticatedUserId === input.sessionUserId);
}
