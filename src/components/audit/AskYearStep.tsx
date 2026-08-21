import React, { useState, useEffect } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { Calendar, ArrowRight, Check, Clock } from 'lucide-react';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';

interface AskYearStepProps {
  firstName: string;
  onComplete: (academicYear: string) => void;
  trackEvent: (eventName: string, metadata?: any) => void;
  onBack?: () => void;
}

const YEARS = [
  { label: '1st Year', sub: 'Foundations & Exploration', window: 'Placements in ~36 mos' },
  { label: '2nd Year', sub: 'Core DSA & Projects', window: 'Placements in ~24 mos' },
  { label: '3rd Year', sub: 'Internships & System Design', window: 'Placements in ~12 mos' },
  { label: 'Final Year', sub: 'Active Campus Drives & Full-Time', window: 'Immediate Hiring Season' },
  { label: 'Recent Graduate', sub: 'Off-Campus & Lateral Openings', window: 'Immediate Joiner' },
];

export const AskYearStep: React.FC<AskYearStepProps> = ({
  firstName,
  onComplete,
  trackEvent,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>(YEARS[2].label); // Default 3rd Year

  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  const subtitleText = `Which academic year are you currently in, ${firstName || 'friend'}?`;

  useEffect(() => {
    speakText(subtitleText);
    return () => {
      stopSpeaking();
    };
  }, [firstName]);

  const handleNext = () => {
    trackEvent('academic_year_selected', { academicYear: selectedYear });
    onComplete(selectedYear);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      <QalamCharacter
        state={isSpeaking ? 'SPEAKING' : 'CURIOUS'}
        audioAmplitude={amplitude}
        subtitles={subtitleText}
        onSpeak={() => speakText(subtitleText)}
      />

      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 my-2 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-3.5">
        <label className="text-xs font-bold text-[#0b111e] flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#1f3861]" />
          Academic Year / Stage
        </label>

        <div className="space-y-2">
          {YEARS.map((y) => {
            const isSelected = selectedYear === y.label;
            return (
              <button
                key={y.label}
                type="button"
                onClick={() => setSelectedYear(y.label)}
                className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 border-[#1f3861] shadow-xs'
                    : 'bg-slate-50/70 border-slate-200/70 hover:border-slate-300'
                }`}
              >
                <div>
                  <span className={`text-xs font-bold ${isSelected ? 'text-[#1f3861]' : 'text-[#0b111e]'}`}>
                    {y.label}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mt-0.5">
                    <span>{y.sub}</span>
                    <span>•</span>
                    <span className="text-[#1f3861] font-semibold flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {y.window}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#1f3861] shrink-0" />}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNext}
          className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer mt-3"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        Tailors expectations, project rigor, and placement readiness windows.
      </p>
    </div>
  );
};

