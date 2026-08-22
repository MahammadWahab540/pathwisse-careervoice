import { GoogleGenAI } from '@google/genai';
import { serverConfig } from './config';

let geminiClient: GoogleGenAI | null = null;

export class AiUnavailableError extends Error {
  readonly code = 'AI_UNAVAILABLE';

  constructor(message = 'Career audit AI is temporarily unavailable.') {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

export class AiResponseValidationError extends Error {
  readonly code = 'AI_RESPONSE_INVALID';

  constructor(message: string) {
    super(message);
    this.name = 'AiResponseValidationError';
  }
}

export function getGeminiClient(): GoogleGenAI | null {
  if (!serverConfig.geminiApiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: serverConfig.geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'pathwisse-careervoice',
        },
      },
    });
  }
  return geminiClient;
}

function isTransientProviderError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { status?: number; code?: number | string; message?: string };
  const status = Number(candidate.status ?? candidate.code);
  if ([408, 409, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  return /timeout|temporar|rate limit|overloaded|unavailable|connection reset/i.test(candidate.message || '');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateStructuredJson<T>(options: {
  model: string;
  prompt: string;
  systemInstruction: string;
  responseSchema: Record<string, unknown>;
  validate: (value: unknown) => T;
  maxAttempts?: number;
}): Promise<T> {
  const ai = getGeminiClient();
  if (!ai) throw new AiUnavailableError();

  const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 2, 3));
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: options.model,
        contents: options.prompt,
        config: {
          systemInstruction: options.systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: options.responseSchema,
        },
      });

      if (!response.text) {
        throw new AiResponseValidationError('Gemini returned an empty structured response.');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(response.text);
      } catch {
        throw new AiResponseValidationError('Gemini returned malformed JSON.');
      }

      return options.validate(parsed);
    } catch (error) {
      lastError = error;
      if (error instanceof AiResponseValidationError) throw error;
      if (!isTransientProviderError(error) || attempt === maxAttempts) break;
      await delay(150 * 2 ** (attempt - 1));
    }
  }

  console.error('gemini_provider_error', {
    model: options.model,
    message: lastError instanceof Error ? lastError.message : String(lastError),
  });
  throw new AiUnavailableError();
}

export interface GeminiModelHealth {
  checked: boolean;
  chatModelSupported: boolean | null;
  evaluationModelSupported: boolean | null;
  liveModelSupported: boolean | null;
  error?: string;
}

let modelHealth: GeminiModelHealth = {
  checked: false,
  chatModelSupported: null,
  evaluationModelSupported: null,
  liveModelSupported: null,
};

export function getGeminiModelHealth(): GeminiModelHealth {
  return modelHealth;
}

export async function validateConfiguredGeminiModels(): Promise<GeminiModelHealth> {
  const ai = getGeminiClient();
  if (!ai) {
    modelHealth = {
      checked: true,
      chatModelSupported: false,
      evaluationModelSupported: false,
      liveModelSupported: serverConfig.enableGeminiLive ? false : null,
      error: 'GEMINI_API_KEY is not configured.',
    };
    return modelHealth;
  }

  try {
    const check = async (model: string) => {
      await ai.models.get({ model });
      return true;
    };

    const chatModelSupported = await check(serverConfig.geminiChatModel);
    const evaluationModelSupported =
      serverConfig.geminiEvaluationModel === serverConfig.geminiChatModel
        ? chatModelSupported
        : await check(serverConfig.geminiEvaluationModel);
    const liveModelSupported = serverConfig.enableGeminiLive
      ? await check(serverConfig.geminiLiveModel)
      : null;

    modelHealth = {
      checked: true,
      chatModelSupported,
      evaluationModelSupported,
      liveModelSupported,
    };
  } catch (error) {
    modelHealth = {
      checked: true,
      chatModelSupported: false,
      evaluationModelSupported: false,
      liveModelSupported: serverConfig.enableGeminiLive ? false : null,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return modelHealth;
}
