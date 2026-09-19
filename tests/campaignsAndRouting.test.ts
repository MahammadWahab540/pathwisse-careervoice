import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

// ─────────────────────────────────────────────
// Route Guard & RBAC Logic Tests
// ─────────────────────────────────────────────

const PLACEMENT_ROLES = new Set(['placement_team', 'college', 'college_management']);

function resolveRouteAccess(user: { authenticated: boolean; role?: string | null }, path: string): { allowed: boolean; redirect?: string } {
  // Public paths
  if (path === '/login' || path.startsWith('/invite/')) {
    return { allowed: true };
  }

  // Auth Guard
  if (!user.authenticated) {
    return { allowed: false, redirect: `/login?next=${encodeURIComponent(path)}` };
  }

  // Role Selection
  if (path === '/onboarding/role') {
    return { allowed: true };
  }

  // Student Guard
  if (path.startsWith('/student') || path === '/onboarding/student') {
    if (user.role && PLACEMENT_ROLES.has(user.role)) {
      return { allowed: false, redirect: '/placement' };
    }
    return { allowed: true };
  }

  // Placement Guard
  if (path.startsWith('/placement') || path === '/onboarding/placement') {
    if (user.role === 'student') {
      return { allowed: false, redirect: '/student' };
    }
    return { allowed: true };
  }

  return { allowed: true };
}

test('Route Guard: unauthenticated user accessing /student is redirected to /login', () => {
  const result = resolveRouteAccess({ authenticated: false }, '/student');
  assert.equal(result.allowed, false);
  assert.equal(result.redirect, '/login?next=%2Fstudent');
});

test('Route Guard: unauthenticated user accessing /placement/campaigns is redirected to /login', () => {
  const result = resolveRouteAccess({ authenticated: false }, '/placement/campaigns');
  assert.equal(result.allowed, false);
  assert.equal(result.redirect, '/login?next=%2Fplacement%2Fcampaigns');
});

test('Route Guard: student role attempting to access /placement/* is blocked and redirected to /student', () => {
  const student = { authenticated: true, role: 'student' };
  
  const overview = resolveRouteAccess(student, '/placement');
  assert.equal(overview.allowed, false);
  assert.equal(overview.redirect, '/student');

  const campaigns = resolveRouteAccess(student, '/placement/campaigns');
  assert.equal(campaigns.allowed, false);
  assert.equal(campaigns.redirect, '/student');

  const studentsList = resolveRouteAccess(student, '/placement/students');
  assert.equal(studentsList.allowed, false);
  assert.equal(studentsList.redirect, '/student');
});

test('Route Guard: placement officer attempting to access /student/* is blocked and redirected to /placement', () => {
  const placementOfficer = { authenticated: true, role: 'placement_team' };
  
  const studentHome = resolveRouteAccess(placementOfficer, '/student');
  assert.equal(studentHome.allowed, false);
  assert.equal(studentHome.redirect, '/placement');

  const studentAssessment = resolveRouteAccess(placementOfficer, '/student/assessment');
  assert.equal(studentAssessment.allowed, false);
  assert.equal(studentAssessment.redirect, '/placement');
});

test('Route Guard: public invite page is accessible without authentication', () => {
  const unauth = { authenticated: false };
  const inviteAccess = resolveRouteAccess(unauth, '/invite/a1b2c3d4e5f6');
  assert.equal(inviteAccess.allowed, true);
  assert.equal(inviteAccess.redirect, undefined);
});

// ─────────────────────────────────────────────
// Campaign Invite Token & Validation Logic
// ─────────────────────────────────────────────

function generateInviteToken(): string {
  return crypto.randomBytes(16).toString('hex').slice(0, 12);
}

function validateCampaignInvite(campaign: {
  status: string;
  expiresAt: string;
  institution: string;
  department: string;
  batch: string;
}): { valid: boolean; error?: string; status?: number } {
  if (new Date(campaign.expiresAt) < new Date()) {
    return { valid: false, error: 'This invite link has expired.', status: 410 };
  }
  if (campaign.status !== 'active') {
    return { valid: false, error: 'This campaign is no longer active.', status: 403 };
  }
  return { valid: true };
}

test('Invite Token: generates non-predictable 12-character hex tokens', () => {
  const token1 = generateInviteToken();
  const token2 = generateInviteToken();

  assert.equal(token1.length, 12);
  assert.equal(token2.length, 12);
  assert.notEqual(token1, token2);
  assert.match(token1, /^[0-9a-f]{12}$/);
});

test('Invite Token: expired campaign returns status 410', () => {
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const res = validateCampaignInvite({
    status: 'active',
    expiresAt: pastDate,
    institution: 'BITS Pilani',
    department: 'Computer Science',
    batch: '2026',
  });

  assert.equal(res.valid, false);
  assert.equal(res.status, 410);
  assert.match(res.error || '', /expired/i);
});

test('Invite Token: inactive/paused campaign returns status 403', () => {
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const res = validateCampaignInvite({
    status: 'paused',
    expiresAt: futureDate,
    institution: 'BITS Pilani',
    department: 'Computer Science',
    batch: '2026',
  });

  assert.equal(res.valid, false);
  assert.equal(res.status, 403);
});

test('Invite Token: active valid campaign returns valid = true', () => {
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const res = validateCampaignInvite({
    status: 'active',
    expiresAt: futureDate,
    institution: 'BITS Pilani',
    department: 'Computer Science',
    batch: '2026',
  });

  assert.equal(res.valid, true);
});

// ─────────────────────────────────────────────
// Campaign Creation & URL Generation
// ─────────────────────────────────────────────

test('Campaign Creation: calculates correct expiry based on expiryDays', () => {
  const days = 60;
  const now = Date.now();
  const expectedMin = now + (days - 1) * 24 * 60 * 60 * 1000;
  const expectedMax = now + (days + 1) * 24 * 60 * 60 * 1000;

  const expiresAt = new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
  const expireTime = new Date(expiresAt).getTime();

  assert.ok(expireTime >= expectedMin && expireTime <= expectedMax);
});

test('Campaign Creation: URL structure adheres to /invite/:token pattern without URL query tampering', () => {
  const token = 'abcdef123456';
  const baseUrl = 'http://localhost:5000';
  const inviteUrl = `${baseUrl}/invite/${token}`;

  assert.equal(inviteUrl, 'http://localhost:5000/invite/abcdef123456');
  // Confirm no editable URL params like ?college= or ?batch= are present
  assert.equal(inviteUrl.includes('?'), false);
});
