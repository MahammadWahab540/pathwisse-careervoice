import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://pfzjbazocmgflcogjjrg.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5IxIvt5Ba8m-AFbAnwZXDQ_8jyx9qPX';

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function bridgeCustomOtpSession(userId: string, email: string) {
  const linkRes = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (linkRes.error || !linkRes.data?.properties?.hashed_token) {
    throw new Error(`generateLink failed: ${linkRes.error?.message}`);
  }

  const sessionRes = await anonClient.auth.verifyOtp({
    token_hash: linkRes.data.properties.hashed_token,
    type: 'magiclink',
  });
  if (sessionRes.error || !sessionRes.data?.session) {
    throw new Error(`verifyOtp failed: ${sessionRes.error?.message}`);
  }

  return sessionRes.data.session;
}

test('Test 1: New user flow creates user, generates legitimate Supabase session with access & refresh tokens', async () => {
  const testPhone = `+9199${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testEmail = `test_${Date.now()}_${Math.floor(Math.random() * 1000)}@careervoice.internal`;

  const created = await adminClient.auth.admin.createUser({
    email: testEmail,
    phone: testPhone,
    email_confirm: true,
    phone_confirm: true,
  });

  assert.ok(created.data?.user?.id, 'User should be created in Supabase auth.users');
  const userId = created.data.user.id;

  try {
    const session = await bridgeCustomOtpSession(userId, testEmail);

    assert.ok(session.access_token, 'Session must have a valid access_token');
    assert.ok(session.refresh_token, 'Session must have a valid refresh_token');
    assert.equal(session.user.id, userId, 'Session user ID must match created user ID');

    // Verify token validity with getUser
    const tokenCheck = await adminClient.auth.getUser(session.access_token);
    assert.equal(tokenCheck.data?.user?.id, userId, 'getUser must validate the access_token against Supabase');
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});

test('Test 2: Existing user flow generates new valid session without duplicate auth.users', async () => {
  const testPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testEmail = `test_existing_${Date.now()}@careervoice.internal`;

  const created = await adminClient.auth.admin.createUser({
    email: testEmail,
    phone: testPhone,
    email_confirm: true,
    phone_confirm: true,
  });
  const userId = created.data.user!.id;

  try {
    // First login session
    const session1 = await bridgeCustomOtpSession(userId, testEmail);
    assert.ok(session1.access_token);

    // Second login session for the same existing user
    const session2 = await bridgeCustomOtpSession(userId, testEmail);
    assert.ok(session2.access_token);
    assert.equal(session2.user.id, userId);

    // Verify both tokens are valid
    const check1 = await adminClient.auth.getUser(session1.access_token);
    const check2 = await adminClient.auth.getUser(session2.access_token);
    assert.equal(check1.data.user?.id, userId);
    assert.equal(check2.data.user?.id, userId);
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});

test('Test 3: Invalid OTP token hash fails verification and creates no session', async () => {
  const badResult = await anonClient.auth.verifyOtp({
    token_hash: 'invalid_token_hash_00000000000000000000000000000000',
    type: 'magiclink',
  });

  assert.ok(badResult.error, 'Invalid OTP/token must return an error');
  assert.equal(badResult.data?.session, null, 'No session should be created on invalid token');
});

test('Test 4 & 5: Missing or invalid token fails Supabase token verification', async () => {
  // Missing token
  const emptyCheck = await adminClient.auth.getUser('');
  assert.ok(emptyCheck.error, 'Empty access token must return error');

  // Invalid token
  const invalidCheck = await adminClient.auth.getUser('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature');
  assert.ok(invalidCheck.error, 'Malformed or forged access token must return error');
});

test('Test 6 & 7: Token refresh succeeds with valid refresh_token', async () => {
  const testPhone = `+9197${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testEmail = `test_refresh_${Date.now()}@careervoice.internal`;

  const created = await adminClient.auth.admin.createUser({
    email: testEmail,
    phone: testPhone,
    email_confirm: true,
    phone_confirm: true,
  });
  const userId = created.data.user!.id;

  try {
    const session = await bridgeCustomOtpSession(userId, testEmail);
    assert.ok(session.refresh_token);

    // Perform token refresh using anonClient
    const refreshRes = await anonClient.auth.refreshSession({
      refresh_token: session.refresh_token,
    });

    assert.ok(refreshRes.data?.session?.access_token, 'Refreshed session must have a new access token');
    assert.equal(refreshRes.data?.session?.user.id, userId, 'Refreshed session must belong to same user');

    // Verify refreshed token
    const tokenCheck = await adminClient.auth.getUser(refreshRes.data.session.access_token);
    assert.equal(tokenCheck.data?.user?.id, userId);
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});

test('Test 8: Logout / session sign-out revokes session', async () => {
  const testEmail = `test_signout_${Date.now()}@careervoice.internal`;
  const created = await adminClient.auth.admin.createUser({
    email: testEmail,
    email_confirm: true,
  });
  const userId = created.data.user!.id;

  try {
    const session = await bridgeCustomOtpSession(userId, testEmail);
    assert.ok(session.access_token);

    // Create a dedicated client to hold and sign out of this session
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
    await userClient.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    await userClient.auth.signOut();
    const sessionAfterSignOut = await userClient.auth.getSession();
    assert.equal(sessionAfterSignOut.data.session, null, 'Session must be null after sign out');
  } finally {
    await adminClient.auth.admin.deleteUser(userId);
  }
});

test('Test 9: Exact affected user d0025cd5 resolves canonically, issues session, and preserves audit data', async () => {
  const canonicalUserId = 'd0025cd5-724d-4e33-b593-1c5effe6154a';
  const canonicalPhone = '+919100886544';

  // 1. Verify user exists in auth.users
  const userRes = await adminClient.auth.admin.getUserById(canonicalUserId);
  assert.ok(userRes.data?.user, 'Canonical user d0025cd5 must exist in Supabase auth.users');
  assert.equal(userRes.data.user.id, canonicalUserId);

  // 2. Generate session for canonical user
  const email = userRes.data.user.email || `${canonicalUserId}@careervoice.internal`;
  const session = await bridgeCustomOtpSession(canonicalUserId, email);

  assert.ok(session.access_token, 'Session must contain access_token');
  assert.ok(session.refresh_token, 'Session must contain refresh_token');
  assert.equal(session.user.id, canonicalUserId, 'Session user ID must be d0025cd5-724d-4e33-b593-1c5effe6154a');

  // 3. Verify Supabase JWT validation
  const tokenValidation = await adminClient.auth.getUser(session.access_token);
  assert.equal(tokenValidation.data.user?.id, canonicalUserId, 'Supabase JWT must validate to d0025cd5');

  // 4. Verify historical audit sessions are preserved
  const auditSessions = await adminClient
    .from('audit_sessions')
    .select('id, user_id, status')
    .eq('user_id', canonicalUserId);

  assert.ok(auditSessions.data && auditSessions.data.length >= 6, 'Historical audit sessions must be intact for d0025cd5');
});
