import React, { useState, useEffect } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { CONSUMER_CAREER_STREAMS, CareerStream } from '../../data/careerTaxonomy';
import { BookOpen, ArrowRight, Check, Code, Cpu, LineChart, Wrench, Shield, Layers } from 'lucide-react';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';

interface AskDepartmentStepProps {
  firstName: string;
  onComplete: (careerStreamId: string, departmentName: string) => void;
  trackEvent: (eventName: string, metadata?: any) => void;
  onBack?: () => void;
}

const STREAM_ICONS: Record<string, any> = {
  cse_it: Code,
  ece_eee: Cpu,
  mech_auto: Wrench,
  civil_infra: Layers,
  chem_biotech: LineChart,
  cyber_cloud: Shield,
};

export const AskDepartmentStep: React.FC<AskDepartmentStepProps> = ({
  firstName,
  onComplete,
  trackEvent,
}) => {
  const [selectedStream, setSelectedStream] = useState<CareerStream>(CONSUMER_CAREER_STREAMS[0]);

  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  const subtitleText = `And what's your department or branch, ${firstName || 'there'}?`;

  useEffect(() => {
    trackEvent('department_viewed');
    speakText(subtitleText);
    return () => {
      stopSpeaking();
    };
  }, [trackEvent, firstName]);

  const handleSelectStream = (stream: CareerStream) => {
    setSelectedStream(stream);
  };

  const handleNext = () => {
    trackEvent('department_selected', {
      careerStreamId: selectedStream.id,
      departmentName: selectedStream.title,
    });
    onComplete(selectedStream.id, selectedStream.title);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      <QalamCharacter
        state={isSpeaking ? 'SPEAKING' : 'WELCOME'}
        audioAmplitude={amplitude}
        subtitles={subtitleText}
        onSpeak={() => speakText(subtitleText)}
      />

      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 my-2 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-3.5">
        <label className="text-xs font-bold text-[#0b111e] flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-[#1f3861]" />
          Select Department / Stream
        </label>

        {/* Scrollable streams list */}
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {CONSUMER_CAREER_STREAMS.map((stream) => {
            const isSelected = selectedStream.id === stream.id;
            const IconComp = STREAM_ICONS[stream.id] || Code;
            return (
              <button
                key={stream.id}
                type="button"
                onClick={() => handleSelectStream(stream)}
                className={`w-full p-3.5 rounded-2xl border text-left transition flex items-start justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 border-[#1f3861] shadow-xs'
                    : 'bg-slate-50/70 border-slate-200/70 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? 'bg-[#1f3861] text-white' : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold ${isSelected ? 'text-[#1f3861]' : 'text-[#0b111e]'}`}>
                      {stream.title}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                      {stream.description}
                    </p>
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#1f3861] shrink-0 mt-1" />}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNext}
          className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        Filters 120+ industry benchmarks tailored to your engineering branch.
      </p>
    </div>
  );
};

