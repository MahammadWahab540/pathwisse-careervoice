import { useState, useEffect, useRef, useCallback } from 'react';
import { float32ToPcmBase64, pcmBase64ToFloat32, calculateRmsAmplitude } from '../utils/audioPcm';
import type { QalamToolCall } from '../ai/qalamTools';

interface UseGeminiLiveOptions {
  onInputText?: (text: string) => void;
  onOutputText?: (text: string) => void;
  onToolCall?: (calls: QalamToolCall[]) => void;
  onError?: (err: string) => void;
}

export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLiveSpeaking, setIsLiveSpeaking] = useState(false);
  const [isLiveListening, setIsLiveListening] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [lastInputTranscript, setLastInputTranscript] = useState('');
  const [lastOutputTranscript, setLastOutputTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeAudioSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  // Stop all active playing audio sources (e.g., when interrupted)
  const stopAllOutputAudio = useCallback(() => {
    activeAudioSourcesRef.current.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // ignore already stopped
      }
    });
    activeAudioSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
    setIsLiveSpeaking(false);
  }, []);

  // Play PCM 24kHz audio chunk received from Gemini Live
  const playAudioChunk = useCallback((base64Audio: string) => {
    try {
      if (!outputAudioCtxRef.current) {
        outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000,
        });
      }

      const audioCtx = outputAudioCtxRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const float32Data = pcmBase64ToFloat32(base64Audio);
      const amp = calculateRmsAmplitude(float32Data);
      setAmplitude(amp);

      const audioBuffer = audioCtx.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      const now = audioCtx.currentTime;
      const startTime = Math.max(now, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      activeAudioSourcesRef.current.push(source);
      setIsLiveSpeaking(true);

      source.onended = () => {
        activeAudioSourcesRef.current = activeAudioSourcesRef.current.filter((s) => s !== source);
        if (activeAudioSourcesRef.current.length === 0) {
          setIsLiveSpeaking(false);
          setAmplitude(0);
        }
      };
    } catch (err) {
      console.error('Playback Error:', err);
    }
  }, []);

  // Start Gemini Live WebSocket Session and Microphone Stream
  const startLiveSession = useCallback(async () => {
    if (wsRef.current || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      // 1. Initialize Microphone Audio Capture at 16kHz
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      // 2. Open WebSocket to Express backend /live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
        setIsLiveListening(true);

        // Connect mic stream to processor
        if (inputAudioCtxRef.current && mediaStreamRef.current) {
          const source = inputAudioCtxRef.current.createMediaStreamSource(mediaStreamRef.current);
          const processor = inputAudioCtxRef.current.createScriptProcessor(4096, 1, 1);
          scriptProcessorRef.current = processor;

          source.connect(processor);
          processor.connect(inputAudioCtxRef.current.destination);

          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBase64 = float32ToPcmBase64(inputData);
              const inputAmp = calculateRmsAmplitude(inputData);
              if (!isLiveSpeaking) {
                setAmplitude(inputAmp);
              }
              ws.send(JSON.stringify({ audio: pcmBase64 }));
            }
          };
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'audio' && msg.audio) {
            playAudioChunk(msg.audio);
          } else if (msg.type === 'interrupted') {
            stopAllOutputAudio();
          } else if (msg.type === 'outputText' && msg.text) {
            setLastOutputTranscript((prev) => prev + msg.text);
            options.onOutputText?.(msg.text);
          } else if (msg.type === 'inputText' && msg.text) {
            setLastInputTranscript((prev) => prev + msg.text);
            options.onInputText?.(msg.text);
          } else if (msg.type === 'toolCall' && Array.isArray(msg.calls)) {
            options.onToolCall?.(msg.calls as QalamToolCall[]);
          } else if (msg.type === 'error') {
            setError(msg.error);
            options.onError?.(msg.error);
          }
        } catch (e) {
          console.error('Error parsing live WS message:', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket Live Error:', e);
        setError('WebSocket Connection Error');
        setIsConnected(false);
        setIsConnecting(false);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
        setIsLiveListening(false);
        stopAllOutputAudio();
      };
    } catch (err: any) {
      console.error('Failed to start Live session:', err);
      setError(err.message || 'Microphone access denied');
      setIsConnecting(false);
    }
  }, [isConnecting, isLiveSpeaking, playAudioChunk, stopAllOutputAudio, options]);

  // Send textual input over Live session
  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ text }));
      setLastInputTranscript(text);
    }
  }, []);

  // Acknowledge a rendered Live tool call back to Gemini.
  const sendToolResult = useCallback((
    callId: string,
    name: string,
    result: Record<string, unknown> = { rendered: true },
  ) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        toolResult: {
          id: callId,
          name,
          result,
        },
      }));
    }
  }, []);

  // Stop Live session and cleanup resources
  const stopLiveSession = useCallback(() => {
    stopAllOutputAudio();

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setIsLiveListening(false);
    setIsLiveSpeaking(false);
    setAmplitude(0);
  }, [stopAllOutputAudio]);

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, [stopLiveSession]);

  return {
    isConnected,
    isConnecting,
    isLiveSpeaking,
    isLiveListening,
    amplitude,
    lastInputTranscript,
    lastOutputTranscript,
    error,
    startLiveSession,
    stopLiveSession,
    sendTextMessage,
    sendToolResult,
  };
}