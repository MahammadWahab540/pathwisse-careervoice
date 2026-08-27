export interface SpeechPlaybackEnv {
  fetch?: typeof fetch;
  AudioCtor?: typeof Audio;
  URL?: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
  speechSynthesis?: SpeechSynthesis;
  SpeechSynthesisUtteranceCtor?: typeof SpeechSynthesisUtterance;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
  log?: (eventName: string, metadata?: Record<string, unknown>) => void;
}

export interface SpeechPlaybackCallbacks {
  onSpeakingChange: (isSpeaking: boolean) => void;
}

export interface SpeechPlaybackOptions {
  utteranceId?: string;
  source?: string;
  ttsEndpoint?: string;
}

export interface SpeechPlaybackController {
  speak: (text: string, onEnd?: () => void, options?: SpeechPlaybackOptions) => void;
  stop: (reason?: string) => void;
  getGeneration: () => number;
  getActiveSourceCount: () => number;
}

interface VoiceSpeakResponse {
  success?: boolean;
  audioBase64?: string;
  contentType?: string;
}

function textHash(text: string): string {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: contentType });
}

function defaultEnv(): SpeechPlaybackEnv {
  if (typeof window === 'undefined') return {};
  return {
    fetch: window.fetch?.bind(window),
    AudioCtor: window.Audio,
    URL: window.URL,
    speechSynthesis: window.speechSynthesis,
    SpeechSynthesisUtteranceCtor: window.SpeechSynthesisUtterance,
    setTimeout: window.setTimeout.bind(window) as typeof setTimeout,
    clearTimeout: window.clearTimeout.bind(window) as typeof clearTimeout,
    log: (eventName, metadata) => {
      console.debug(eventName, metadata || {});
    },
  };
}

