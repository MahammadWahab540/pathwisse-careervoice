import { useState, useCallback, useRef, useEffect } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';

interface UsePipecatVoiceOptions {
  pipecatServerUrl?: string;
  auditId: string;
  targetRole: string;
  studentName?: string;
  onTranscript?: (text: string, sender: 'user' | 'qalam') => void;
  onError?: (error: string) => void;
}

export function usePipecatVoice({
  pipecatServerUrl = '/api/voice/session',
  auditId,
  targetRole,
  studentName = 'Candidate',
  onTranscript,
  onError,
}: UsePipecatVoiceOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const callObjectRef = useRef<DailyCall | null>(null);

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
          transport: 'daily',
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Failed to initialize Pipecat voice session (${res.status}): ${errBody}`);
      }

      const data = await res.json();
      const sessionRoomUrl = data.roomUrl || data.connection?.url;
      const studentToken = data.token || data.connection?.token;

      if (!sessionRoomUrl) {
        throw new Error('No Daily WebRTC room URL returned from voice service.');
      }

      setRoomUrl(sessionRoomUrl);

      // 2. Instantiate audio-only Daily Call Object
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
      });

      callObject.on('app-message', (evt: any) => {
        if (evt?.data?.transcript) {
          onTranscript?.(evt.data.transcript, evt.data.sender || 'qalam');
        }
      });

      callObject.on('participant-updated', (evt: any) => {
        if (evt?.participant && !evt.participant.local) {
          setIsSpeaking(Boolean(evt.participant.audio));
        }
      });

      callObject.on('error', (err: any) => {
        console.error('Daily WebRTC Session Error:', err);
        onError?.(err?.errorMsg || 'Voice stream encountered an error.');
      });

      // 4. Join the Daily room
      await callObject.join({
        url: sessionRoomUrl,
        token: studentToken,
      });

      return true;
    } catch (err: any) {
      console.error('Pipecat connection error:', err);
      onError?.(err?.message || 'Failed to connect to voice server.');
      setIsConnecting(false);
      return false;
    }
  }, [pipecatServerUrl, auditId, targetRole, studentName, onTranscript, onError]);

  const endSession = useCallback(async () => {
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
    setRoomUrl(null);
  }, []);

  const toggleMute = useCallback(() => {
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
    isMuted,
    roomUrl,
    startSession,
    endSession,
    toggleMute,
  };
}
