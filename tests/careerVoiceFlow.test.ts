import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_AUDIT_ID_KEY,
  FLOW_CHECKPOINT_KEY,
  PHONE_KEY,
  STUDENT_ID_KEY,
  buildVerifiedIdentity,
  clearCareerVoiceAuditId,
  readCareerVoiceCheckpoint,
  resolveInitialCheckpoint,
  writeCareerVoiceCheckpoint,
} from '../src/domain/careerVoiceFlow';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

test('OTP success checkpoint restores to ASK_NAME instead of WELCOME after reload', () => {
  const storage = new MemoryStorage();
  const identity = buildVerifiedIdentity('dev_user_919100886544', '+919100886544', {
    anonymousId: 'anon_1',
    sessionId: 'session_1',
  });
  writeCareerVoiceCheckpoint(storage, {
    authenticated: true,
    identity,
    onboardingCheckpoint: 'ASK_NAME',
    activeAuditId: null,
    updatedAt: new Date().toISOString(),
    flowGeneration: 3,
  });

  const checkpoint = resolveInitialCheckpoint({
    checkpoint: readCareerVoiceCheckpoint(storage),
    storedStudentId: storage.getItem(STUDENT_ID_KEY),
    storedPhone: storage.getItem(PHONE_KEY),
    storedAuditId: storage.getItem(ACTIVE_AUDIT_ID_KEY),
    urlAuditId: null,
    guestSessionId: 'guest',
  });

  assert.equal(checkpoint.authenticated, true);
  assert.equal(checkpoint.identity?.studentId, 'dev_user_919100886544');
  assert.equal(checkpoint.onboardingCheckpoint, 'ASK_NAME');
});

test('legacy verified identity without audit recovers deterministically to ASK_NAME', () => {
  const storage = new MemoryStorage();
  storage.setItem(STUDENT_ID_KEY, 'dev_user_919100886544');
  storage.setItem(PHONE_KEY, '+919100886544');

  const checkpoint = resolveInitialCheckpoint({
    checkpoint: null,
    storedStudentId: storage.getItem(STUDENT_ID_KEY),
    storedPhone: storage.getItem(PHONE_KEY),
    storedAuditId: null,
    urlAuditId: null,
    guestSessionId: 'guest_legacy',
  });

  assert.equal(checkpoint.authenticated, true);
  assert.equal(checkpoint.onboardingCheckpoint, 'ASK_NAME');
  assert.equal(checkpoint.identity?.anonymousId, 'guest_legacy');
});

test('dev audit expiry can clear stale audit id while preserving authenticated checkpoint', () => {
  const storage = new MemoryStorage();
  const identity = buildVerifiedIdentity('dev_user_919100886544', '+919100886544');
  writeCareerVoiceCheckpoint(storage, {
    authenticated: true,
    identity,
    onboardingCheckpoint: 'CAREER_DISCOVERY',
    activeAuditId: 'dev_audit_expired',
    updatedAt: new Date().toISOString(),
    flowGeneration: 8,
  });
  storage.setItem(ACTIVE_AUDIT_ID_KEY, 'dev_audit_expired');

  const nextUrl = clearCareerVoiceAuditId(storage, 'https://example.test/?auditId=dev_audit_expired');
  const checkpoint = resolveInitialCheckpoint({
    checkpoint: {
      ...readCareerVoiceCheckpoint(storage)!,
      activeAuditId: null,
    },
    storedStudentId: storage.getItem(STUDENT_ID_KEY),
    storedPhone: storage.getItem(PHONE_KEY),
    storedAuditId: storage.getItem(ACTIVE_AUDIT_ID_KEY),
    urlAuditId: null,
    guestSessionId: 'guest',
  });

  assert.equal(storage.getItem(ACTIVE_AUDIT_ID_KEY), null);
  assert.equal(nextUrl, 'https://example.test/');
  assert.equal(checkpoint.identity?.studentId, 'dev_user_919100886544');
  assert.equal(checkpoint.onboardingCheckpoint, 'CAREER_DISCOVERY');
});

test('invalid checkpoint data does not override a valid legacy student identity', () => {
  const storage = new MemoryStorage();
  storage.setItem(FLOW_CHECKPOINT_KEY, JSON.stringify({ authenticated: true, onboardingCheckpoint: 'PHONE' }));
  storage.setItem(STUDENT_ID_KEY, 'student_1');
  storage.setItem(PHONE_KEY, '+919999999999');

  const checkpoint = resolveInitialCheckpoint({
    checkpoint: readCareerVoiceCheckpoint(storage),
    storedStudentId: storage.getItem(STUDENT_ID_KEY),
    storedPhone: storage.getItem(PHONE_KEY),
    storedAuditId: null,
    urlAuditId: null,
    guestSessionId: 'guest',
  });

  assert.equal(checkpoint.authenticated, true);
  assert.equal(checkpoint.onboardingCheckpoint, 'ASK_NAME');
  assert.equal(checkpoint.identity?.studentId, 'student_1');
});
