import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { canAccessAuditSession } from '../src/server/auditAuthorization';

const ownerId = '11111111-1111-1111-1111-111111111111';
const otherUserId = '22222222-2222-2222-2222-222222222222';

test('audit endpoint authorization permits the authenticated audit owner', () => {
  assert.equal(canAccessAuditSession({
    sessionUserId: ownerId,
    authenticatedUserId: ownerId,
    isService: false,
  }), true);
});

test('audit endpoint authorization rejects a cross-user request', () => {
  assert.equal(canAccessAuditSession({
    sessionUserId: ownerId,
    authenticatedUserId: otherUserId,
    isService: false,
  }), false);
});

test('audit endpoint authorization fails closed when a non-service caller has no user', () => {
  assert.equal(canAccessAuditSession({
    sessionUserId: ownerId,
    authenticatedUserId: null,
    isService: false,
  }), false);
});

test('audit endpoint authorization permits a verified service caller', () => {
  assert.equal(canAccessAuditSession({
    sessionUserId: ownerId,
    authenticatedUserId: null,
    isService: true,
  }), true);
});

function sourceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `missing route marker: ${start}`);
  assert.notEqual(endIndex, -1, `missing next route marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test('finalize, report, and handoff routes authenticate before reading persisted audit output', () => {
  const serverSource = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.match(
    serverSource,
    /error\.message === 'SUPABASE_NOT_CONFIGURED'[\s\S]*?503, 'DATABASE_UNAVAILABLE'/,
    'missing Supabase configuration must fail explicitly instead of returning synthetic output'
  );
  const routes = [
    {
      source: sourceBetween(serverSource, "app.post('/api/audit/:auditId/finalize'", "app.post('/api/qalam/evaluate'"),
      persistenceCall: 'finalizeCareerAudit(supabase, auditId)',
    },
    {
      source: sourceBetween(serverSource, "app.get('/api/audit/:auditId/report'", "app.get('/api/audit/:auditId/roadmap-handoff'"),
      persistenceCall: 'getPersistedReport(supabase, auditId)',
    },
    {
      source: sourceBetween(serverSource, "app.get('/api/audit/:auditId/roadmap-handoff'", "app.get('/api/pricing'"),
      persistenceCall: 'getPersistedHandoff(supabase, auditId)',
    },
  ];

  for (const route of routes) {
    assert.equal(route.source.includes('devAuditSessions'), false, 'sensitive audit output route must not use an unauthenticated dev fallback');
    const authIndex = route.source.indexOf('authenticateRequest(req)');
    const persistenceIndex = route.source.indexOf(route.persistenceCall);
    assert.ok(authIndex >= 0, 'route must authenticate the request');
    assert.ok(persistenceIndex > authIndex, 'route must authenticate before reading or generating audit output');
  }
});

test('re-audit UI cannot reuse an audit or synthesize readiness scores client-side', () => {
  const modalSource = readFileSync(new URL('../src/components/audit/ReAuditModal.tsx', import.meta.url), 'utf8');
  assert.equal(modalSource.includes('/api/qalam/evaluate'), false);
  assert.equal(modalSource.includes('calculatedScore'), false);
  assert.match(modalSource, /Re-audit is temporarily unavailable/);
  assert.match(modalSource, /<button\s+disabled/);
});
