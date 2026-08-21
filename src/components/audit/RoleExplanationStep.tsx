import React, { useEffect, useState } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { CareerRole } from '../../data/careerTaxonomy';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { CheckCircle2, ArrowRight, RefreshCw, Sparkles, Target, Award, Briefcase } from 'lucide-react';

interface RoleExplanationStepProps {
  role: CareerRole;
  firstName: string;
  onConfirmTargetRole: (confirmedRole: CareerRole) => void;
  onExploreAnotherRole: () => void;
  trackEvent: (eventName: string, metadata?: any) => void;
  onBack?: () => void;
}

export const RoleExplanationStep: React.FC<RoleExplanationStepProps> = ({
  role,
  firstName,
  onConfirmTargetRole,
  onExploreAnotherRole,
  trackEvent,
}) => {
  const [qalamAudioDone, setQalamAudioDone] = useState(false);

  const explanationText =
    `An ${role.title} is responsible for ${role.description.toLowerCase()} ` +
    `Day-to-day, you'll work with ${role.keySkills.slice(0, 3).join(', ')}. ` +
    `It's a high-impact engineering career with strong industry demand.`;

  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  useEffect(() => {
    trackEvent('role_explanation_opened', { roleId: role.id, title: role.title });
    speakText(explanationText, () => setQalamAudioDone(true));

    return () => {
      stopSpeaking();
    };
  }, [role]);

  const handleConfirm = () => {
    trackEvent('role_confirmed', { roleId: role.id, title: role.title });
    onConfirmTargetRole(role);
  };

  const handleMaybe = () => {
    trackEvent('role_marked_maybe', { roleId: role.id, title: role.title });
    onExploreAnotherRole();
  };

  const handleNotReally = () => {
    trackEvent('role_rejected', { roleId: role.id, title: role.title });
    onExploreAnotherRole();
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      <QalamCharacter
        state={isSpeaking ? 'SPEAKING' : 'CURIOUS'}
        audioAmplitude={amplitude}
        subtitles={explanationText}
        onSpeak={() => speakText(explanationText, () => setQalamAudioDone(true))}
      />

      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 my-2 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1f3861] flex items-center gap-1">
              <Target className="w-3 h-3 text-[#1f3861]" />
              Role Benchmark
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              {role.demandLevel} Demand
            </span>
          </div>

          <h2 className="text-base font-bold text-[#0b111e]">{role.title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">{role.description}</p>

          <div className="pt-2.5 border-t border-slate-200/70">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">
              Core Competencies Tested:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {role.keySkills.map((sk) => (
                <span
                  key={sk}
                  className="text-[10px] px-2.5 py-0.5 rounded-lg bg-white text-[#1f3861] border border-slate-200 font-mono font-bold shadow-2xs"
                >
                  {sk}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <p className="text-xs font-bold text-[#0b111e] text-center">
            Ready to audit your readiness for {role.title}, {firstName}?
          </p>

          <button
            onClick={handleConfirm}
            className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Audit Me For This Target Role</span>
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleMaybe}
              className="py-2.5 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Maybe / Not Sure
            </button>
            <button
              onClick={handleNotReally}
              className="py-2.5 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Try Another Role
            </button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        Target role benchmark can be adjusted at any point during your learning journey.
      </p>
    </div>
  );
};

