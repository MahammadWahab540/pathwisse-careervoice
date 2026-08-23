import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { useRoleRecommendations } from '../../hooks/useCareerRoles';
import { RoleComparisonView } from './RoleComparisonView';
import type { RoleRecommendationDto } from '../../types/career';
import { Sparkles, ChevronRight, TrendingUp, Loader2, Scale, RefreshCw, AlertCircle, MessageSquareQuote, HelpCircle } from 'lucide-react';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { CareerVoiceConsultant } from './CareerVoiceConsultant';

interface RoleDiscoveryStepProps {
  firstName: string;
  careerStreamId: string;
  departmentName: string;
  userRawIntent: string;
  knownSkills?: string[];
  onSelectRoleForExplanation: (role: RoleRecommendationDto) => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
  onBack?: () => void;
}

export const RoleDiscoveryStep: React.FC<RoleDiscoveryStepProps> = ({
  firstName,
  careerStreamId,
  departmentName,
  userRawIntent,
  knownSkills = [],
  onSelectRoleForExplanation,
  trackEvent,
}) => {
  const [isComparing, setIsComparing] = useState(false);
  const [consultantRole, setConsultantRole] = useState<string | null>(null);
  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  const { data: roles = [], isLoading, error, refetch } = useRoleRecommendations({
    careerStreamId,
    careerIntent: userRawIntent,
    branch: departmentName,
    knownSkills,
  });

  const subtitleText = `I analyzed your background and career intent against verified CareerVoice engineering tracks, ${firstName || 'friend'}. Here are your best-fitting directions.`;

  React.useEffect(() => {
    speakText(subtitleText);
    return () => stopSpeaking();
  }, [subtitleText, speakText, stopSpeaking]);

  const recommendedRoles = roles.slice(0, 5);

  const getRecommendationLabel = (index: number, fitBand: string) => {
    if (index === 0 || fitBand === 'Strong Fit') return 'Strong Direction';
    if (index === 1 || fitBand === 'Good Fit') return 'Worth Exploring';
    return 'Alternative Path';
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white space-y-3">
      <QalamCharacter
        state={isSpeaking ? 'SPEAKING' : 'WELCOME'}
        audioAmplitude={amplitude}
        subtitles={subtitleText}
        onSpeak={() => speakText(subtitleText)}
      />

      <div className="w-full space-y-3 text-left">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#1f3861]" />
            <span className="text-xs font-bold text-[#0b111e]">Recommended Career Directions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const target = recommendedRoles[0]?.title || 'Software Engineer';
                setConsultantRole(target);
                trackEvent('career_voice_consultant_opened', { targetRole: target });
              }}
              className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200/80 hover:bg-amber-100/80 px-2.5 py-1 rounded-full flex items-center gap-1 transition cursor-pointer shadow-2xs"
            >
              <MessageSquareQuote className="w-3 h-3 text-amber-600" />
              Ask Qalam
            </button>
            {recommendedRoles.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setIsComparing(true);
                  trackEvent('role_comparison_opened');
                }}
                className="text-[10px] font-bold text-[#1f3861] bg-blue-50 border border-blue-200/70 hover:bg-blue-100/70 px-2.5 py-1 rounded-full flex items-center gap-1 transition cursor-pointer"
              >
                <Scale className="w-3 h-3" />
                Compare
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 rounded-3xl bg-white border border-slate-200 flex flex-col items-center justify-center space-y-2 text-center shadow-xs">
            <Loader2 className="w-6 h-6 animate-spin text-[#1f3861]" />
            <span className="text-xs text-slate-500 font-medium">Matching your profile with published benchmarks…</span>
          </div>
        ) : error ? (
          <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium space-y-2">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Could not load recommendations</span>
            </div>
            <p className="text-[11px] text-rose-700">{error.message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-[11px] font-bold text-[#1f3861] flex items-center gap-1 cursor-pointer pt-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        ) : recommendedRoles.length === 0 ? (
          <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
            No published roles are configured for this career stream yet.
          </div>
        ) : (
          <div className="space-y-3">
            {recommendedRoles.map((role, index) => {
              const label = getRecommendationLabel(index, role.fitBand);
              return (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                  className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-2.5 transition hover:border-[#1f3861] group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-[#1f3861] border border-blue-200/80">
                      {label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      {role.demandLevel} Demand
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#0b111e] group-hover:text-[#1f3861] transition">
                      {role.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {role.fitReasons[0] || role.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {(role.keySkills || []).slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="text-[9px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setConsultantRole(role.title);
                        trackEvent('career_voice_consultant_opened', { targetRole: role.title });
                      }}
                      className="py-2.5 px-3 rounded-full bg-slate-100 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-200 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
                      title={`Ask Qalam what a ${role.title} does`}
                    >
                      <MessageSquareQuote className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ask Qalam</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        trackEvent('role_deep_dive_clicked', { roleId: role.id, title: role.title });
                        onSelectRoleForExplanation(role);
                      }}
                      className="flex-1 py-2.5 px-3 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-xs"
                    >
                      <span>Explore & Audit</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {isComparing && (
        <RoleComparisonView
          roles={recommendedRoles}
          onSelectRole={(selectedRole) => {
            setIsComparing(false);
            onSelectRoleForExplanation(selectedRole);
          }}
          onClose={() => setIsComparing(false)}
          trackEvent={trackEvent}
        />
      )}

      {consultantRole && (
        <CareerVoiceConsultant
          isOpen={Boolean(consultantRole)}
          onClose={() => setConsultantRole(null)}
          targetRoleTitle={consultantRole}
          firstName={firstName}
          departmentName={departmentName}
          trackEvent={trackEvent}
        />
      )}

      <p className="text-[10px] text-slate-400 font-medium">
        Career Fit reflects profile and intent alignment. Career Readiness is measured through the audit.
      </p>
    </div>
  );
};
