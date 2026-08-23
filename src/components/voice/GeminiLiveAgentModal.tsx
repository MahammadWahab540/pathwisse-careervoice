import React, { useState, useEffect } from 'react';
import { useGeminiLive } from '../../hooks/useGeminiLive';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { VoiceWaveform } from './VoiceWaveform';
import { QalamState } from '../../types';
import {
  Radio,
  Mic,
  MicOff,
  Send,
  X,
  Sparkles,
  Zap,
  Volume2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface GeminiLiveAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole?: string;
  trackEvent?: (eventName: string, metadata?: any) => void;
}

export const GeminiLiveAgentModal: React.FC<GeminiLiveAgentModalProps> = ({
  isOpen,
  onClose,
  targetRole = 'AI / ML Engineer',
  trackEvent,
}) => {
  const [textInput, setTextInput] = useState('');
  const [history, setHistory] = useState<Array<{ sender: 'user' | 'qalam'; text: string }>>([]);

  const {
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
  } = useGeminiLive({
    onInputText: (text) => {
      setHistory((prev) => [...prev, { sender: 'user', text }]);
    },
    onOutputText: (text) => {
      setHistory((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.sender === 'qalam') {
          return [...prev.slice(0, -1), { sender: 'qalam', text: last.text + text }];
        }
        return [...prev, { sender: 'qalam', text }];
      });
    },
  });

  // Auto-connect when modal opens
  useEffect(() => {
    if (isOpen) {
      startLiveSession();
      trackEvent?.('gemini_live_session_opened', { targetRole });
    } else {
      stopLiveSession();
    }
  }, [isOpen, startLiveSession, stopLiveSession, targetRole, trackEvent]);

  if (!isOpen) return null;

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendTextMessage(textInput.trim());
    setHistory((prev) => [...prev, { sender: 'user', text: textInput.trim() }]);
    setTextInput('');
  };

  const getQalamState = (): QalamState => {
    if (isConnecting) return 'THINKING';
    if (isLiveSpeaking) return 'SPEAKING';
    if (isLiveListening) return 'LISTENING';
    return 'WELCOME';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#0b111e]/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white border border-[#e1e7ef] rounded-3xl p-5 shadow-xl flex flex-col items-center relative overflow-hidden text-center space-y-4">
        {/* Modal Header */}
        <div className="w-full flex items-center justify-between border-b border-[#e1e7ef] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#e1e7ef] text-[#1f3861] border border-[#1f3861]/20">
              <Zap className="w-4 h-4 animate-pulse" />
            </span>
            <div className="text-left">
              <h3 className="text-sm font-extrabold text-[#0b111e] flex items-center gap-1.5">
                Qalam Live Coach
                <span className="px-1.5 py-0.5 rounded-full bg-[#e1e7ef] text-[9px] font-mono font-bold text-[#1f3861]">
                  LIVE
                </span>
              </h3>
              <p className="text-[10px] text-[#344256] font-medium">
                Voice conversation for {targetRole}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#f8fafc] border border-[#e1e7ef] text-[#344256] hover:text-[#0b111e] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f8fafc] border border-[#e1e7ef] text-[11px] font-medium">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-emerald-600 animate-ping'
                : isConnecting
                ? 'bg-amber-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span className={isConnected ? 'text-emerald-700 font-bold' : 'text-[#344256]'}>
            {isConnected
              ? 'Qalam is ready'
              : isConnecting
              ? 'Opening your live voice session...'
              : 'Voice session paused'}
          </span>
        </div>

        {error && (
          <div className="w-full p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
            <button
              onClick={startLiveSession}
              className="ml-auto p-1 px-2 rounded-full bg-red-100 hover:bg-red-200 text-xs flex items-center gap-1 font-bold"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Qalam Character Animation */}
        <div className="my-2">
          <QalamCharacter state={getQalamState()} audioAmplitude={amplitude} size={140} />
        </div>

        {/* Voice Audio Waveform */}
        <VoiceWaveform
          amplitude={amplitude}
          isListening={isLiveListening}
          isSpeaking={isLiveSpeaking}
        />

        {/* Transcript Box */}
        <div className="w-full bg-[#f8fafc] border border-[#e1e7ef] rounded-2xl p-3.5 text-left max-h-36 overflow-y-auto space-y-2 text-xs font-sans">
          {history.length === 0 ? (
            <div className="text-center text-[#344256] text-[11px] py-4 font-medium">
              <Sparkles className="w-4 h-4 text-[#1f3861] mx-auto mb-1 opacity-70 animate-bounce" />
              Speak directly to Qalam or type below. You’ll get a live career response.
            </div>
          ) : (
            history.slice(-4).map((item, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-xl text-xs ${
                  item.sender === 'user'
                    ? 'bg-[#e1e7ef] text-[#1f3861] font-semibold ml-4'
                    : 'bg-white border border-[#e1e7ef] text-[#0b111e] font-medium mr-4'
                }`}
              >
                <span className="text-[10px] uppercase font-mono font-bold block mb-0.5 opacity-70">
                  {item.sender === 'user' ? 'You' : 'Qalam'}
                </span>
                {item.text}
              </div>
            ))
          )}
        </div>

        {/* Action Controls & Input */}
        <div className="w-full space-y-2 pt-1">
          <form onSubmit={handleSendText} className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask your career question..."
              className="flex-1 bg-[#f8fafc] border border-[#e1e7ef] rounded-xl px-3.5 py-2 text-xs text-[#0b111e] focus:outline-none focus:border-[#1f3861] transition"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || !isConnected}
              className="px-4 py-2 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-semibold text-xs transition disabled:opacity-40 flex items-center gap-1 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-[#344256] pt-1">
            <button
              onClick={() => {
                if (isConnected) {
                  stopLiveSession();
                } else {
                  startLiveSession();
                }
              }}
              className="hover:text-[#1f3861] transition flex items-center gap-1 font-semibold"
            >
              {isConnected ? (
                <>
                  <MicOff className="w-3.5 h-3.5 text-red-600" /> Pause voice
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-emerald-600" /> Start voice
                </>
              )}
            </button>

            <span className="text-[#344256] text-[10px] font-medium">
              Live guidance
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
