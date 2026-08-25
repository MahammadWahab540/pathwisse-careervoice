import { useState, useCallback, useRef, useEffect } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';

type VoiceTransport = 'websocket' | 'daily';

interface UsePipecatVoiceOptions {
  pipecatServerUrl?: string;
  auditId: string;
  targetRole: string;
  studentName?: string;
  studentId?: string;
  preferredTransport?: VoiceTransport;
  onTranscript?: (text: string, sender: 'user' | 'qalam') => void;
  onError?: (error: string) => void;
}

function studentFacingVoiceError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/permission|notallowed|not-allowed|microphone/i.test(message)) {
    return 'Microphone access is blocked. Allow microphone access or continue by typing.';
  }
  if (/401|403|auth|token|credential|unauthorized/i.test(message)) {
    return 'The live voice connection is not ready. Please check the local voice setup and try again.';
  }
  if (/network|fetch|failed|timeout|daily|webrtc|room/i.test(message)) {
    return 'The live voice room could not be opened. You can try again or continue by typing.';
  }
  return 'The live voice session could not be started. You can try again or continue by typing.';
}

export function usePipecatVoice({
  pipecatServerUrl = '/api/voice/session',
  auditId,
  targetRole,
  studentName = 'Candidate',
  studentId,
  preferredTransport = 'websocket',
  onTranscript,
  onError,
}: UsePipecatVoiceOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const callObjectRef = useRef<DailyCall | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const cleanupWebSocketSession = useCallback(async () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'client_cleanup');
    }
    wsRef.current = null;
  }, []);

  const sendPcmChunk = useCallback((samples: Float32Array) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || isMuted) return;
    const pcm = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i += 1) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    ws.send(pcm.buffer);
  }, [isMuted]);

  const playIncomingAudio = useCallback(async (payload: ArrayBuffer | string) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {});

      const bytes = typeof payload === 'string'
        ? Uint8Array.from(atob(payload), (char) => char.charCodeAt(0)).buffer
        : payload;

      try {
        const decoded = await ctx.decodeAudioData(bytes.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        source.start();
        return;
      } catch {
        // Fall through to raw PCM playback.
      }

      const pcm = new Int16Array(bytes);
      const buffer = ctx.createBuffer(1, pcm.length, 16000);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < pcm.length; i += 1) channel[i] = pcm[i] / 0x8000;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (error) {
      console.warn('Incoming voice audio playback failed:', error);
    }
  }, []);

  const startSession = useCallback(async () => {
    setIsConnecting(true);
    try {
      // 1. Request unified session tokens from same-origin backend proxy or remote URL
      const isFullUrl = pipecatServerUrl.startsWith('http');
      const endpoint = isFullUrl
        ? `${pipecatServerUrl}/api/voice/session`
        : pipecatServerUrl;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          targetRole,
          studentName,
          studentId,
          transport: preferredTransport,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`voice_session_failed_${res.status}: ${errBody.slice(0, 200)}`);
      }

      const data = await res.json();
      const provider = data.provider || preferredTransport;
      const sessionRoomUrl = data.roomUrl || data.connection?.url;
      const studentToken = data.token || data.connection?.token;

      if (!sessionRoomUrl) {
        throw new Error('No live voice connection URL returned from voice service.');
      }

      setRoomUrl(sessionRoomUrl);

      if (provider === 'websocket') {
        await cleanupWebSocketSession();
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        mediaStreamRef.current = stream;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioCtx({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        sourceRef.current = source;
        processorRef.current = processor;

        const ws = new WebSocket(sessionRoomUrl);
        ws.binaryType = 'arraybuffer';
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          setIsConnecting(false);
          ws.send(JSON.stringify({
            type: 'start',
            auditId,
            targetRole,
            studentName,
            studentId,
            token: studentToken,
            audio: { sampleRate: 16000, encoding: 'pcm_s16le', channels: 1 },
          }));
          processor.onaudioprocess = (event) => {
            const input = event.inputBuffer.getChannelData(0);
            const sum = input.reduce((acc, sample) => acc + Math.abs(sample), 0);
            setAudioLevel(Math.min(1, sum / Math.max(1, input.length) * 8));
            sendPcmChunk(input);
          };
          source.connect(processor);
          processor.connect(audioContext.destination);
        };

        ws.onmessage = (event) => {
          if (typeof event.data !== 'string') {
            setIsSpeaking(true);
            void playIncomingAudio(event.data).finally(() => {
              window.setTimeout(() => setIsSpeaking(false), 500);
            });
            return;
          }
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'transcript' || message.type === 'inputText') {
              onTranscript?.(String(message.text || message.transcript || ''), 'user');
            }
            if (message.type === 'assistant' || message.type === 'outputText') {
              onTranscript?.(String(message.text || message.transcript || ''), 'qalam');
            }
            if (message.type === 'audio' && typeof message.audio === 'string') {
              setIsSpeaking(true);
              void playIncomingAudio(message.audio).finally(() => {
                window.setTimeout(() => setIsSpeaking(false), 500);
              });
            }
            if (typeof message.botSpeaking === 'boolean') setIsSpeaking(message.botSpeaking);
            if (typeof message.audioLevel === 'number') setAudioLevel(Math.max(0, Math.min(1, message.audioLevel)));
          } catch {
            onTranscript?.(event.data, 'qalam');
          }
        };

        ws.onerror = () => {
          onError?.(studentFacingVoiceError('websocket connection failed'));
        };

        ws.onclose = () => {
          setIsConnected(false);
          setIsConnecting(false);
          setIsSpeaking(false);
          setAudioLevel(0);
        };

        return true;
      }

      // 2. Instantiate audio-only Daily Call Object
      const existingCall = DailyIframe.getCallInstance();
      if (existingCall) {
        try {
          await existingCall.leave();
          existingCall.destroy();
        } catch {
          // ignore cleanup on singleton instance
        }
      }
      if (callObjectRef.current) {
        try {
          await callObjectRef.current.leave();
          callObjectRef.current.destroy();
        } catch {
          // ignore cleanup on previous instance
        }
      }

      const callObject = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: false,
        dailyConfig: {
          useDevicePreferenceCookies: true,
        },
      });

      callObjectRef.current = callObject;

      // 3. Attach WebRTC Event Handlers
      callObject.on('joined-meeting', () => {
        setIsConnected(true);
        setIsConnecting(false);
      });

      callObject.on('left-meeting', () => {
        setIsConnected(false);
        setIsConnecting(false);
        setIsSpeaking(false);
        setAudioLevel(0);
      });

      callObject.on('app-message', (evt: any) => {
        if (evt?.data?.transcript) {
          onTranscript?.(evt.data.transcript, evt.data.sender || 'qalam');
        }
        if (typeof evt?.data?.botSpeaking === 'boolean') {
          setIsSpeaking(evt.data.botSpeaking);
        }
        if (typeof evt?.data?.audioLevel === 'number') {
          setAudioLevel(Math.max(0, Math.min(1, evt.data.audioLevel)));
        }
      });

      callObject.on('participant-updated', (evt: any) => {
        if (evt?.participant && !evt.participant.local) {
          setIsSpeaking(Boolean(evt.participant.audio));
        }
      });

      callObject.on('active-speaker-change', (evt: any) => {
        const peerId = evt?.activeSpeaker?.peerId;
        const participants = callObject.participants();
        const activeParticipant = peerId ? participants[peerId] : undefined;
        if (activeParticipant && !activeParticipant.local) {
          setIsSpeaking(true);
          setAudioLevel(0.65);
          window.setTimeout(() => setAudioLevel(0), 700);
        }
      });

      callObject.on('error', (err: any) => {
        console.error('Daily WebRTC Session Error:', err);
        onError?.(studentFacingVoiceError(err?.errorMsg || err));
      });

      // 4. Join the Daily room
      await callObject.join({
        url: sessionRoomUrl,
        token: studentToken,
        startAudioOff: false,
        startVideoOff: true,
      });

      return true;
    } catch (err: any) {
      console.error('Pipecat connection error:', err);
      onError?.(studentFacingVoiceError(err));
      setIsConnecting(false);
      setAudioLevel(0);
      return false;
    }
  }, [pipecatServerUrl, auditId, targetRole, studentName, studentId, preferredTransport, cleanupWebSocketSession, sendPcmChunk, playIncomingAudio, onTranscript, onError]);

  const endSession = useCallback(async () => {
    await cleanupWebSocketSession();
    if (callObjectRef.current) {
      try {
        await callObjectRef.current.leave();
        callObjectRef.current.destroy();
      } catch (err) {
        console.warn('Error during Daily teardown:', err);
      }
      callObjectRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
    setAudioLevel(0);
    setRoomUrl(null);
  }, [cleanupWebSocketSession]);

  const toggleMute = useCallback(() => {
    if (wsRef.current) {
      setIsMuted((current) => !current);
      return;
    }
    if (callObjectRef.current) {
      const isAudioActive = callObjectRef.current.localAudio();
      callObjectRef.current.setLocalAudio(!isAudioActive);
      setIsMuted(isAudioActive);
    }
  }, []);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  return {
    isConnected,
    isConnecting,
    isSpeaking,
    audioLevel,
    isMuted,
    roomUrl,
    startSession,
    endSession,
    toggleMute,
  };
}
