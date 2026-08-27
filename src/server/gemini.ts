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

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1]);
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new AiResponseValidationError('AI provider returned malformed JSON.');
  }
}

async function generateOpenRouterStructuredJson<T>(options: {
  model: string;
  prompt: string;
  systemInstruction: string;
  responseSchema: Record<string, unknown>;
  validate: (value: unknown) => T;
  maxAttempts: number;
}): Promise<T> {
  if (!serverConfig.openrouterApiKey) throw new AiUnavailableError();

  let lastError: unknown;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      const models = options.model.includes(',')
        ? options.model.split(',').map((m) => m.trim()).filter(Boolean)
        : [options.model];

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serverConfig.openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://pathwisse.com',
          'X-Title': 'Pathwisse CareerVoice',
        },
        body: JSON.stringify({
          ...(models.length > 1 ? { models } : { model: models[0] }),
          messages: [
            {
              role: 'system',
              content: `${options.systemInstruction}\n\nReturn only valid JSON matching this schema: ${JSON.stringify(options.responseSchema)}`,
            },
            { role: 'user', content: options.prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });

      const text = await response.text();
      if (!response.ok) {
        const error = new Error(`OpenRouter request failed with HTTP ${response.status}: ${text.slice(0, 240)}`) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      const payload = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new AiResponseValidationError('OpenRouter returned an empty structured response.');
      return options.validate(extractJson(content));
    } catch (error) {
      lastError = error;
      if (error instanceof AiResponseValidationError) throw error;
      if (!isTransientProviderError(error) || attempt === options.maxAttempts) break;
      await delay(150 * 2 ** (attempt - 1));
    }
  }

  console.error('openrouter_provider_error', {
    model: options.model,
    message: lastError instanceof Error ? lastError.message : String(lastError),
  });
  throw new AiUnavailableError();
}

export async function generateStructuredJson<T>(options: {
  model: string;
  prompt: string;
  systemInstruction: string;
  responseSchema: Record<string, unknown>;
  validate: (value: unknown) => T;
  maxAttempts?: number;
}): Promise<T> {
  const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 2, 3));
  if (serverConfig.openrouterApiKey) {
    try {
      return await generateOpenRouterStructuredJson({
        ...options,
        model: serverConfig.openrouterLlmModel,
        maxAttempts,
      });
    } catch (error) {
      if (!serverConfig.geminiApiKey || error instanceof AiResponseValidationError) throw error;
      console.warn('openrouter_fallback_to_gemini', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const ai = getGeminiClient();
  if (!ai) throw new AiUnavailableError();

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

      return options.validate(extractJson(response.text));
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
