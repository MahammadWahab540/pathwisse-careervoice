import { serverConfig } from './config';
import { AiUnavailableError } from './gemini';

export interface TranscribeAudioInput {
  audioBase64: string;
  format: string;
  language?: string;
}

export interface TranscribeAudioResult {
  text: string;
  usage?: unknown;
}

export interface SynthesizeSpeechInput {
  text: string;
  voice?: string;
  format?: 'mp3' | 'wav' | 'opus';
}

export interface SynthesizeSpeechResult {
  audioBase64: string;
  contentType: string;
}

function openrouterHeaders(): Record<string, string> {
  if (!serverConfig.openrouterApiKey) throw new AiUnavailableError('OpenRouter audio is not configured.');
  return {
    Authorization: `Bearer ${serverConfig.openrouterApiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://pathwisse.com',
    'X-Title': 'Pathwisse CareerVoice',
  };
}

function assertBase64(value: string): string {
  const normalized = value.includes(',') ? value.split(',').pop() || '' : value;
  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized.replace(/\s/g, ''))) {
    throw new Error('audioBase64 must contain base64-encoded audio bytes.');
  }
  return normalized.replace(/\s/g, '');
}

function normalizeFormat(value: string): string {
  const normalized = value.toLowerCase().replace(/^audio\//, '').replace(/^x-/, '');
  if (normalized === 'mpeg') return 'mp3';
  if (normalized === 'mp4') return 'm4a';
  if (normalized === 'webm;codecs=opus') return 'webm';
  return normalized.split(';')[0] || 'webm';
}

function contentTypeFor(format: SynthesizeSpeechInput['format']): string {
  switch (format) {
    case 'wav':
      return 'audio/wav';
    case 'opus':
      return 'audio/opus';
    case 'mp3':
    default:
      return 'audio/mpeg';
  }
}

export async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioResult> {
  const audioBase64 = assertBase64(input.audioBase64);
  const format = normalizeFormat(input.format);

  const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
    method: 'POST',
    headers: openrouterHeaders(),
    body: JSON.stringify({
      model: serverConfig.openrouterSttModel,
      input_audio: {
        data: audioBase64,
        format,
      },
      ...(input.language ? { language: input.language } : {}),
      temperature: 0,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    const error = new Error(`OpenRouter STT failed with HTTP ${response.status}: ${responseText.slice(0, 240)}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const payload = JSON.parse(responseText) as { text?: unknown; usage?: unknown };
  if (typeof payload.text !== 'string' || !payload.text.trim()) {
    throw new Error('OpenRouter STT returned an empty transcript.');
  }

  return {
    text: payload.text.trim(),
    usage: payload.usage,
  };
}

export async function synthesizeSpeech(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
  const text = input.text.trim();
  if (!text) throw new Error('text is required.');

  const format = input.format || 'mp3';
  const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST',
    headers: openrouterHeaders(),
    body: JSON.stringify({
      model: serverConfig.openrouterTtsModel,
      input: text,
      voice: input.voice || 'alloy',
      response_format: format,
      speed: 1,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => '');
    const error = new Error(`OpenRouter TTS failed with HTTP ${response.status}: ${responseText.slice(0, 240)}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const audio = Buffer.from(await response.arrayBuffer());
  return {
    audioBase64: audio.toString('base64'),
    contentType: response.headers.get('content-type') || contentTypeFor(format),
  };
}
