import React, { useState, useEffect } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { VoiceWaveform } from '../voice/VoiceWaveform';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { Sparkles, Send, Mic, MicOff, ArrowRight, RefreshCw, HelpCircle, MessageSquare } from 'lucide-react';

interface CareerDiscoveryStepProps {
  firstName: string;
  departmentName: string;
  careerStreamId: string;
  onIntentProcessed: (intentData: { userRawIntent: string; knownSkills?: string[] }) => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
  onBack?: () => void;
}

export const CareerDiscoveryStep: React.FC<CareerDiscoveryStepProps> = ({
  firstName,
  departmentName,
  careerStreamId,
  onIntentProcessed,
  trackEvent,
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'qalam' | 'user'; text: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const initialPrompt = `Hello ${firstName || 'there'}! Based on your ${departmentName} background, when you imagine yourself working 2 years from now, what kind of systems, products, or engineering problems do you want to work on?`;

  const handleSpeechResult = (spokenText: string) => {
    if (spokenText.trim()) {
      setInputText(spokenText.trim());
    }
  };

  const {
    isListening,
    isSpeaking,
    amplitude,
    transcript,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  } = useVoiceInteraction({ onSpeechResult: handleSpeechResult });

  useEffect(() => {
    trackEvent('career_discovery_started', { departmentName, careerStreamId });
    setMessages([{ sender: 'qalam', text: initialPrompt }]);
    speakText(initialPrompt);
    return () => stopSpeaking();
  }, [initialPrompt, speakText, stopSpeaking, trackEvent, departmentName, careerStreamId]);

  const handleSubmit = (textToSubmit?: string) => {
    const text = (textToSubmit || inputText || transcript).trim();
    if (!text || isProcessing) return;

    stopListening();
    stopSpeaking();
    setIsProcessing(true);

    trackEvent('career_intent_submitted', { intentLength: text.length, inputMethod: isListening ? 'voice' : 'type' });

    setMessages((prev) => [...prev, { sender: 'user', text }]);

    setTimeout(() => {
      onIntentProcessed({
        userRawIntent: text,
      });
    }, 600);
  };

  const suggestionChips = [
    'Building intelligent AI & machine learning systems',
    'Full stack web applications with React & APIs',
    'Embedded firmware, IoT & microcontrollers',
    'Data analytics, SQL pipelines & business intelligence',
    'Cloud infrastructure, DevOps & containerized systems',
    'Core engineering design, CAD & simulation',
  ];

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white space-y-3">
      <QalamCharacter
        state={isProcessing ? 'THINKING' : isSpeaking ? 'SPEAKING' : isListening ? 'LISTENING' : 'WELCOME'}
        audioAmplitude={amplitude}
        subtitles={messages[messages.length - 1]?.text || initialPrompt}
        onSpeak={() => {
          const lastQalam = messages.filter((m) => m.sender === 'qalam').pop();
          if (lastQalam) speakText(lastQalam.text);
        }}
      />

      <VoiceWaveform amplitude={amplitude} isListening={isListening} isSpeaking={isSpeaking} />

      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]">
            <Sparkles className="w-3.5 h-3.5 text-[#1f3861]" />
            <span>Conversational Career Discovery</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-semibold">Qalam Guide</span>
        </div>

        {/* Suggestion Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Tap a direction or speak freely:
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
            {suggestionChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setInputText(chip);
                  handleSubmit(chip);
                }}
                disabled={isProcessing}
                className="text-[10px] px-2.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:border-[#1f3861] hover:bg-blue-50 text-slate-700 font-medium transition cursor-pointer active:scale-95 disabled:opacity-50 text-left"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Voice and Text Input Area */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-center">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => {
                if (isListening) stopListening();
                else startListening();
              }}
              className={`p-4 rounded-full shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-40 ${
                isListening
                  ? 'bg-rose-500 hover:bg-rose-600 text-white ring-6 ring-rose-100 animate-pulse'
                  : 'bg-[#1f3861] hover:bg-[#182c4d] text-white'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>

          <p className="text-[10px] text-slate-500 text-center font-medium">
            {isProcessing
              ? 'Analyzing career pathways…'
              : isListening
              ? 'Listening... Speak your interests, projects, or goals'
              : 'Tap mic or type your career aspirations below'}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputText || transcript}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isProcessing}
              placeholder="e.g. I want to build AI models and deploy APIs..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs text-[#0b111e] font-medium focus:outline-none focus:border-[#1f3861] focus:bg-white transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={(!inputText.trim() && !transcript.trim()) || isProcessing}
              className="px-4 py-2 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs transition disabled:opacity-40 flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        Qalam matches your vision against published engineering benchmarks.
      </p>
    </div>
  );
};
