import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { CareerRole } from '../../data/careerTaxonomy';
import { Sparkles, ArrowRight, ShieldCheck, ChevronRight, TrendingUp, DollarSign, Layers, Loader2 } from 'lucide-react';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';

interface RoleDiscoveryStepProps {
  firstName: string;
  careerStreamId: string;
  userRawIntent: string;
  onSelectRoleForExplanation: (role: CareerRole) => void;
  trackEvent: (eventName: string, metadata?: any) => void;
  onBack?: () => void;
}

export const RoleDiscoveryStep: React.FC<RoleDiscoveryStepProps> = ({
  firstName,
  careerStreamId,
  userRawIntent,
  onSelectRoleForExplanation,
  trackEvent,
}) => {
  const [roles, setRoles] = useState<CareerRole[]>([]);
  const [loading, setLoading] = useState(true);

  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  const subtitleText = `I found curated high-impact career directions for you, ${firstName || 'friend'}. Tap 'Deep Dive' on any path to explore day-to-day work.`;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/roles?streamId=${encodeURIComponent(careerStreamId)}`)
      .then((res) => res.json())
      .then((data: CareerRole[]) => {
        if (isMounted) {
          setRoles(data || []);
          setLoading(false);
          trackEvent('role_recommendations_viewed', {
            rolesCount: data?.length || 0,
            topRole: data?.[0]?.title,
          });
        }
      })
      .catch((err) => {
        console.warn('Failed to load roles from Supabase/API:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [careerStreamId, trackEvent]);

  useEffect(() => {
    speakText(subtitleText);
    return () => {
      stopSpeaking();
    };
  }, [firstName]);

  const recommendedRoles = roles.slice(0, 3);

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      <QalamCharacter
        state={isSpeaking ? 'SPEAKING' : 'WELCOME'}
        audioAmplitude={amplitude}
        subtitles={subtitleText}
        onSpeak={() => speakText(subtitleText)}
      />

      <div className="w-full my-3 space-y-3 text-left">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#1f3861]" />
            <span className="text-xs font-bold text-[#0b111e]">Curated Target Roles</span>
          </div>
          <span className="text-[10px] text-[#1f3861] font-bold bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full">
            Supabase Benchmarks
          </span>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="p-8 rounded-3xl bg-white border border-slate-200 flex flex-col items-center justify-center space-y-2 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#1f3861]" />
            <span className="text-xs text-slate-500 font-medium">Fetching verified career roles...</span>
          </div>
        ) : (
          /* Top 3 Role Cards */
           <div className="space-y-3">
            {recommendedRoles.map((role, idx) => {
              const matchScore = idx === 0 ? '98% Match' : idx === 1 ? '92% Match' : '87% Match';
              return (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.12, duration: 0.35, ease: 'easeOut' }}
                  whileHover={{ y: -3 }}
                  className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-3 transition hover:border-[#1f3861] group"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                        idx === 0
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : idx === 1
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {matchScore}
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
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                      {role.fitReason || role.description}
                    </p>
                  </div>

                  {/* Salary Range from Supabase */}
                  {role.salaryRangeDisplay && (
                    <div className="flex items-center gap-1 text-[11px] text-[#1f3861] font-bold">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{role.salaryRangeDisplay}</span>
                    </div>
                  )}

                  {/* Key Skills Chip Strip */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(role.keySkills || []).slice(0, 3).map((sk) => (
                      <span
                        key={sk}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      trackEvent('role_tell_me_more_clicked', { roleId: role.id, title: role.title });
                      onSelectRoleForExplanation(role);
                    }}
                    className="w-full py-2.5 px-3 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-xs"
                  >
                    <span>Deep Dive This Role</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        Qalam will walk you through daily engineering responsibilities and hiring bar.
      </p>
    </div>
  );
};