export function createSpeechPlaybackController(
  callbacks: SpeechPlaybackCallbacks,
  env: SpeechPlaybackEnv = defaultEnv()
): SpeechPlaybackController {
  let generation = 0;
  let activeAbortController: AbortController | null = null;
  let activeAudio: HTMLAudioElement | null = null;
  let activeBlobUrl: string | null = null;
  let activeUtterance: SpeechSynthesisUtterance | null = null;
  let activeSource: 'audio' | 'speechSynthesis' | null = null;
  let finishTimer: ReturnType<typeof setTimeout> | null = null;

  const log = (eventName: string, metadata: Record<string, unknown> = {}) => {
    env.log?.(eventName, { ...metadata, timestamp: new Date().toISOString() });
  };

  const isCurrent = (requestGeneration: number) => requestGeneration === generation;

  const clearFinishTimer = () => {
    if (finishTimer && env.clearTimeout) env.clearTimeout(finishTimer);
    finishTimer = null;
  };

  const releaseAudio = () => {
    if (activeAudio) {
      activeAudio.onended = null;
      activeAudio.onerror = null;
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch {}
    }
    activeAudio = null;
    if (activeBlobUrl && env.URL) {
      try {
        env.URL.revokeObjectURL(activeBlobUrl);
      } catch {}
    }
    activeBlobUrl = null;
  };

  const cancelCurrentSources = (reason: string) => {
    clearFinishTimer();
    activeAbortController?.abort();
    activeAbortController = null;
    releaseAudio();
    if (env.speechSynthesis) {
      try {
        env.speechSynthesis.cancel();
        if (env.speechSynthesis.paused) env.speechSynthesis.resume();
      } catch {}
    }
    activeUtterance = null;
    activeSource = null;
    callbacks.onSpeakingChange(false);
    log('tts_stop', { generation, reason });
  };

  const finish = (requestGeneration: number, utteranceId: string, onEnd?: () => void) => {
    if (!isCurrent(requestGeneration)) {
      log('tts_stale_discarded', { utteranceId, generation: requestGeneration, currentGeneration: generation, phase: 'finish' });
      return;
    }
    clearFinishTimer();
    releaseAudio();
    activeUtterance = null;
    activeSource = null;
    callbacks.onSpeakingChange(false);
    log('tts_play_finished', { utteranceId, generation: requestGeneration });
    onEnd?.();
  };

  const playBrowserSpeech = (
    requestGeneration: number,
    utteranceId: string,
    text: string,
    onEnd?: () => void
  ) => {
    if (!isCurrent(requestGeneration)) {
      log('tts_stale_discarded', { utteranceId, generation: requestGeneration, currentGeneration: generation, phase: 'fallback' });
      return;
    }
    if (!env.speechSynthesis || !env.SpeechSynthesisUtteranceCtor) {
      finish(requestGeneration, utteranceId, onEnd);
      return;
    }

    try {
      env.speechSynthesis.cancel();
      const utterance = new env.SpeechSynthesisUtteranceCtor(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      let hasFinished = false;
      const completeOnce = () => {
        if (hasFinished) return;
        hasFinished = true;
        finish(requestGeneration, utteranceId, onEnd);
      };

      utterance.onstart = () => {
        if (!isCurrent(requestGeneration)) {
          env.speechSynthesis?.cancel();
          return;
        }
        activeSource = 'speechSynthesis';
        callbacks.onSpeakingChange(true);
        log('tts_fallback_started', { utteranceId, generation: requestGeneration });
      };
      utterance.onend = completeOnce;
      utterance.onerror = (event) => {
        const error = typeof event === 'object' && event && 'error' in event ? String(event.error) : 'unknown';
        if (error !== 'canceled' && error !== 'interrupted') {
          log('tts_fallback_error', { utteranceId, generation: requestGeneration, error });
        }
        completeOnce();
      };

      activeUtterance = utterance;
      if (typeof window !== 'undefined') (window as any).__cvActiveUtterance = utterance;
      env.speechSynthesis.speak(utterance);
      if (env.speechSynthesis.paused || !env.speechSynthesis.speaking) env.speechSynthesis.resume();

      const wordCount = text ? text.split(/\s+/).length : 10;
      const estimatedDurationMs = Math.max(3000, (wordCount / 2) * 1000 + 2000);
      finishTimer = env.setTimeout?.(() => completeOnce(), estimatedDurationMs) || null;
    } catch (error) {
      log('tts_fallback_error', { utteranceId, generation: requestGeneration, error: error instanceof Error ? error.message : String(error) });
      finish(requestGeneration, utteranceId, onEnd);
    }
  };

  const speak = (text: string, onEnd?: () => void, options: SpeechPlaybackOptions = {}) => {
    generation += 1;
    cancelCurrentSources('replace');
    const requestGeneration = generation;
    const utteranceId = options.utteranceId || `utt_${requestGeneration}_${Date.now()}`;
    const source = options.source || 'qalam';
    log('tts_requested', {
      utteranceId,
      generation: requestGeneration,
      source,
      textHash: textHash(text),
      hasTtsEndpoint: Boolean(options.ttsEndpoint),
    });

    if (!text.trim()) {
      finish(requestGeneration, utteranceId, onEnd);
      return;
    }

    if (!options.ttsEndpoint || !env.fetch || !env.AudioCtor || !env.URL) {
      playBrowserSpeech(requestGeneration, utteranceId, text, onEnd);
      return;
    }

    const abortController = new AbortController();
    activeAbortController = abortController;
    env.fetch(options.ttsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, format: 'mp3', voice: 'alloy' }),
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!isCurrent(requestGeneration)) {
          log('tts_stale_discarded', { utteranceId, generation: requestGeneration, currentGeneration: generation, phase: 'response' });
          return;
        }
        if (!response.ok) throw new Error(`TTS failed with ${response.status}`);
        const responseContentType = response.headers?.get('content-type') || '';
        let blob: Blob;
        if (responseContentType.includes('application/json')) {
          const data = (await response.json().catch(() => ({}))) as VoiceSpeakResponse;
          if (!data.success || !data.audioBase64 || !data.contentType) {
            throw new Error('TTS JSON response did not include audio.');
          }
          blob = base64ToBlob(data.audioBase64, data.contentType);
        } else {
          blob = await response.blob();
        }
        if (!isCurrent(requestGeneration)) {
          log('tts_stale_discarded', { utteranceId, generation: requestGeneration, currentGeneration: generation, phase: 'blob' });
          return;
        }
        activeBlobUrl = env.URL!.createObjectURL(blob);
        const audio = new env.AudioCtor!(activeBlobUrl);
        activeAudio = audio;
        audio.onended = () => finish(requestGeneration, utteranceId, onEnd);
        audio.onerror = () => {
          if (!isCurrent(requestGeneration)) return;
          releaseAudio();
          playBrowserSpeech(requestGeneration, utteranceId, text, onEnd);
        };
        activeSource = 'audio';
        callbacks.onSpeakingChange(true);
        log('tts_play_started', { utteranceId, generation: requestGeneration, source });
        await audio.play();
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          log('tts_aborted', { utteranceId, generation: requestGeneration });
          return;
        }
        if (!isCurrent(requestGeneration)) {
          log('tts_stale_discarded', { utteranceId, generation: requestGeneration, currentGeneration: generation, phase: 'error' });
          return;
        }
        playBrowserSpeech(requestGeneration, utteranceId, text, onEnd);
      });
  };

  const stop = (reason = 'manual') => {
    generation += 1;
    cancelCurrentSources(reason);
  };

  return {
    speak,
    stop,
    getGeneration: () => generation,
    getActiveSourceCount: () => (activeSource ? 1 : 0),
  };
}
