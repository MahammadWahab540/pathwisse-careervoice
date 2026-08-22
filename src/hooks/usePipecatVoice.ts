import { useState, useCallback, useRef, useEffect } from 'react';

interface UsePipecatVoiceOptions {
  pipecatServerUrl?: string;
  auditId: string;
  targetRole: string;
  studentName?: string;
  onTranscript?: (text: string, sender: 'user' | 'qalam') => void;
  onError?: (error: string) => void;
}

export function usePipecatVoice({
  pipecatServerUrl = (import.meta as any).env?.VITE_PIPECAT_SERVER_URL || '',
  auditId,
  targetRole,
  studentName = 'Candidate',
  onTranscript,
  onError,
}: UsePipecatVoiceOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const callFrameRef = useRef<any>(null);

  const startSession = useCallback(async () => {
    if (!pipecatServerUrl) {
      console.warn('Pipecat server URL not configured, using browser voice fallback.');
      return false;
    }

    setIsConnecting(true);
    try {
      const res = await fetch(`${pipecatServerUrl}/api/voice/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          targetRole,
          studentName,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to initialize Pipecat session: ${res.statusText}`);
      }

      const data = await res.json();
      setRoomUrl(data.roomUrl);
      setIsConnected(true);
      return true;
    } catch (err: any) {
      console.error('Pipecat connection error:', err);
      onError?.(err?.message || 'Failed to connect to voice server.');
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [pipecatServerUrl, auditId, targetRole, studentName, onError]);

  const endSession = useCallback(() => {
    if (callFrameRef.current) {
      callFrameRef.current.destroy?.();
      callFrameRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
    setRoomUrl(null);
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
    roomUrl,
    startSession,
    endSession,
  };
}
