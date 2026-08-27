import { useState, useEffect, useRef, useCallback } from 'react';
import { createSpeechPlaybackController, type SpeechPlaybackController } from './voicePlaybackController';

export interface UseVoiceInteractionProps {
  onSpeechResult?: (text: string) => void;
  onBargeIn?: () => void;
}

interface VoiceTranscribeResponse {
  success: boolean;
  text: string;
}

function selectRecordingMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function mimeTypeToFormat(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('ogg')) return 'ogg';
  if (normalized.includes('mp4')) return 'm4a';
  if (normalized.includes('mpeg')) return 'mp3';
  if (normalized.includes('wav')) return 'wav';
  return 'webm';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',').pop() || '' : result);
    };
    reader.onerror = () => reject(reader.error || new Error('Audio could not be read.'));
    reader.readAsDataURL(blob);
  });
}

export function useVoiceInteraction({
  onSpeechResult,
  onBargeIn,
}: UseVoiceInteractionProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recognitionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const speechControllerRef = useRef<SpeechPlaybackController | null>(null);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.speechSynthesis) return;
      const updateVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices() || [];
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    } catch {
      // Browser speech fallback is optional.
    }
  }, []);

  const updateAmplitude = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((sum, value) => sum + value, 0) / Math.max(1, dataArray.length);
    const normAmplitude = Math.min(1, avg / 128);
    setAmplitude(normAmplitude);

    if (normAmplitude > 0.25 && isSpeakingRef.current && onBargeIn) onBargeIn();
    animationFrameRef.current = requestAnimationFrame(updateAmplitude);
  }, [onBargeIn]);

  const stopAmplitudeLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setAmplitude(0);
  }, []);

  const ensureMicStream = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setMicPermission('denied');
      throw new Error('Microphone is not supported in this browser. You can type your responses.');
    }

    if (!mediaStreamRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setMicPermission('granted');

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
      }
    }

    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume().catch(() => {});
    }

    return mediaStreamRef.current;
  }, []);

  const transcribeRecording = useCallback(async (blob: Blob) => {
    if (!blob.size) return;
    setTranscript('Transcribing...');
    try {
      const audioBase64 = await blobToBase64(blob);
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          format: mimeTypeToFormat(blob.type),
          language: 'en',
        }),
      });
      const data = await response.json().catch(() => ({})) as Partial<VoiceTranscribeResponse> & { message?: string };
      if (!response.ok || !data.success || !data.text) {
        throw new Error(data.message || 'Voice transcription failed.');
      }
      setTranscript('');
      setError(null);
      onSpeechResult?.(data.text);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Voice transcription failed.';
      console.warn('OpenRouter transcription failed:', message);
      setTranscript('');
      setError('Voice transcription is unavailable. Please type your response.');
    }
  }, [onSpeechResult]);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          currentTranscript += event.results[i]?.[0]?.transcript || '';
        }
        setTranscript(currentTranscript);
        if (event.results[event.results.length - 1]?.isFinal) {
          onSpeechResult?.(currentTranscript);
          setTranscript('');
        }
      };
      recognition.onerror = (event: any) => {
        if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
          setMicPermission('denied');
          setError('Microphone permission denied. You can still type your responses.');
        }
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    } catch {
      // Fallback recognition is best-effort only.
    }
  }, [onSpeechResult]);

  const startListening = async () => {
    try {
      if (isSpeakingRef.current && onBargeIn) onBargeIn();
      const stream = await ensureMicStream();
      updateAmplitude();

      if (typeof MediaRecorder !== 'undefined') {
        const mimeType = selectRecordingMimeType();
        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) recordedChunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
          recordedChunksRef.current = [];
          void transcribeRecording(blob);
        };
        recorder.start();
        setIsListening(true);
        setError(null);
        return;
      }

      if (recognitionRef.current) {
        recognitionRef.current.start();
      } else {
        setError('Voice recording is not supported in this browser. Please type your response.');
      }
    } catch (err) {
      console.warn('Mic error:', err);
      setMicPermission('denied');
      setError(err instanceof Error ? err.message : 'Microphone unavailable or blocked.');
      setIsListening(false);
      stopAmplitudeLoop();
    }
  };

  const stopListening = () => {
    try {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      } else if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch {
      // Ignore already-stopped browser voice resources.
    }
    setIsListening(false);
    stopAmplitudeLoop();
  };

  useEffect(() => {
    speechControllerRef.current = createSpeechPlaybackController({
      onSpeakingChange: (speaking) => {
        setIsSpeaking(speaking);
        isSpeakingRef.current = speaking;
      },
    });

    return () => {
      speechControllerRef.current?.stop('unmount');
      speechControllerRef.current = null;
    };
  }, []);

  // Speak Text using the shared Qalam playback authority.
  const speakText = useCallback(
    (text: string, onEnd?: () => void) => {
      speechControllerRef.current?.speak(text, onEnd, {
        source: 'qalam',
        ttsEndpoint: '/api/voice/speak',
      });
    },
    []
  );

  const stopSpeaking = useCallback(() => {
    speechControllerRef.current?.stop('stopSpeaking');
    utteranceRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopAmplitudeLoop();
      mediaRecorderRef.current?.state !== 'inactive' && mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close().catch(() => {});
      stopSpeaking();
    };
  }, [stopAmplitudeLoop, stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    amplitude,
    transcript,
    setTranscript,
    micPermission,
    error,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  };
}
