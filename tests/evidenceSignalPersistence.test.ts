import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { persistSkillSignal, PersistenceError } from '../src/server/auditRepository';
import type { SkillSignalInput } from '../src/domain/careerAudit';

function verifyServiceToken(providedHeader: string | undefined, expectedToken: string | undefined): boolean {
  if (!expectedToken) return true;
  if (!providedHeader || !providedHeader.startsWith('Bearer ')) return false;
  const provided = providedHeader.slice(7).trim();
  if (!provided) return false;
  const h1 = crypto.createHash('sha256').update(expectedToken).digest();
  const h2 = crypto.createHash('sha256').update(provided).digest();
  return crypto.timingSafeEqual(h1, h2);
}

test('service token validation is timing-safe and validates bearer headers', () => {
  const secret = 'super-secret-production-token-12345';
  
  // Valid bearer token
  assert.equal(verifyServiceToken(`Bearer ${secret}`, secret), true);
  
  // Invalid bearer token
  assert.equal(verifyServiceToken('Bearer wrong-token', secret), false);
  
  // Malformed header
  assert.equal(verifyServiceToken('Basic 12345', secret), false);
  assert.equal(verifyServiceToken('', secret), false);
  assert.equal(verifyServiceToken(undefined, secret), false);
  
  // Dev mode (no expected token configured)
  assert.equal(verifyServiceToken(undefined, undefined), true);
  assert.equal(verifyServiceToken('Bearer anything', undefined), true);
});

test('persistSkillSignal validates session ownership and rejects cross-user attempts', async () => {
  const mockSession = {
    id: 'audit-123',
    user_id: 'user-actual-owner',
    target_role_id: 'role-backend',
    status: 'created',
    context: {},
  };

  const mockSupabase = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockSession, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  const crossUserInput: SkillSignalInput = {
    auditId: 'audit-123',
    studentId: 'attacker-user-id',
    skillName: 'React',
    extractedLevel: 'Advanced',
    confidenceScore: 90,
    evidenceStrength: 'Strong',
    rawAnswerSnippet: 'I built React apps.',
    source: 'voice_probe',
  };

  await assert.rejects(
    () => persistSkillSignal(mockSupabase, crossUserInput),
    (err: unknown) => {
      assert(err instanceof PersistenceError);
      assert.equal(err.operation, 'skill_signal_authorization');
      return true;
    }
  );
});

test('persistSkillSignal creates both evidence and skill signal for Strong evidence', async () => {
  const mockSession = {
    id: 'audit-123',
    user_id: 'user-actual-owner',
    target_role_id: 'role-backend',
    status: 'created',
    context: {},
  };

  let insertedEvidence: any = null;
  let insertedSignal: any = null;

  const mockSupabase = {
    from: (table: string) => ({
      select: (fields?: string) => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockSession, error: null }),
        }),
      }),
      insert: (payload: any) => {
        if (table === 'audit_evidence') {
          insertedEvidence = payload;
          return {
            select: () => ({
              single: async () => ({ data: { id: 'evidence-uuid-1' }, error: null }),
            }),
          };
        }
        if (table === 'audit_skill_signals') {
          insertedSignal = payload;
          return {
            select: () => ({
              single: async () => ({ data: { id: 'signal-uuid-1' }, error: null }),
            }),
          };
        }
        return {};
      },
      update: () => ({
        eq: async () => ({ data: null, error: null }),
      }),
    }),
  } as unknown as SupabaseClient;

  const strongInput: SkillSignalInput = {
    auditId: 'audit-123',
    studentId: 'user-actual-owner',
    skillName: 'Node.js',
    extractedLevel: 'Advanced',
    confidenceScore: 92,
    evidenceStrength: 'Strong',
    rawAnswerSnippet: 'Implemented worker threads and cluster mode in Node.js.',
    source: 'voice_probe',
  };

  const result = await persistSkillSignal(mockSupabase, strongInput);

  assert.equal(result.evidenceId, 'evidence-uuid-1');
  assert.equal(result.signalId, 'signal-uuid-1');
  assert.equal(insertedEvidence?.evidence_strength, 'Strong');
  assert.equal(insertedEvidence?.status, 'verified');
  assert.equal(insertedSignal?.skill_name, 'Node.js');
  assert.equal(insertedSignal?.evidence_id, 'evidence-uuid-1');
});

test('persistSkillSignal does NOT create demonstrated skill signal for Weak/None evidence', async () => {
  const mockSession = {
    id: 'audit-123',
    user_id: 'user-actual-owner',
    target_role_id: 'role-backend',
    status: 'created',
    context: {},
  };

  let insertedEvidence: any = null;
  let insertedSignal: any = null;

  const mockSupabase = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockSession, error: null }),
        }),
      }),
      insert: (payload: any) => {
        if (table === 'audit_evidence') {
          insertedEvidence = payload;
          return {
            select: () => ({
              single: async () => ({ data: { id: 'evidence-weak-1' }, error: null }),
            }),
          };
        }
        if (table === 'audit_skill_signals') {
          insertedSignal = payload;
          return {
            select: () => ({
              single: async () => ({ data: { id: 'signal-unexpected' }, error: null }),
            }),
          };
        }
        return {};
      },
      update: () => ({
        eq: async () => ({ data: null, error: null }),
      }),
    }),
  } as unknown as SupabaseClient;

  const weakInput: SkillSignalInput = {
    auditId: 'audit-123',
    studentId: 'user-actual-owner',
    skillName: 'Kubernetes',
    extractedLevel: 'Foundational',
    confidenceScore: 30,
    evidenceStrength: 'Weak',
    rawAnswerSnippet: 'I heard about Kubernetes in college.',
    source: 'voice_probe',
  };

  const result = await persistSkillSignal(mockSupabase, weakInput);

  assert.equal(result.evidenceId, 'evidence-weak-1');
  assert.equal(result.signalId, null);
  assert.equal(insertedSignal, null, 'No row must be inserted into audit_skill_signals for Weak evidence');
  assert.equal(insertedEvidence?.evidence_strength, 'Weak');
  assert.equal(insertedEvidence?.status, 'insufficient');
});

test('persistSkillSignal handles duplicate idempotencyKey gracefully without duplicate insertion', async () => {
  const mockSession = {
    id: 'audit-123',
    user_id: 'user-actual-owner',
    target_role_id: 'role-backend',
    status: 'created',
    context: {},
  };

  const mockSupabase = {
    from: (table: string) => {
      if (table === 'audit_sessions') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: mockSession, error: null }),
            }),
          }),
        };
      }
      if (table === 'audit_skill_signals') {
        return {
          select: () => ({
            eq: (field: string, val: string) => ({
              maybeSingle: async () => {
                if (field === 'idempotency_key' && val === 'idempotency-key-dup') {
                  return { data: { id: 'existing-signal-id', evidence_id: 'existing-evidence-id' }, error: null };
                }
                return { data: null, error: null };
              },
            }),
          }),
        };
      }
      return {};
    },
  } as unknown as SupabaseClient;

  const input: SkillSignalInput = {
    auditId: 'audit-123',
    studentId: 'user-actual-owner',
    skillName: 'PostgreSQL',
    extractedLevel: 'Advanced',
    confidenceScore: 88,
    evidenceStrength: 'Strong',
    rawAnswerSnippet: 'Optimized indexed queries.',
    source: 'voice_probe',
    idempotencyKey: 'idempotency-key-dup',
  };

  const result = await persistSkillSignal(mockSupabase, input);

  assert.equal(result.signalId, 'existing-signal-id');
  assert.equal(result.evidenceId, 'existing-evidence-id');
});
