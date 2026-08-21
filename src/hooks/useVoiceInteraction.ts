import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseVoiceInteractionProps {
  onSpeechResult?: (text: string) => void;
  onBargeIn?: () => void;
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
  const recognitionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const isSpeakingRef = useRef<boolean>(false);

  // Keep isSpeakingRef in sync with state
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Asynchronously load voices when browser populates them
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.speechSynthesis) return;

      const updateVoices = () => {
        try {
          const availableVoices = window.speechSynthesis.getVoices();
          if (availableVoices && availableVoices.length > 0) {
            voicesRef.current = availableVoices;
          }
        } catch (e) {
          console.warn('Error fetching speech synthesis voices:', e);
        }
      };

      updateVoices();

      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    } catch (e) {
      console.warn('Speech synthesis not available:', e);
    }
  }, []);

  // Initialize Web Speech Recognition with safety guards
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: any) => {
          try {
            let currentTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i] && event.results[i][0]) {
                currentTranscript += event.results[i][0].transcript;
              }
            }
            setTranscript(currentTranscript);

            if (event.results[event.results.length - 1]?.isFinal) {
              onSpeechResult?.(currentTranscript);
              setTranscript('');
            }
          } catch (e) {
            console.warn('Speech recognition result processing error:', e);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech Recognition Error:', event?.error);
          if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
            setMicPermission('denied');
            setError('Microphone permission denied. You can still type your responses!');
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    } catch (err) {
      console.warn('Speech recognition initialization error:', err);
    }
  }, [onSpeechResult]);

  // Audio Amplitude Analyzer Loop
  const updateAmplitude = useCallback(() => {
    try {
      if (!analyserRef.current) return;
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / (dataArray.length || 1);
      const normAmplitude = Math.min(1, avg / 128); // 0.0 to 1.0
      setAmplitude(normAmplitude);

      // If user starts speaking while TTS is active -> trigger Barge-In
      if (normAmplitude > 0.25 && isSpeakingRef.current && onBargeIn) {
        try {
          onBargeIn();
        } catch (e) {
          console.warn('Barge-in error:', e);
        }
      }

      animationFrameRef.current = requestAnimationFrame(updateAmplitude);
    } catch (e) {
      console.warn('Amplitude update error:', e);
    }
  }, [onBargeIn]);

  // Start Microphone Stream & Web Audio Analyser
  const startListening = async () => {
    try {
      if (isSpeakingRef.current && onBargeIn) {
        try {
          onBargeIn();
        } catch (e) {}
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        setMicPermission('denied');
        setError('Microphone is not supported in this browser. You can type your responses!');
        return;
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

      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume().catch(() => {});
      }

      updateAmplitude();

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already started or active
          setIsListening(true);
        }
      } else {
        setIsListening(true);
      }
    } catch (err: any) {
      console.warn('Mic Error:', err);
      setMicPermission('denied');
      setError('Microphone unavailable or blocked. Switching to text input mode.');
      setIsListening(false);
    }
  };

  // Stop Listening
  const stopListening = () => {
    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
      setIsListening(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setAmplitude(0);
    } catch (e) {
      console.warn('Stop listening error:', e);
    }
  };

  // Speak Text using Browser SpeechSynthesis with Barge-In & Chrome GC Fixes
  const speakText = useCallback(
    (text: string, onEnd?: () => void) => {
      try {
        if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.speechSynthesis) {
          if (onEnd) onEnd();
          return;
        }

        // Stop ongoing speech & force resume Chrome queue
        try {
          window.speechSynthesis.cancel();
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch (e) {}

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.05;

        // Select natural or preferred voice if available
        let availableVoices: SpeechSynthesisVoice[] = [];
        try {
          availableVoices =
            voicesRef.current.length > 0
              ? voicesRef.current
              : window.speechSynthesis.getVoices() || [];
        } catch (e) {
          availableVoices = [];
        }

        const preferredVoice =
          availableVoices.find(
            (v) =>
              v.lang &&
              v.lang.startsWith('en') &&
              (v.name.includes('Natural') ||
                v.name.includes('Google') ||
                v.name.includes('Samantha') ||
                v.name.includes('Daniel') ||
                v.name.includes('Karen'))
          ) || availableVoices.find((v) => v.lang && v.lang.startsWith('en'));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        let hasFinished = false;
        const finish = () => {
          if (hasFinished) return;
          hasFinished = true;
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          utteranceRef.current = null;
          if (onEnd) {
            try {
              onEnd();
            } catch (e) {
              console.warn('onEnd callback error:', e);
            }
          }
        };

        utterance.onstart = () => {
          setIsSpeaking(true);
          isSpeakingRef.current = true;
        };

        utterance.onend = () => {
          finish();
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          finish();
        };

        // CRITICAL CHROME GC FIX: Store utterance ref to prevent garbage collection mid-speech
        utteranceRef.current = utterance;

        window.speechSynthesis.speak(utterance);

        // Extra guard for Chrome: force resume if paused
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch (e) {}

        // Fallback safety timeout if browser fails to trigger onend/onerror
        const wordCount = text ? text.split(/\s+/).length : 10;
        const estimatedDurationMs = Math.max(2500, (wordCount / 2.2) * 1000 + 2000);
        setTimeout(() => {
          if (!hasFinished && isSpeakingRef.current) {
            finish();
          }
        }, estimatedDurationMs);
      } catch (err) {
        console.warn('TTS Execution Error:', err);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (onEnd) onEnd();
      }
    },
    []
  );

  // Stop TTS immediately (Barge-In)
  const stopSpeaking = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    } catch (e) {
      console.warn('Stop speaking error:', e);
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    utteranceRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
        }
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch (e) {
        console.warn('Cleanup error:', e);
      }
    };
  }, []);

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
