import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServerConfig } from '../src/server/config';

test('server config centralizes production Gemini models', () => {
  const config = buildServerConfig({
    GEMINI_API_KEY: 'gemini-key',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  });

  assert.equal(config.geminiChatModel, 'gemini-3.6-flash');
  assert.equal(config.geminiEvaluationModel, 'gemini-3.6-flash');
  assert.equal(config.geminiLiveModel, 'gemini-3.1-flash-live-preview');
  assert.equal(config.enableGeminiLive, false);
});

test('Gemini Live is opt-in only', () => {
  const config = buildServerConfig({ ENABLE_GEMINI_LIVE: 'true' });
  assert.equal(config.enableGeminiLive, true);
});

test('health flags reflect required server secrets without exposing them', () => {
  const config = buildServerConfig({
    GEMINI_API_KEY: 'gemini-key',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  });

  assert.equal(config.geminiConfigured, true);
  assert.equal(config.supabaseConfigured, true);
  assert.equal('supabaseServiceRoleKey' in config.publicHealth, false);
  assert.equal('geminiApiKey' in config.publicHealth, false);
});
