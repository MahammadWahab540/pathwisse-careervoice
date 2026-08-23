import React, { useState, useEffect, useRef } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { VoiceWaveform } from '../voice/VoiceWaveform';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { Sparkles, Send, Mic, MicOff } from 'lucide-react';
import {
  getCareerDiscoveryState,
  submitCareerDiscoveryAnswer,
  type DiscoveryQuestionDto,
} from '../../api/careerDiscovery';

interface CareerDiscoveryStepProps {
  studentId?: string;
  firstName: string;
  departmentName: string;
  careerStreamId: string;
  academicYear?: string;
  onIntentProcessed: (intentData: { userRawIntent: string; knownSkills?: string[]; discoveryProfile?: Record<string, unknown> }) => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
  onBack?: () => void;
}

export const CareerDiscoveryStep: React.FC<CareerDiscoveryStepProps> = ({
  studentId,
  firstName,
  departmentName,
  careerStreamId,
  academicYear,
  onIntentProcessed,
  trackEvent,
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'qalam' | 'user'; text: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<DiscoveryQuestionDto | null>(null);
  const [discoveryProfile, setDiscoveryProfile] = useState<Record<string, unknown>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const onIntentProcessedRef = useRef(onIntentProcessed);

  const initialPrompt = currentQuestion?.prompt || `Hello ${firstName || 'there'}! I am preparing questions for your branch.`;
  const isMechanical = /mechanical|mech/i.test(departmentName || '');
  const discoveryTitle = isMechanical ? 'Mechanical Career Discovery' : 'Conversational Career Discovery';
  const inputHint = isMechanical
    ? 'Answer with core Mechanical, hybrid robotics/data, or say if you want IT/software'
    : 'Answer with your branch-specific interests, projects, skills, or switch intent';
  const placeholder = currentQuestion
    ? currentQuestion.key === 'itSwitch'
      ? 'e.g. I want to stay core, explore hybrid, or switch to IT/software'
      : isMechanical
      ? 'e.g. CAD design, manufacturing, thermal, robotics, EV, or IT/software'
      : 'Type your answer...'
    : 'Loading discovery question...';

  useEffect(() => {
    onIntentProcessedRef.current = onIntentProcessed;
  }, [onIntentProcessed]);

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
    let isMounted = true;
    trackEvent('career_discovery_started', { departmentName, careerStreamId });
    setLoadError(null);
    getCareerDiscoveryState({ studentId, branch: departmentName, academicYear })
      .then((state) => {
        if (!isMounted) return;
        setDiscoveryProfile(state.profile || {});
        setCurrentQuestion(state.nextQuestion);
        const prompt = state.nextQuestion?.prompt || 'I have enough discovery signals to recommend career directions.';
        setMessages([{ sender: 'qalam', text: prompt }]);
        speakText(prompt);
        if (!state.nextQuestion) {
          onIntentProcessedRef.current({
            userRawIntent: String(state.profile?.explicitCareerIntent || state.profile?.interests?.join(', ') || ''),
            knownSkills: Array.isArray(state.profile?.skills) ? state.profile.skills : [],
            discoveryProfile: state.profile as Record<string, unknown>,
          });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadError(err instanceof Error ? err.message : 'Could not load career discovery.');
      });
    return () => {
      isMounted = false;
      stopSpeaking();
    };
  }, [studentId, departmentName, academicYear, careerStreamId, speakText, stopSpeaking, trackEvent]);

  const handleSubmit = async (textToSubmit?: string) => {
    const text = (textToSubmit || inputText || transcript).trim();
    if (!text || isProcessing || !currentQuestion) return;

    stopListening();
    stopSpeaking();
    setIsProcessing(true);

    trackEvent('discovery_question_answered', {
      questionKey: currentQuestion.key,
      answerLength: text.length,
      inputMethod: isListening ? 'voice' : 'type',
    });

    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setInputText('');

    try {
      const state = await submitCareerDiscoveryAnswer({
        studentId,
        branch: departmentName,
        academicYear,
        questionKey: currentQuestion.key,
        answer: text,
      });
      setDiscoveryProfile(state.profile || {});
      setCurrentQuestion(state.nextQuestion);
      if (state.nextQuestion) {
        setMessages((prev) => [...prev, { sender: 'qalam', text: state.nextQuestion!.prompt }]);
        speakText(state.nextQuestion.prompt);
      } else {
        const profile = state.profile || {};
        const intent = String(
          profile.explicitCareerIntent ||
            (Array.isArray(profile.interests) ? profile.interests.join(', ') : '') ||
            text,
        );
        trackEvent('career_discovery_completed');
        setMessages((prev) => [...prev, { sender: 'qalam', text: 'I have enough evidence to recommend career directions for you.' }]);
        onIntentProcessedRef.current({
          userRawIntent: intent,
          knownSkills: Array.isArray(profile.skills) ? profile.skills : [],
          discoveryProfile: profile as Record<string, unknown>,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save this discovery answer.';
      setLoadError(message);
    } finally {
      setIsProcessing(false);
    }
  };

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
            <span>{discoveryTitle}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-semibold">Qalam Guide</span>
        </div>

        {loadError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
            {loadError}
          </div>
        )}

        {/* Suggestion Chips */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Tap an answer or speak freely:
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
            {(currentQuestion?.suggestions || []).map((chip) => (
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
              : inputHint}
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
              disabled={isProcessing || !currentQuestion}
              placeholder={placeholder}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs text-[#0b111e] font-medium focus:outline-none focus:border-[#1f3861] focus:bg-white transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={(!inputText.trim() && !transcript.trim()) || isProcessing || !currentQuestion}
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
