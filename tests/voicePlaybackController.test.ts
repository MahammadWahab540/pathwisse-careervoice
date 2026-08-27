import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpeechPlaybackController, type SpeechPlaybackEnv } from '../src/hooks/voicePlaybackController';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createResponse() {
  return {
    ok: true,
    status: 200,
    blob: async () => new Blob(['audio']),
  } as Response;
}

test('speak A then B with A resolving late only plays B', async () => {
  const requests: Array<ReturnType<typeof deferred<Response>>> = [];
  const playLog: string[] = [];
  class FakeAudio {
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    currentTime = 0;
    constructor(readonly url: string) {}
    play = async () => {
      playLog.push(this.url);
    };
    pause = () => {};
  }

  const env: SpeechPlaybackEnv = {
    fetch: (() => {
      const request = deferred<Response>();
      requests.push(request);
      return request.promise;
    }) as typeof fetch,
    AudioCtor: FakeAudio as unknown as typeof Audio,
    URL: {
      createObjectURL: () => `blob:${requests.length}`,
      revokeObjectURL: () => {},
    },
  };

  const controller = createSpeechPlaybackController({ onSpeakingChange: () => {} }, env);
  controller.speak('A', undefined, { ttsEndpoint: '/api/voice/speak' });
  controller.speak('B', undefined, { ttsEndpoint: '/api/voice/speak' });
  requests[1].resolve(createResponse());
  await new Promise((resolve) => setTimeout(resolve, 0));
  requests[0].resolve(createResponse());
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(playLog, ['blob:2']);
  assert.equal(controller.getActiveSourceCount(), 1);
});

test('stopping pending speech prevents late audio and fallback playback', async () => {
  const request = deferred<Response>();
  const playLog: string[] = [];
  const fallbackLog: string[] = [];
  class FakeAudio {
    currentTime = 0;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    play = async () => {
      playLog.push('audio');
    };
    pause = () => {};
  }

  const env: SpeechPlaybackEnv = {
    fetch: (() => request.promise) as typeof fetch,
    AudioCtor: FakeAudio as unknown as typeof Audio,
    URL: { createObjectURL: () => 'blob:stopped', revokeObjectURL: () => {} },
    speechSynthesis: {
      paused: false,
      speaking: false,
      cancel: () => {},
      resume: () => {},
      speak: () => fallbackLog.push('fallback'),
    } as unknown as SpeechSynthesis,
    SpeechSynthesisUtteranceCtor: class {} as unknown as typeof SpeechSynthesisUtterance,
  };

  const controller = createSpeechPlaybackController({ onSpeakingChange: () => {} }, env);
  controller.speak('A', undefined, { ttsEndpoint: '/api/voice/speak' });
  controller.stop('test_stop');
  request.resolve(createResponse());
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(playLog, []);
  assert.deepEqual(fallbackLog, []);
  assert.equal(controller.getActiveSourceCount(), 0);
});

test('strict-mode-style setup cleanup setup leaves only the latest pending request audible', async () => {
  const requests: Array<ReturnType<typeof deferred<Response>>> = [];
  const playLog: string[] = [];
  class FakeAudio {
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    currentTime = 0;
    constructor(readonly url: string) {}
    play = async () => {
      playLog.push(this.url);
    };
    pause = () => {};
  }

  const env: SpeechPlaybackEnv = {
    fetch: (() => {
      const request = deferred<Response>();
      requests.push(request);
      return request.promise;
    }) as typeof fetch,
    AudioCtor: FakeAudio as unknown as typeof Audio,
    URL: { createObjectURL: () => `blob:${requests.length}`, revokeObjectURL: () => {} },
  };

  const controller = createSpeechPlaybackController({ onSpeakingChange: () => {} }, env);
  controller.speak('initial', undefined, { ttsEndpoint: '/api/voice/speak' });
  controller.stop('strict_cleanup');
  controller.speak('initial', undefined, { ttsEndpoint: '/api/voice/speak' });
  requests[0].resolve(createResponse());
  requests[1].resolve(createResponse());
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(playLog, ['blob:2']);
});

test('rapid replay keeps one active browser speech source', () => {
  let active = 0;
  let maxActive = 0;
  const speechSynthesis = {
    paused: false,
    speaking: false,
    cancel: () => {
      active = 0;
    },
    resume: () => {},
    speak: (utterance: SpeechSynthesisUtterance) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      utterance.onstart?.(new Event('start') as SpeechSynthesisEvent);
    },
  } as unknown as SpeechSynthesis;
  class FakeUtterance {
    rate = 1;
    pitch = 1;
    onstart: ((event: SpeechSynthesisEvent) => void) | null = null;
    onend: ((event: SpeechSynthesisEvent) => void) | null = null;
    onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;
    constructor(readonly text: string) {}
  }

  const controller = createSpeechPlaybackController(
    { onSpeakingChange: () => {} },
    {
      speechSynthesis,
      SpeechSynthesisUtteranceCtor: FakeUtterance as unknown as typeof SpeechSynthesisUtterance,
      setTimeout: (() => 0) as unknown as typeof setTimeout,
      clearTimeout: (() => {}) as typeof clearTimeout,
    }
  );

  for (let index = 0; index < 5; index += 1) {
    controller.speak('Replay');
    assert.equal(controller.getActiveSourceCount(), 1);
  }

  assert.equal(maxActive, 1);
});
