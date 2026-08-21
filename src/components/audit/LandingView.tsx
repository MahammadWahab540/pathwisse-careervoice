import React, { useEffect } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { ArrowRight, Sparkles, ShieldCheck, Clock, Compass, BarChart3, Radio } from 'lucide-react';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';

interface LandingViewProps {
  onStart: () => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onStart, trackEvent }) => {
  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  const subtitleText =
    "Hello! I am Qalam, your career mentor. In 3 quick minutes, I'll analyze your current skills, show your industry readiness score, and generate your 6-week gap roadmap.";

  useEffect(() => {
    trackEvent('audit_landing_viewed');
    return () => {
      stopSpeaking();
    };
  }, [trackEvent]);

  const handleStartAudit = () => {
    trackEvent('audit_started');
    onStart();
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-5 py-5 text-center max-w-sm mx-auto selection:bg-[#1f3861] selection:text-white">
      {/* Top Apple-Style Pill Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-[#1f3861] text-xs font-semibold shadow-xs backdrop-blur-md">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
        </span>
        <span className="tracking-tight text-[11px] font-bold">Pathwisse Qalam 2.0</span>
        <span className="text-slate-300">•</span>
        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" /> ~3 mins
        </span>
      </div>

      {/* Hero Headline */}
      <div className="space-y-2 my-2">
        <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#0b111e] tracking-tight leading-[1.18]">
          Discover your true career readiness.
        </h1>
        <p className="text-xs text-[#344256] leading-relaxed font-normal px-2">
          An autonomous AI interview that evaluates your real engineering skills, maps critical blockers, and builds your personalised 6-week action plan.
        </p>
      </div>

      {/* Central Living Mascot Qalam */}
      <div
        className="my-1 cursor-pointer transition hover:scale-[1.02] active:scale-[0.98]"
        onClick={handleStartAudit}
      >
        <QalamCharacter
          state={isSpeaking ? 'SPEAKING' : 'WELCOME'}
          audioAmplitude={amplitude}
          subtitles={subtitleText}
          onSpeak={() => speakText(subtitleText)}
        />
      </div>

      {/* 3 Apple-Style Feature Chips */}
      <div className="w-full grid grid-cols-3 gap-2 my-2 text-left">
        <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 shadow-xs flex flex-col justify-between">
          <Radio className="w-4 h-4 text-blue-600 mb-1" />
          <div>
            <div className="text-[11px] font-bold text-[#0b111e] leading-tight">Voice Probing</div>
            <div className="text-[9px] text-[#475569] mt-0.5">Adaptive Q&A</div>
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 shadow-xs flex flex-col justify-between">
          <BarChart3 className="w-4 h-4 text-indigo-600 mb-1" />
          <div>
            <div className="text-[11px] font-bold text-[#0b111e] leading-tight">Gap Matrix</div>
            <div className="text-[9px] text-[#475569] mt-0.5">Industry scoring</div>
          </div>
        </div>

        <div className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 shadow-xs flex flex-col justify-between">
          <Compass className="w-4 h-4 text-emerald-600 mb-1" />
          <div>
            <div className="text-[11px] font-bold text-[#0b111e] leading-tight">6-Wk Plan</div>
            <div className="text-[9px] text-[#475569] mt-0.5">Weekly roadmap</div>
          </div>
        </div>
      </div>

      {/* Primary CTA and Reassurance */}
      <div className="w-full space-y-2 mt-1">
        <button
          onClick={handleStartAudit}
          className="w-full py-3.5 px-6 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
        >
          <span>Start My Career Audit</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>100% Free · Real-time AI evaluation · Zero spam</span>
        </div>
      </div>
    </div>
  );
};


