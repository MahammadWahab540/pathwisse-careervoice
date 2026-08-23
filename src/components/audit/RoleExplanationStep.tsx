import React, { useEffect, useState } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { useRoleCompetencies } from '../../hooks/useCareerRoles';
import { RoleComparisonView } from './RoleComparisonView';
import type { CareerRoleDto, RoleRecommendationDto } from '../../types/career';
import {
  CheckCircle2,
  ArrowRight,
  Target,
  Award,
  Briefcase,
  Scale,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Cpu,
  Layers,
  HelpCircle,
  MessageSquareQuote,
} from 'lucide-react';
import { CareerVoiceConsultant } from './CareerVoiceConsultant';

interface RoleExplanationStepProps {
  role: CareerRoleDto;
  firstName: string;
  departmentName?: string;
  allRecommendedRoles?: RoleRecommendationDto[];
  onConfirmTargetRole: (confirmedRole: CareerRoleDto) => void;
  onExploreAnotherRole: () => void;
  onSelectDifferentRole?: (role: CareerRoleDto) => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
  onBack?: () => void;
}

export const RoleExplanationStep: React.FC<RoleExplanationStepProps> = ({
  role,
  firstName,
  departmentName,
  allRecommendedRoles = [],
  onConfirmTargetRole,
  onExploreAnotherRole,
  onSelectDifferentRole,
  trackEvent,
}) => {
  const [isComparing, setIsComparing] = useState(false);
  const [isConsultantOpen, setIsConsultantOpen] = useState(false);
  const { data: competencyModel, isLoading: isCompetencyLoading } = useRoleCompetencies(role.id);

  const explanationText =
    `As a ${role.title}, you will be responsible for ${role.description.toLowerCase()} ` +
    `Day-to-day tools and competencies include ${role.keySkills.slice(0, 3).join(', ')}. ` +
    `Ready to audit your practical readiness against this benchmark, ${firstName || 'friend'}?`;

  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  useEffect(() => {
    trackEvent('role_explanation_opened', { roleId: role.id, title: role.title });
    speakText(explanationText);
    return () => stopSpeaking();
  }, [role.id, role.title, explanationText, speakText, stopSpeaking, trackEvent]);

  const handleConfirm = () => {
    trackEvent('role_confirmed', { roleId: role.id, title: role.title });
    onConfirmTargetRole(role);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-4 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white space-y-3">
      <QalamCharacter
        state={isSpeaking ? 'SPEAKING' : 'CURIOUS'}
        audioAmplitude={amplitude}
        subtitles={explanationText}
        onSpeak={() => speakText(explanationText)}
      />

      {/* Main Container */}
      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        {/* Header Badge */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1f3861] flex items-center gap-1">
              <Target className="w-3 h-3 text-[#1f3861]" />
              Role Blueprint
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" />
              {role.demandLevel} Demand
            </span>
          </div>

          <div>
            <h2 className="text-base font-bold text-[#0b111e]">{role.title}</h2>
            <p className="text-xs text-slate-600 leading-relaxed font-medium mt-1">
              {role.description}
            </p>
          </div>

          {/* What You'll Actually Do / Fit Reason */}
          {role.fitReason && (
            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 text-[11px] text-slate-700 leading-relaxed">
              <span className="font-bold text-[#1f3861] block mb-0.5">Why This Fits You:</span>
              {role.fitReason}
            </div>
          )}

          {/* Core Competencies Benchmark */}
          <div className="pt-2 border-t border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Benchmark Competencies:
              </span>
              {competencyModel?.minimumReadinessBenchmark && (
                <span className="text-[10px] font-mono text-[#1f3861] font-bold">
                  Bar: {competencyModel.minimumReadinessBenchmark}/100
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(competencyModel?.coreCompetencies || role.keySkills.map((s, idx) => ({ skillId: `s_${idx}`, skillName: s }))).map((comp) => (
                <span
                  key={comp.skillId}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-white text-[#1f3861] border border-slate-200 font-mono font-bold shadow-2xs"
                >
                  {comp.skillName}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5 pt-1">
          <p className="text-xs font-bold text-[#0b111e] text-center">
            Ready to audit your <span className="text-[#1f3861]">{role.title}</span> readiness, {firstName || 'friend'}?
          </p>

          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Choose This Track & Start Audit</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsConsultantOpen(true);
              trackEvent('career_voice_consultant_opened', { targetRole: role.title });
            }}
            className="w-full py-2.5 px-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs font-bold text-amber-900 hover:bg-amber-100 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <MessageSquareQuote className="w-4 h-4 text-amber-600" />
            <span>Ask Qalam About {role.title}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onExploreAnotherRole}
              className="py-2.5 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer text-center"
            >
              Explore Other Roles
            </button>
            {allRecommendedRoles.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setIsComparing(true);
                  trackEvent('role_comparison_opened_from_detail');
                }}
                className="py-2.5 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-[#1f3861] hover:bg-blue-50 transition cursor-pointer flex items-center justify-center gap-1"
              >
                <Scale className="w-3.5 h-3.5" />
                Compare Tracks
              </button>
            )}
          </div>
        </div>
      </div>

      {isComparing && (
        <RoleComparisonView
          roles={allRecommendedRoles}
          selectedRoleId={role.id}
          onSelectRole={(newRole) => {
            setIsComparing(false);
            onSelectDifferentRole?.(newRole);
          }}
          onClose={() => setIsComparing(false)}
          trackEvent={trackEvent}
        />
      )}

      {isConsultantOpen && (
        <CareerVoiceConsultant
          isOpen={isConsultantOpen}
          onClose={() => setIsConsultantOpen(false)}
          targetRoleTitle={role.title}
          firstName={firstName}
          departmentName={departmentName}
          trackEvent={trackEvent}
        />
      )}

      <p className="text-[10px] text-slate-400 font-medium">
        All competencies and benchmark weights come directly from live CareerVoice models.
      </p>
    </div>
  );
};
