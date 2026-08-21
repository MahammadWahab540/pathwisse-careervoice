import React, { useState, useEffect } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { Mic, MicOff, Send, Sparkles, ArrowRight, HelpCircle, Compass, Brain, Code2, Database } from 'lucide-react';

interface CareerIntentStepProps {
  firstName: string;
  departmentName: string;
  careerStreamId: string;
  onIntentProcessed: (intentData: {
    stateType: 'KNOWS_ROLE' | 'KNOWS_DIRECTION' | 'DOESNT_KNOW';
    userRawIntent: string;
    detectedDirection?: string;
  }) => void;
  trackEvent: (eventName: string, metadata?: any) => void;
  onBack?: () => void;
}

export const CareerIntentStep: React.FC<CareerIntentStepProps> = ({
  firstName,
  departmentName,
  careerStreamId,
  onIntentProcessed,
  trackEvent,
}) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [subStep, setSubStep] = useState<'INITIAL' | 'DISCOVERY_Q1' | 'DISCOVERY_Q2'>('INITIAL');
  const [discoveryAnswers, setDiscoveryAnswers] = useState<string[]>([]);

  useEffect(() => {
    trackEvent('career_intent_started', { departmentName, careerStreamId });
  }, [trackEvent]);

  const handleSpeechResult = (text: string) => {
    if (!text.trim()) return;
    setInputText(text);
    trackEvent('career_intent_voice_submitted', { text });
  };

  const { isListening, isSpeaking, amplitude, startListening, stopListening, speakText, stopSpeaking } =
    useVoiceInteraction({
      onSpeechResult: handleSpeechResult,
    });

  const subtitleText =
    subStep === 'INITIAL'
      ? `${departmentName} opens a lot of doors, ${firstName}. What kind of work sounds most interesting to you right now?`
      : subStep === 'DISCOVERY_Q1'
      ? "Perfect. Let's find your edge. Which type of work naturally excites you most?"
      : "Got it! When tackling problems, what environment do you prefer?";

  useEffect(() => {
    speakText(subtitleText);
    return () => {
      stopSpeaking();
    };
  }, [subStep, departmentName, firstName]);

  const processIntent = (text: string) => {
    const lower = text.toLowerCase();
    trackEvent('career_intent_submitted', { text });
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      // Check STATE A: KNOWS_ROLE
      if (
        lower.includes('machine learning') ||
        lower.includes('ml engineer') ||
        lower.includes('full stack') ||
        lower.includes('data analyst') ||
        lower.includes('embedded') ||
        lower.includes('cad') ||
        lower.includes('vlsi') ||
        lower.includes('site engineer') ||
        lower.includes('cybersecurity') ||
        lower.includes('devops') ||
        lower.includes('robotics')
      ) {
        trackEvent('career_direction_detected', { stateType: 'KNOWS_ROLE' });
        onIntentProcessed({
          stateType: 'KNOWS_ROLE',
          userRawIntent: text,
          detectedDirection: text,
        });
      }
      // Check STATE C: DOESNT_KNOW
      else if (
        lower.includes('no idea') ||
        lower.includes("don't know") ||
        lower.includes('not sure') ||
        lower.includes('confused') ||
        lower.includes('anything')
      ) {
        trackEvent('career_direction_detected', { stateType: 'DOESNT_KNOW' });
        setSubStep('DISCOVERY_Q1');
      }
      // STATE B: KNOWS_DIRECTION
      else {
        trackEvent('career_direction_detected', { stateType: 'KNOWS_DIRECTION' });
        onIntentProcessed({
          stateType: 'KNOWS_DIRECTION',
          userRawIntent: text,
          detectedDirection: text,
        });
      }
    }, 500);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    processIntent(inputText);
  };

  const handleDiscoveryChoice = (choiceText: string) => {
    const updated = [...discoveryAnswers, choiceText];
    setDiscoveryAnswers(updated);
    trackEvent('discovery_question_answered', { choiceText, step: subStep });

    if (subStep === 'DISCOVERY_Q1') {
      setSubStep('DISCOVERY_Q2');
    } else {
      // Completed discovery questions
      onIntentProcessed({
        stateType: 'DOESNT_KNOW',
        userRawIntent: updated.join('; '),
        detectedDirection: updated[0],
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      <QalamCharacter
        state={isProcessing ? 'THINKING' : isListening ? 'LISTENING' : isSpeaking ? 'SPEAKING' : 'CURIOUS'}
        audioAmplitude={amplitude}
        subtitles={subtitleText}
        onSpeak={() => speakText(subtitleText)}
      />

      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 my-2 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        {subStep === 'INITIAL' ? (
          <div className="space-y-4">
            <form onSubmit={handleTextSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#0b111e] flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#1f3861]" />
                  What are you excited to build or learn?
                </label>
                <div className="relative">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="e.g. Building LLM applications, full-stack systems, core embedded chips, or I'm exploring..."
                    className="w-full h-24 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-[#0b111e] font-medium focus:outline-none focus:border-[#1f3861] focus:bg-white focus:ring-2 focus:ring-blue-100 transition resize-none leading-relaxed"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => (isListening ? stopListening() : startListening())}
                    className={`absolute right-3 bottom-3 p-2 rounded-xl transition cursor-pointer ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse shadow-xs'
                        : 'bg-slate-200 text-slate-700 hover:bg-[#1f3861] hover:text-white'
                    }`}
                    title="Speak your career interest"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || isProcessing}
                className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-40 active:scale-[0.98] cursor-pointer"
              >
                <span>{isProcessing ? 'Analyzing Intent...' : 'Analyze My Intent'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Or pick a track
              </span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => processIntent('I want to work with Artificial Intelligence & Machine Learning')}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-semibold text-[#0b111e] text-left transition flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <span>Building AI & Machine Learning applications</span>
              </button>
              <button
                type="button"
                onClick={() => processIntent('I want to build full stack web apps and scalable APIs')}
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-semibold text-[#0b111e] text-left transition flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Code2 className="w-3.5 h-3.5" />
                </div>
                <span>Full-Stack Software & Cloud Architecture</span>
              </button>
              <button
                type="button"
                onClick={() => processIntent("I'm not sure yet, help me explore step by step")}
                className="w-full p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs font-bold text-[#1f3861] text-left transition flex items-center gap-2.5 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
                <span>I'm not sure yet — guide me with questions</span>
              </button>
            </div>
          </div>
        ) : subStep === 'DISCOVERY_Q1' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#1f3861] uppercase tracking-wider">
                Discovery Stage 1 of 2
              </span>
              <span className="text-[10px] text-slate-400">50% Complete</span>
            </div>
            <button
              onClick={() => handleDiscoveryChoice('Building software, apps, or AI systems')}
              className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-semibold text-[#0b111e] text-left transition flex items-center gap-2.5 cursor-pointer"
            >
              <span className="text-base">💻</span>
              <span>Building software, web apps, or AI systems</span>
            </button>
            <button
              onClick={() => handleDiscoveryChoice('Working with data, numbers, and analytics')}
              className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-semibold text-[#0b111e] text-left transition flex items-center gap-2.5 cursor-pointer"
            >
              <span className="text-base">📊</span>
              <span>Working with data, numbers, and business trends</span>
            </button>
            <button
              onClick={() => handleDiscoveryChoice('Hardware, electronics, or physical engineering systems')}
              className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-semibold text-[#0b111e] text-left transition flex items-center gap-2.5 cursor-pointer"
            >
              <span className="text-base">⚙️</span>
              <span>Hardware, robotics, or physical systems</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#1f3861] uppercase tracking-wider">
                Discovery Stage 2 of 2
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">Final Question</span>
            </div>
            <button
              onClick={() => handleDiscoveryChoice('Hands-on coding and algorithmic logic')}
              className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-semibold text-[#0b111e] text-left transition flex items-center gap-2.5 cursor-pointer"
            >
              <span className="text-base">🚀</span>
              <span>Hands-on coding & algorithmic logic</span>
            </button>
            <button
              onClick={() => handleDiscoveryChoice('High-level system design and product strategy')}
              className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-semibold text-[#0b111e] text-left transition flex items-center gap-2.5 cursor-pointer"
            >
              <span className="text-base">🎯</span>
              <span>High-level architecture & product design</span>
            </button>
            <button
              onClick={() => handleDiscoveryChoice('Research, experimentation, and novel technologies')}
              className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-semibold text-[#0b111e] text-left transition flex items-center gap-2.5 cursor-pointer"
            >
              <span className="text-base">🔬</span>
              <span>Research, experimentation & novel tech</span>
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        Qalam matches your preferences with current 2026 hiring demand signals.
      </p>
    </div>
  );
};

