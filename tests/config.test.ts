import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReadinessHealth, buildServerConfig } from '../src/server/config';

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
  assert.equal(config.metaWhatsappOtpConfigured, false);
  assert.equal('supabaseServiceRoleKey' in config.publicHealth, false);
  assert.equal('geminiApiKey' in config.publicHealth, false);
});

test('readiness health reports missing critical dependencies without secrets', () => {
  const ready = buildReadinessHealth(buildServerConfig({
    GEMINI_API_KEY: 'gemini-key',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  }));
  assert.equal(ready.status, 'ready');
  assert.equal(ready.checks.supabase.configured, true);
  assert.equal(ready.checks.ai.configured, true);
  assert.equal(JSON.stringify(ready).includes('service-role'), false);

  const missing = buildReadinessHealth(buildServerConfig({}));
  assert.equal(missing.status, 'not_ready');
  assert.equal(missing.checks.supabase.configured, false);
  assert.equal(missing.checks.ai.configured, false);
});

test('Meta WhatsApp OTP accepts Voice and DEV-style env names', () => {
  const voiceConfig = buildServerConfig({
    SEND_SMS_HOOK_SECRET: 'v1,whsec_secret',
    META_WHATSAPP_ACCESS_TOKEN: 'meta-token',
    META_WHATSAPP_PHONE_NUMBER_ID: 'phone-id',
    META_WHATSAPP_WABA_ID: 'waba-id',
    META_WHATSAPP_TEMPLATE_NAME: 'pathwisse_verification_code',
  });

  const devStyleConfig = buildServerConfig({
    SEND_SMS_HOOK_SECRET: 'v1,whsec_secret',
    META_WA_ACCESS_TOKEN: 'meta-token',
    META_WA_PHONE_NUMBER_ID: 'phone-id',
    META_WA_BUSINESS_ACCOUNT_ID: 'waba-id',
    META_WA_AUTH_TEMPLATE: 'pathwisse_verification_code',
  });

  assert.equal(voiceConfig.metaWhatsappOtpConfigured, true);
  assert.equal(voiceConfig.publicHealth.metaWhatsappOtpConfigured, true);
  assert.equal(devStyleConfig.metaWhatsappOtpConfigured, true);
});

test('Pipecat config uses production App Runner defaults and token alias', () => {
  const canonical = buildServerConfig({ PIPECAT_SERVICE_TOKEN: 'voice-token' });
  const legacy = buildServerConfig({ CAREERVOICE_SERVICE_TOKEN: 'legacy-token' });

  assert.equal(canonical.pipecatServiceUrl, 'https://7pmmmiwq7m.ap-south-1.awsapprunner.com');
  assert.equal(canonical.pipecatServiceToken, 'voice-token');
  assert.equal(canonical.pipecatConfigured, true);
  assert.equal(canonical.publicHealth.voiceEngine, 'browser-speech');
  assert.equal(legacy.pipecatServiceToken, 'legacy-token');
  assert.equal(legacy.pipecatConfigured, true);
});

test('OpenRouter model configuration is exposed server-side only', () => {
  const config = buildServerConfig({
    OPENROUTER_API_KEY: 'or-key',
    OPENROUTER_LLM_MODEL: 'openrouter/auto,deepseek/deepseek-chat',
    OPENROUTER_TTS_MODEL: 'fish-audio/s2.1-pro',
    OPENROUTER_STT_MODEL: 'openai/gpt-4o-mini-transcribe',
  });

  assert.equal(config.openrouterApiKey, 'or-key');
  assert.equal(config.openrouterLlmModel, 'openrouter/auto,deepseek/deepseek-chat');
  assert.equal(config.openrouterTtsModel, 'fish-audio/s2.1-pro');
  assert.equal(config.openrouterSttModel, 'openai/gpt-4o-mini-transcribe');
  assert.equal(config.publicHealth.evaluationEngine, 'openrouter-http');
  assert.equal(config.publicHealth.voiceEngine, 'openrouter-turn-based');
  assert.equal('openrouterApiKey' in config.publicHealth, false);
});

test('OTP test bypass is explicit allowlist only', () => {
  const config = buildServerConfig({
    OTP_TEST_PHONE_ALLOWLIST: '+919876543210, +15551234567',
    OTP_TEST_CODE: '123456',
  });

  assert.deepEqual(config.otpTestPhoneAllowlist, ['+919876543210', '+15551234567']);
  assert.equal(config.otpTestCode, '123456');
});
