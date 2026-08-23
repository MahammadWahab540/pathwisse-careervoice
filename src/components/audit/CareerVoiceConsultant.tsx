import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  Briefcase,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Lightbulb,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { askCareerGuidance, type CareerGuidanceResponse } from '../../api/careerGuidance';
import { QalamCharacter } from '../qalam/QalamCharacter';

interface CareerVoiceConsultantProps {
  isOpen: boolean;
  onClose: () => void;
  targetRoleTitle: string;
  firstName?: string;
  departmentName?: string;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
}

export const CareerVoiceConsultant: React.FC<CareerVoiceConsultantProps> = ({
  isOpen,
  onClose,
  targetRoleTitle,
  firstName = 'Friend',
  departmentName = 'Engineering',
  trackEvent,
}) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [guidanceResult, setGuidanceResult] = useState<CareerGuidanceResponse | null>(null);

  const handleSpeechResult = (text: string) => {
    if (text.trim()) {
      setInputText(text.trim());
      void handleAskQuestion(text.trim());
    }
  };

  const {
    isListening,
    isSpeaking,
    amplitude,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  } = useVoiceInteraction({
    onSpeechResult: handleSpeechResult,
  });

  const SUGGESTED_QUESTIONS = [
    `What does a ${targetRoleTitle} actually do day-to-day?`,
    `What salary and package can I expect for ${targetRoleTitle}?`,
    `Which key skills must I prepare for campus placements?`,
    `How does ${targetRoleTitle} compare to other engineering tracks?`,
  ];

  const handleAskQuestion = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;
    stopListening();
    stopSpeaking();
    setIsLoading(true);

    trackEvent('career_voice_question_asked', {
      targetRole: targetRoleTitle,
      question: questionText,
    });

    try {
      const response = await askCareerGuidance({
        question: questionText,
        targetRole: targetRoleTitle,
        studentProfile: {
          firstName,
          branch: departmentName,
        },
      });

      setGuidanceResult(response);
      if (response.spokenSummary) {
        speakText(response.spokenSummary);
      }
    } catch (err) {
      console.warn('Error fetching career guidance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1f3861] text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0b111e]">Ask Qalam About Careers</h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Exploring <span className="font-bold text-[#1f3861]">{targetRoleTitle}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                stopListening();
                onClose();
              }}
              className="p-1.5 rounded-full hover:bg-slate-200/80 text-slate-500 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-left">
            {/* Qalam Mini Avatar & Voice Wave */}
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <QalamCharacter
                state={isLoading ? 'THINKING' : isSpeaking ? 'SPEAKING' : isListening ? 'LISTENING' : 'WELCOME'}
                audioAmplitude={amplitude}
                onSpeak={() => {
                  if (guidanceResult?.spokenSummary) speakText(guidanceResult.spokenSummary);
                }}
              />
              <p className="text-xs text-slate-600 font-medium mt-1 text-center">
                {isLoading
                  ? 'Analyzing career requirements...'
                  : isSpeaking
                  ? 'Qalam is speaking...'
                  : isListening
                  ? 'Listening to your question...'
                  : `Ask me anything about ${targetRoleTitle} roles, salaries, or daily work.`}
              </p>
            </div>

            {/* AI Guidance Result Card */}
            {guidanceResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 text-slate-800"
              >
                {/* Spoken Summary & Speaker button */}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold leading-relaxed text-slate-900">
                    {guidanceResult.spokenSummary}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (isSpeaking) stopSpeaking();
                      else speakText(guidanceResult.spokenSummary);
                    }}
                    className="p-1.5 rounded-full bg-white border border-blue-200 text-[#1f3861] hover:bg-blue-100 transition shrink-0 cursor-pointer shadow-xs"
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Day-to-Day Responsibilities */}
                {guidanceResult.dayToDay?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-[#1f3861] flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      What Day-to-Day Work Looks Like:
                    </span>
                    <ul className="space-y-1 pl-1">
                      {guidanceResult.dayToDay.map((item, idx) => (
                        <li key={idx} className="text-[11px] text-slate-700 flex items-start gap-1.5 leading-snack">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1f3861] mt-1 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Badges: Salary & Market Demand */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-600" />
                      Salary & Packages
                    </span>
                    <p className="text-[11px] font-semibold text-slate-800 mt-0.5 leading-tight">
                      {guidanceResult.salaryInsight}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-blue-600" />
                      Market Demand
                    </span>
                    <p className="text-[11px] font-semibold text-slate-800 mt-0.5 leading-tight">
                      {guidanceResult.demandInsight}
                    </p>
                  </div>
                </div>

                {/* Key Prerequisites */}
                {guidanceResult.keyPrerequisites?.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Core Prerequisites:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {guidanceResult.keyPrerequisites.map((prereq) => (
                        <span
                          key={prereq}
                          className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700"
                        >
                          {prereq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actionable Tip */}
                {guidanceResult.actionableTip && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Placement Tip:</strong> {guidanceResult.actionableTip}
                    </span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Suggested Question Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-[#1f3861]" />
                Suggested Questions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(q);
                      void handleAskQuestion(q);
                    }}
                    className="text-[10px] text-left font-medium px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-[#1f3861] hover:border-blue-200 border border-transparent transition cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Input Bar */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAskQuestion(inputText);
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => {
                  if (isListening) stopListening();
                  else startListening();
                }}
                className={`p-2.5 rounded-full transition cursor-pointer shadow-xs ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-blue-50 text-[#1f3861] border border-blue-200 hover:bg-blue-100'
                }`}
                title={isListening ? 'Stop Listening' : 'Ask with Voice'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Ask anything about ${targetRoleTitle}...`}
                className="flex-1 px-4 py-2 text-xs rounded-full border border-slate-200 focus:outline-hidden focus:border-[#1f3861] focus:ring-1 focus:ring-[#1f3861] bg-slate-50"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-2.5 rounded-full bg-[#1f3861] text-white hover:bg-[#182c4d] disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-xs"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
