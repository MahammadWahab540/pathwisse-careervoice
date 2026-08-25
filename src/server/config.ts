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
  careervoiceServiceToken?: string;
  geminiChatModel: string;
  geminiEvaluationModel: string;
  geminiLiveModel: string;
  openrouterLlmModel: string;
  openrouterTtsModel: string;
  openrouterSttModel: string;
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
    pipecatConfigured: boolean;
    evaluationEngine: 'gemini-http' | 'openrouter-http';
    voiceEngine: string;
    geminiLiveExperimental: boolean;
    geminiChatModel: string;
    geminiEvaluationModel: string;
    openrouterLlmModel: string;
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
  const careervoiceServiceToken = clean(env.CAREERVOICE_SERVICE_TOKEN);
  const geminiChatModel = clean(env.GEMINI_CHAT_MODEL) || 'gemini-3.6-flash';
  const geminiEvaluationModel = clean(env.GEMINI_EVALUATION_MODEL) || 'gemini-3.6-flash';
  const geminiLiveModel = clean(env.GEMINI_LIVE_MODEL) || 'gemini-3.1-flash-live-preview';
  const openrouterLlmModel = clean(env.OPENROUTER_LLM_MODEL) || 'openai/gpt-4o-mini';
  const openrouterTtsModel = clean(env.OPENROUTER_TTS_MODEL) || 'openai/gpt-4o-mini-tts-2025-12-15';
  const openrouterSttModel = clean(env.OPENROUTER_STT_MODEL) || 'openai/whisper-large-v3';
  const enableGeminiLive = clean(env.ENABLE_GEMINI_LIVE)?.toLowerCase() === 'true';
  const geminiConfigured = Boolean(geminiApiKey);
  const openrouterConfigured = Boolean(openrouterApiKey);
  const supabaseConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);
  const pipecatConfigured = Boolean(pipecatServiceUrl && careervoiceServiceToken);

  return {
    geminiApiKey,
    openrouterApiKey,
    supabaseUrl,
    supabaseServiceRoleKey,
    pipecatServiceUrl,
    careervoiceServiceToken,
    geminiChatModel,
    geminiEvaluationModel,
    geminiLiveModel,
    openrouterLlmModel,
    openrouterTtsModel,
    openrouterSttModel,
    enableGeminiLive,
    geminiConfigured,
    openrouterConfigured,
    supabaseConfigured,
    pipecatConfigured,
    publicHealth: {
      status: (geminiConfigured || openrouterConfigured) && supabaseConfigured ? 'ok' : 'degraded',
      geminiConfigured,
      openrouterConfigured,
      supabaseConfigured,
      pipecatConfigured,
      evaluationEngine: openrouterConfigured ? 'openrouter-http' : 'gemini-http',
      voiceEngine: pipecatConfigured ? 'pipecat-daily-webrtc' : 'browser-speech',
      geminiLiveExperimental: enableGeminiLive,
      geminiChatModel,
      geminiEvaluationModel,
      openrouterLlmModel,
    },
  };
}

export const serverConfig = buildServerConfig();
