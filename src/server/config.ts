import dotenv from 'dotenv';

dotenv.config({ override: true, quiet: true });

export interface ServerEnvironment {
  [key: string]: string | undefined;
}

export interface ServerConfig {
  geminiApiKey?: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  pipecatServiceUrl?: string;
  careervoiceServiceToken?: string;
  geminiChatModel: string;
  geminiEvaluationModel: string;
  geminiLiveModel: string;
  enableGeminiLive: boolean;
  geminiConfigured: boolean;
  supabaseConfigured: boolean;
  pipecatConfigured: boolean;
  publicHealth: {
    status: 'ok' | 'degraded';
    geminiConfigured: boolean;
    supabaseConfigured: boolean;
    pipecatConfigured: boolean;
    evaluationEngine: 'gemini-http';
    voiceEngine: string;
    geminiLiveExperimental: boolean;
    geminiChatModel: string;
    geminiEvaluationModel: string;
  };
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildServerConfig(env: ServerEnvironment = process.env): ServerConfig {
  const geminiApiKey = clean(env.GEMINI_API_KEY);
  const supabaseUrl = clean(env.SUPABASE_URL);
  const supabaseServiceRoleKey = clean(env.SUPABASE_SERVICE_ROLE_KEY);
  const pipecatServiceUrl = clean(env.PIPECAT_SERVICE_URL) || 'https://7pmmmiwq7m.ap-south-1.awsapprunner.com';
  const careervoiceServiceToken = clean(env.CAREERVOICE_SERVICE_TOKEN);
  const geminiChatModel = clean(env.GEMINI_CHAT_MODEL) || 'gemini-3.6-flash';
  const geminiEvaluationModel = clean(env.GEMINI_EVALUATION_MODEL) || 'gemini-3.6-flash';
  const geminiLiveModel = clean(env.GEMINI_LIVE_MODEL) || 'gemini-3.1-flash-live-preview';
  const enableGeminiLive = clean(env.ENABLE_GEMINI_LIVE)?.toLowerCase() === 'true';
  const geminiConfigured = Boolean(geminiApiKey);
  const supabaseConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);
  const pipecatConfigured = Boolean(pipecatServiceUrl && careervoiceServiceToken);

  return {
    geminiApiKey,
    supabaseUrl,
    supabaseServiceRoleKey,
    pipecatServiceUrl,
    careervoiceServiceToken,
    geminiChatModel,
    geminiEvaluationModel,
    geminiLiveModel,
    enableGeminiLive,
    geminiConfigured,
    supabaseConfigured,
    pipecatConfigured,
    publicHealth: {
      status: geminiConfigured && supabaseConfigured ? 'ok' : 'degraded',
      geminiConfigured,
      supabaseConfigured,
      pipecatConfigured,
      evaluationEngine: 'gemini-http',
      voiceEngine: pipecatConfigured ? 'pipecat-daily-webrtc' : 'browser-speech',
      geminiLiveExperimental: enableGeminiLive,
      geminiChatModel,
      geminiEvaluationModel,
    },
  };
}

export const serverConfig = buildServerConfig();
