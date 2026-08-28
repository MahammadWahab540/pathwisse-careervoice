import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticatedFetch, ApiClientError } from '../src/api/client';
import { persistSkillSignal, PersistenceError } from '../src/server/auditRepository';
import type { SupabaseClient } from '@supabase/supabase-js';

test('authenticatedFetch throws ApiClientError with AUTH_SESSION_MISSING when no session token exists', async () => {
  // Clear any existing stored token
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('careervoice_supabase_access_token');
  }

  await assert.rejects(
    () => authenticatedFetch('http://localhost:5000/api/audit/evidence/signal', { method: 'POST', body: '{}' }),
    (err: unknown) => {
      assert(err instanceof ApiClientError);
      assert.equal(err.code, 'AUTH_SESSION_MISSING');
      assert.equal(err.status, 401);
      return true;
    }
  );
});

test('authenticatedFetch attaches Bearer token when token is available', async () => {
  let capturedUrl = '';
  let capturedHeaders: Record<string, string> = {};

  const originalFetch = globalThis.fetch;
  const dummyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy.token';

  const { getBrowserSupabase } = await import('../src/lib/supabaseBrowser');
  const client = getBrowserSupabase();
  const originalGetSession = client.auth.getSession.bind(client.auth);
  client.auth.getSession = (async () => ({
    data: { session: { access_token: dummyToken } as any },
    error: null,
  })) as any;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    const headers = new Headers(init?.headers);
    capturedHeaders = {
      authorization: headers.get('authorization') || '',
      contentType: headers.get('content-type') || '',
    };
    return new Response(JSON.stringify({ success: true, signalId: 'sig_123', evidenceId: 'ev_123' }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;

  try {
    const response = await authenticatedFetch('http://localhost:5000/api/audit/evidence/signal', {
      method: 'POST',
      body: JSON.stringify({
        auditId: '11111111-1111-1111-1111-111111111111',
        skillName: 'Python',
        extractedLevel: 'Intermediate',
        confidenceScore: 85,
        evidenceStrength: 'Strong',
        rawAnswerSnippet: 'I wrote Python scripts.',
        source: 'voice_probe',
      }),
    });

    assert.equal(response.status, 201);
    assert.equal(capturedUrl, 'http://localhost:5000/api/audit/evidence/signal');
    assert.equal(capturedHeaders.authorization, `Bearer ${dummyToken}`);
    assert.equal(capturedHeaders.contentType, 'application/json');
  } finally {
    globalThis.fetch = originalFetch;
    client.auth.getSession = originalGetSession;
  }
});

test('backend persistence rejects cross-user signal submission when token user does not own audit session', async () => {
  const auditSessionOwner = '11111111-1111-1111-1111-111111111111';
  const requestingUser = '22222222-2222-2222-2222-222222222222';

  const mockSupabase = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: '33333333-3333-3333-3333-333333333333',
              user_id: auditSessionOwner,
              target_role_id: '44444444-4444-4444-4444-444444444444',
              status: 'in_progress',
            },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    () =>
      persistSkillSignal(mockSupabase, {
        auditId: '33333333-3333-3333-3333-333333333333',
        studentId: requestingUser,
        skillName: 'TypeScript',
        extractedLevel: 'Advanced',
        confidenceScore: 90,
        evidenceStrength: 'Strong',
        rawAnswerSnippet: 'I build TS projects.',
        source: 'voice_probe',
      }),
    (err: unknown) => {
      assert(err instanceof PersistenceError);
      assert.equal(err.operation, 'skill_signal_authorization');
      return true;
    }
  );
});
