import assert from 'node:assert/strict';
import test from 'node:test';
import { assertInstitutionRole, isAccountRole, normalizeDepartment, shareLinkIsUsable } from './institutionOnboarding';

test('account roles reject arbitrary values', () => {
  assert.equal(isAccountRole('student'), true);
  assert.equal(isAccountRole('placement_team'), true);
  assert.equal(isAccountRole('admin'), false);
});

test('institution role rejects student', () => {
  assert.throws(() => assertInstitutionRole('student'), /INSTITUTION_ROLE_REQUIRED/);
  assert.doesNotThrow(() => assertInstitutionRole('college_management'));
});

test('department normalization is optional and bounded', () => {
  assert.equal(normalizeDepartment('  Computer   Science '), 'Computer Science');
  assert.equal(normalizeDepartment(''), null);
  assert.throws(() => normalizeDepartment('x'.repeat(121)), /INVALID_DEPARTMENT/);
});

test('share links enforce lifecycle and expiry', () => {
  const now = new Date('2026-09-15T09:00:00Z');
  assert.equal(shareLinkIsUsable({ status: 'active' }, now), true);
  assert.equal(shareLinkIsUsable({ status: 'revoked' }, now), false);
  assert.equal(shareLinkIsUsable({ status: 'active', expires_at: '2026-09-15T08:59:00Z' }, now), false);
  assert.equal(shareLinkIsUsable({ status: 'active', expires_at: '2026-09-15T09:01:00Z' }, now), true);
});
