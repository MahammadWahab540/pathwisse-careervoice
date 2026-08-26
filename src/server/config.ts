import dotenv from 'dotenv';

dotenv.config({ override: true, quiet: true });

export interface ServerEnvironment {
  [key: string]: string | undefined;
}

export interface ServerConfig {
  geminiApiKey?: string;
  openrouterApiKey?: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  pipecatServiceUrl?: string;
  pipecatServiceToken?: string;
  careervoiceServiceToken?: string;
  metaWhatsappAccessToken?: string;
  metaWhatsappPhoneNumberId?: string;
  metaWhatsappTemplateName?: string;
  metaWhatsappTemplateLanguage: string;
  metaGraphApiVersion: string;
  openrouterLlmModel: string;
  openrouterTtsModel: string;
  openrouterSttModel: string;
  otpTestCode: string;
  otpTestPhoneAllowlist: string[];
  metaWhatsappOtpConfigured: boolean;
  geminiChatModel: string;
  geminiEvaluationModel: string;
  geminiLiveModel: string;
  enableGeminiLive: boolean;
  geminiConfigured: boolean;
  openrouterConfigured: boolean;
  supabaseConfigured: boolean;
  pipecatConfigured: boolean;
  publicHealth: {
    status: 'ok' | 'degraded';
    geminiConfigured: boolean;
    openrouterConfigured: boolean;
    supabaseConfigured: boolean;
    metaWhatsappOtpConfigured: boolean;
    pipecatConfigured: boolean;
    evaluationEngine: 'openrouter-http' | 'gemini-http' | 'unconfigured';
    voiceEngine: string;
    geminiLiveExperimental: boolean;
    geminiChatModel: string;
    geminiEvaluationModel: string;
    openrouterLlmModel: string;
  };
}

export interface ReadinessHealth {
  status: 'ready' | 'not_ready';
  checks: {
    supabase: { configured: boolean };
    ai: { configured: boolean; provider: 'gemini' | 'openrouter' | 'none' };
    voice: { configured: boolean; engine: string };
    whatsappOtp: { configured: boolean };
  };
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildServerConfig(env: ServerEnvironment = process.env): ServerConfig {
  const geminiApiKey = clean(env.GEMINI_API_KEY);
  const openrouterApiKey = clean(env.OPENROUTER_API_KEY);
  const supabaseUrl = clean(env.SUPABASE_URL);
  const supabaseServiceRoleKey = clean(env.SUPABASE_SERVICE_ROLE_KEY);
  const pipecatServiceUrl = clean(env.PIPECAT_SERVICE_URL) || 'https://7pmmmiwq7m.ap-south-1.awsapprunner.com';
  const pipecatServiceToken = clean(env.PIPECAT_SERVICE_TOKEN) || clean(env.CAREERVOICE_SERVICE_TOKEN);
  const careervoiceServiceToken = pipecatServiceToken;
  const metaWhatsappAccessToken = clean(env.META_WHATSAPP_ACCESS_TOKEN) || clean(env.META_WA_ACCESS_TOKEN);
  const metaWhatsappPhoneNumberId = clean(env.META_WHATSAPP_PHONE_NUMBER_ID) || clean(env.META_WA_PHONE_NUMBER_ID);
  const metaWhatsappTemplateName = clean(env.META_WHATSAPP_TEMPLATE_NAME) || clean(env.META_WA_AUTH_TEMPLATE);
  const metaWhatsappTemplateLanguage = clean(env.META_WHATSAPP_TEMPLATE_LANGUAGE) || 'en_US';
  const metaGraphApiVersion = clean(env.META_GRAPH_API_VERSION) || 'v21.0';
  const openrouterLlmModel = clean(env.OPENROUTER_LLM_MODEL) || 'openrouter/auto,deepseek/deepseek-chat';
  const openrouterTtsModel = clean(env.OPENROUTER_TTS_MODEL) || 'fish-audio/s2.1-pro';
  const openrouterSttModel = clean(env.OPENROUTER_STT_MODEL) || 'openai/gpt-4o-mini-transcribe';
  const otpTestCode = clean(env.OTP_TEST_CODE) || '123456';
  const otpTestPhoneAllowlist = (clean(env.OTP_TEST_PHONE_ALLOWLIST) || '')
    .split(',')
    .map((phone) => phone.trim())
    .filter(Boolean);
  const geminiChatModel = clean(env.GEMINI_CHAT_MODEL) || 'gemini-3.6-flash';
  const geminiEvaluationModel = clean(env.GEMINI_EVALUATION_MODEL) || 'gemini-3.6-flash';
  const geminiLiveModel = clean(env.GEMINI_LIVE_MODEL) || 'gemini-3.1-flash-live-preview';
  const enableGeminiLive = clean(env.ENABLE_GEMINI_LIVE)?.toLowerCase() === 'true';
  const geminiConfigured = Boolean(geminiApiKey);
  const openrouterConfigured = Boolean(openrouterApiKey);
  const supabaseConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);
  const pipecatConfigured = Boolean(pipecatServiceUrl && pipecatServiceToken);
  const metaWhatsappOtpConfigured = Boolean(
    metaWhatsappAccessToken &&
    metaWhatsappPhoneNumberId &&
    metaWhatsappTemplateName
  );

  return {
    geminiApiKey,
    openrouterApiKey,
    supabaseUrl,
    supabaseServiceRoleKey,
    pipecatServiceUrl,
    pipecatServiceToken,
    careervoiceServiceToken,
    metaWhatsappAccessToken,
    metaWhatsappPhoneNumberId,
    metaWhatsappTemplateName,
    metaWhatsappTemplateLanguage,
    metaGraphApiVersion,
    openrouterLlmModel,
    openrouterTtsModel,
    openrouterSttModel,
    otpTestCode,
    otpTestPhoneAllowlist,
    metaWhatsappOtpConfigured,
    geminiChatModel,
    geminiEvaluationModel,
    geminiLiveModel,
    enableGeminiLive,
    geminiConfigured,
    openrouterConfigured,
    supabaseConfigured,
    pipecatConfigured,
    publicHealth: {
      status: (openrouterConfigured || geminiConfigured) && supabaseConfigured ? 'ok' : 'degraded',
      geminiConfigured,
      openrouterConfigured,
      supabaseConfigured,
      metaWhatsappOtpConfigured,
      pipecatConfigured,
      evaluationEngine: openrouterConfigured ? 'openrouter-http' : geminiConfigured ? 'gemini-http' : 'unconfigured',
      voiceEngine: openrouterConfigured ? 'openrouter-turn-based' : 'browser-speech',
      geminiLiveExperimental: enableGeminiLive,
      geminiChatModel,
      geminiEvaluationModel,
      openrouterLlmModel,
    },
  };
}

export function buildReadinessHealth(config: ServerConfig): ReadinessHealth {
  const aiProvider = config.geminiConfigured ? 'gemini' : config.openrouterConfigured ? 'openrouter' : 'none';
  const aiConfigured = aiProvider !== 'none';
  const ready = config.supabaseConfigured && aiConfigured;

  return {
    status: ready ? 'ready' : 'not_ready',
    checks: {
      supabase: { configured: config.supabaseConfigured },
      ai: { configured: aiConfigured, provider: aiProvider },
      voice: { configured: config.openrouterConfigured || config.pipecatConfigured, engine: config.publicHealth.voiceEngine },
      whatsappOtp: { configured: config.metaWhatsappOtpConfigured },
    },
  };
}

export const serverConfig = buildServerConfig();
