import React, { useState, useEffect } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { User, ArrowRight, Mic, MicOff, Sparkles } from 'lucide-react';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';

interface AskNameStepProps {
  onComplete: (firstName: string) => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

export const AskNameStep: React.FC<AskNameStepProps> = ({ onComplete, trackEvent }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSpeechResult = (text: string) => {
    if (text.trim()) {
      const cleanName = text.trim().split(' ')[0];
      const formatted = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
      setName(formatted);
      trackEvent('name_voice_submitted', { name: formatted });
    }
  };

  const { isListening, isSpeaking, amplitude, startListening, stopListening, speakText, stopSpeaking } =
    useVoiceInteraction({
      onSpeechResult: handleSpeechResult,
    });

  const subtitleText = name
    ? `Great to meet you, ${name}! Let's understand your academic foundation.`
    : 'Nice to meet you. What should I call you?';

  useEffect(() => {
    speakText(subtitleText);
    return () => {
      stopSpeaking();
    };
  }, [name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your first name.');
      return;
    }
    const cleanName = name.trim().split(' ')[0];
    const formatted = cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
    trackEvent('name_submitted', { name: formatted });
    onComplete(formatted);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      <QalamCharacter
        state={isListening ? 'LISTENING' : isSpeaking ? 'SPEAKING' : name ? 'ENCOURAGING' : 'WELCOME'}
        audioAmplitude={amplitude}
        subtitles={subtitleText}
        onSpeak={() => speakText(subtitleText)}
      />

      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 my-2 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[#0b111e] flex items-center gap-1.5 mb-2">
              <User className="w-3.5 h-3.5 text-[#1f3861]" />
              Your First Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. Rahul, Ananya, Vikram..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-[#0b111e] font-semibold focus:outline-none focus:border-[#1f3861] focus:bg-white focus:ring-2 focus:ring-blue-100 transition pr-12"
                autoFocus
              />
              <button
                type="button"
                onClick={() => (isListening ? stopListening() : startListening())}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-xl transition cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-xs'
                    : 'text-slate-500 hover:text-[#1f3861] hover:bg-slate-200/70'
                }`}
                title="Speak your name"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        <span>You can speak or type your answers anytime.</span>
      </div>
    </div>
  );
};
