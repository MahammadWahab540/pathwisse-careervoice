import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { CareerRole } from '../../data/careerTaxonomy';
import { Sparkles, ChevronRight, TrendingUp, Loader2 } from 'lucide-react';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';

type ScoredCareerRole = CareerRole & {
  matchScore: number;
  fitBand: 'Strong Fit' | 'Good Fit' | 'Exploratory Fit' | 'Stretch Fit';
  fitReasons: string[];
};

interface RoleDiscoveryStepProps {
  firstName: string;
  careerStreamId: string;
  departmentName: string;
  userRawIntent: string;
  knownSkills?: string[];
  onSelectRoleForExplanation: (role: CareerRole) => void;
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
  const [roles, setRoles] = useState<ScoredCareerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  const subtitleText = `I compared your stated direction and academic background against published CareerVoice roles, ${firstName || 'friend'}. Each fit score is deterministic and comes with the reasons behind it.`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch('/api/roles/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        careerStreamId,
        careerIntent: userRawIntent,
        branch: departmentName,
        knownSkills,
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.success === false) throw new Error(data.message || 'Role recommendations could not be loaded.');
        return data as ScoredCareerRole[];
      })
      .then((data) => {
        if (!active) return;
        setRoles(data || []);
        setLoading(false);
        trackEvent('role_recommendations_viewed', {
          rolesCount: data?.length || 0,
          topRole: data?.[0]?.title,
          topScore: data?.[0]?.matchScore,
        });
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : 'Role recommendations could not be loaded.');
        setLoading(false);
      });

    return () => { active = false; };
  }, [careerStreamId, departmentName, userRawIntent, knownSkills, trackEvent]);

  useEffect(() => {
    speakText(subtitleText);
    return () => stopSpeaking();
  }, [subtitleText, speakText, stopSpeaking]);

  const recommendedRoles = roles.slice(0, 3);

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      <QalamCharacter state={isSpeaking ? 'SPEAKING' : 'WELCOME'} audioAmplitude={amplitude} subtitles={subtitleText} onSpeak={() => speakText(subtitleText)} />

      <div className="w-full my-3 space-y-3 text-left">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#1f3861]" /><span className="text-xs font-bold text-[#0b111e]">Evidence-Aware Target Roles</span></div>
          <span className="text-[10px] text-[#1f3861] font-bold bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-full">Deterministic fit</span>
        </div>

        {loading ? (
          <div className="p-8 rounded-3xl bg-white border border-slate-200 flex flex-col items-center justify-center space-y-2 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#1f3861]" />
            <span className="text-xs text-slate-500 font-medium">Comparing your profile with published roles…</span>
          </div>
        ) : error ? (
          <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">{error}</div>
        ) : recommendedRoles.length === 0 ? (
          <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">No published roles are configured for this career stream yet.</div>
        ) : (
          <div className="space-y-3">
            {recommendedRoles.map((role, index) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.12, duration: 0.35, ease: 'easeOut' }}
                whileHover={{ y: -3 }}
                className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-3 transition hover:border-[#1f3861] group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-50 text-blue-800 border border-blue-200">{role.matchScore}% · {role.fitBand}</span>
                  <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-600" />{role.demandLevel} Demand</span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#0b111e] group-hover:text-[#1f3861] transition">{role.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{role.fitReasons[0] || role.description}</p>
                  {role.fitReasons.length > 1 && <p className="text-[10px] text-slate-500 mt-1">{role.fitReasons.slice(1).join(' · ')}</p>}
                </div>

                <div className="flex flex-wrap gap-1 pt-1">
                  {(role.keySkills || []).slice(0, 3).map((skill) => <span key={skill} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-medium">{skill}</span>)}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    trackEvent('role_tell_me_more_clicked', { roleId: role.id, title: role.title, matchScore: role.matchScore });
                    onSelectRoleForExplanation(role);
                  }}
                  className="w-full py-2.5 px-3 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer shadow-xs"
                >
                  <span>Deep Dive This Role</span><ChevronRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 font-medium">Fit scores use your intent, academic relevance, and known skill overlap. They are not card-position scores.</p>
    </div>
  );
};
