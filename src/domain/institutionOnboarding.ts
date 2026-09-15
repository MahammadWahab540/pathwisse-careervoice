export const ACCOUNT_ROLES = ['student', 'placement_team', 'college_management'] as const;
export type AccountRole = typeof ACCOUNT_ROLES[number];

export function isAccountRole(value: unknown): value is AccountRole {
  return typeof value === 'string' && ACCOUNT_ROLES.includes(value as AccountRole);
}

export function normalizeDepartment(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new Error('INVALID_DEPARTMENT');
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > 120) throw new Error('INVALID_DEPARTMENT');
  return normalized;
}

export function assertInstitutionRole(role: AccountRole): asserts role is Exclude<AccountRole, 'student'> {
  if (role === 'student') throw new Error('INSTITUTION_ROLE_REQUIRED');
}

export function shareLinkIsUsable(link: { status: string; expires_at?: string | null }, now = new Date()): boolean {
  if (link.status !== 'active') return false;
  return !link.expires_at || new Date(link.expires_at).getTime() > now.getTime();
}
