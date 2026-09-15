import assert from 'node:assert/strict';
import test from 'node:test';
import { isAccountRole, normalizeDepartment, shareLinkIsUsable } from '../domain/institutionOnboarding';
import { normalizeExpiry, scopedDepartment } from './institutionRoutes';

test('CV-102 only accepts supported account roles', () => {
  assert.equal(isAccountRole('student'), true);
  assert.equal(isAccountRole('placement_team'), true);
  assert.equal(isAccountRole('college_management'), true);
  assert.equal(isAccountRole('admin'), false);
});

test('CV-103 normalizes institution department input', () => {
  assert.equal(normalizeDepartment('  Computer Science  '), 'Computer Science');
  assert.equal(normalizeDepartment(''), null);
});

test('CV-104 rejects revoked and expired share links', () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  const past = new Date(Date.now() - 60_000).toISOString();
  assert.equal(shareLinkIsUsable({ status: 'active', expires_at: future }), true);
  assert.equal(shareLinkIsUsable({ status: 'revoked', expires_at: future }), false);
  assert.equal(shareLinkIsUsable({ status: 'active', expires_at: past }), false);
});

test('CV-104 expiry validation is deterministic and rejects non-future values', () => {
  const now = Date.parse('2026-09-15T14:00:00.000Z');
  assert.equal(normalizeExpiry(null, now), null);
  assert.equal(normalizeExpiry('2026-09-15T15:00:00.000Z', now), '2026-09-15T15:00:00.000Z');
  assert.throws(() => normalizeExpiry('not-a-date', now), /INVALID_EXPIRY/);
  assert.throws(() => normalizeExpiry('2026-09-15T14:00:00.000Z', now), /INVALID_EXPIRY/);
  assert.throws(() => normalizeExpiry('2026-09-15T13:59:59.999Z', now), /INVALID_EXPIRY/);
});

test('CV-104 department-scoped members cannot cross department boundaries', () => {
  assert.equal(scopedDepartment(undefined, 'CSE'), 'CSE');
  assert.equal(scopedDepartment(' CSE ', 'CSE'), 'CSE');
  assert.equal(scopedDepartment('ECE', null), 'ECE');
  assert.throws(() => scopedDepartment('ECE', 'CSE'), /DEPARTMENT_SCOPE_VIOLATION/);
});

test('CV-105 analytics contract must stay aggregate-first', () => {
  const allowed = ['totalSessions','completedSessions','completionRate','readinessDistribution','recentSessions'];
  assert.equal(allowed.includes('studentPhone'), false);
  assert.equal(allowed.includes('studentEmail'), false);
});
