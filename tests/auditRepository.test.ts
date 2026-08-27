import test from 'node:test';
import assert from 'node:assert/strict';
import { persistTranscriptLog } from '../src/server/auditRepository';

function createInsertCapture() {
  const calls: Array<Record<string, unknown>> = [];
  const supabase = {
    from(table: string) {
      assert.equal(table, 'career_voice_transcript_logs');
      return {
        insert(payload: Record<string, unknown>) {
          calls.push(payload);
          return {
            select(columns: string) {
              assert.equal(columns, 'id');
              return {
                single() {
                  return Promise.resolve({ data: { id: 'log-id' }, error: null });
                },
              };
            },
          };
        },
      };
    },
  };
  return { supabase: supabase as any, calls };
}

test('transcript log persists non-UUID identities as external user ids', async () => {
  const { supabase, calls } = createInsertCapture();

  const id = await persistTranscriptLog(supabase, {
    flow: 'audit',
    eventType: 'audit_chat_turn',
    studentId: 'whatsapp_user_919100886544',
    phone: '+919100886544',
    auditId: 'dev_audit_123',
    actor: 'user',
    content: 'I completed a voice answer.',
    inputMode: 'voice',
    clientMessageId: 'client-1',
  });

  assert.equal(id, 'log-id');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].user_id, null);
  assert.equal(calls[0].external_user_id, 'whatsapp_user_919100886544');
  assert.equal(calls[0].phone, '+919100886544');
  assert.equal(calls[0].audit_session_id, null);
  assert.equal(calls[0].audit_session_ref, 'dev_audit_123');
  assert.equal(calls[0].content, 'I completed a voice answer.');
});

test('transcript log persists UUID identities on canonical user id fields', async () => {
  const { supabase, calls } = createInsertCapture();
  const studentId = 'c01afcf5-22a5-49f2-9fe0-2a739bbfaec4';
  const auditId = '57f2df69-32c4-4204-8311-3e369c9261b9';

  await persistTranscriptLog(supabase, {
    flow: 'audit',
    eventType: 'audit_chat_turn',
    studentId,
    auditId,
    actor: 'assistant',
    content: 'Tell me one concrete example.',
  });

  assert.equal(calls[0].user_id, studentId);
  assert.equal(calls[0].external_user_id, null);
  assert.equal(calls[0].audit_session_id, auditId);
  assert.equal(calls[0].audit_session_ref, auditId);
});

test('transcript log skips rows with no user, external identity, or phone', async () => {
  const { supabase, calls } = createInsertCapture();

  const id = await persistTranscriptLog(supabase, {
    flow: 'discovery',
    eventType: 'discovery_answer',
    actor: 'user',
    content: 'I like backend engineering.',
  });

  assert.equal(id, null);
  assert.equal(calls.length, 0);
});
