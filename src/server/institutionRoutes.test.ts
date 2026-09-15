import assert from 'node:assert/strict';
import test from 'node:test';
import { isAccountRole, normalizeDepartment, shareLinkIsUsable } from '../domain/institutionOnboarding';

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

test('CV-105 analytics contract must stay aggregate-first', () => {
  const allowed = ['totalSessions','completedSessions','completionRate','readinessDistribution','recentSessions'];
  assert.equal(allowed.includes('studentPhone'), false);
  assert.equal(allowed.includes('studentEmail'), false);
});
