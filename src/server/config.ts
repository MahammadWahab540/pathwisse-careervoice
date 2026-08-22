export interface ServerEnvironment {
  [key: string]: string | undefined;
}

export interface ServerConfig {
  geminiApiKey?: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  geminiChatModel: string;
  geminiEvaluationModel: string;
  geminiLiveModel: string;
  enableGeminiLive: boolean;
  geminiConfigured: boolean;
  supabaseConfigured: boolean;
  publicHealth: {
    status: 'ok' | 'degraded';
    geminiConfigured: boolean;
    supabaseConfigured: boolean;
    evaluationEngine: 'gemini-http';
    voiceEngine: 'browser-speech';
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
  const geminiChatModel = clean(env.GEMINI_CHAT_MODEL) || 'gemini-3.6-flash';
  const geminiEvaluationModel = clean(env.GEMINI_EVALUATION_MODEL) || 'gemini-3.6-flash';
  const geminiLiveModel = clean(env.GEMINI_LIVE_MODEL) || 'gemini-3.1-flash-live-preview';
  const enableGeminiLive = clean(env.ENABLE_GEMINI_LIVE)?.toLowerCase() === 'true';
  const geminiConfigured = Boolean(geminiApiKey);
  const supabaseConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

  return {
    geminiApiKey,
    supabaseUrl,
    supabaseServiceRoleKey,
    geminiChatModel,
    geminiEvaluationModel,
    geminiLiveModel,
    enableGeminiLive,
    geminiConfigured,
    supabaseConfigured,
    publicHealth: {
      status: geminiConfigured && supabaseConfigured ? 'ok' : 'degraded',
      geminiConfigured,
      supabaseConfigured,
      evaluationEngine: 'gemini-http',
      voiceEngine: 'browser-speech',
      geminiLiveExperimental: enableGeminiLive,
      geminiChatModel,
      geminiEvaluationModel,
    },
  };
}

export const serverConfig = buildServerConfig();
