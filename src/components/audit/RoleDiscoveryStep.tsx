import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import type { CareerRoleRecommendation } from '../../types';

interface RoleDiscoveryStepProps {
  auditId: string;
  firstName: string;
  onSelectRoleForExplanation: (role: CareerRoleRecommendation) => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
}

function bandClasses(type: CareerRoleRecommendation['recommendationType']) {
  if (type === 'Strong Direction') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (type === 'Worth Exploring') return 'bg-blue-50 text-blue-800 border-blue-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

export const RoleDiscoveryStep: React.FC<RoleDiscoveryStepProps> = ({
  auditId,
  firstName,
  onSelectRoleForExplanation,
  trackEvent,
}) => {
  const [roles, setRoles] = useState<CareerRoleRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  const subtitleText = `I compared what you told me against the published CareerVoice role catalog, ${firstName || 'there'}. These are career directions, not readiness scores.`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch('/api/roles/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auditId }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.success === false) throw new Error(data.message || 'Role recommendations could not be loaded.');
        return data as CareerRoleRecommendation[];
      })
      .then((data) => {
        if (!active) return;
        setRoles(data || []);
        setLoading(false);
        trackEvent('role_recommendations_viewed', {
          auditId,
          rolesCount: data?.length || 0,
          topRole: data?.[0]?.title,
          topDirection: data?.[0]?.recommendationType,
        });
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : 'Role recommendations could not be loaded.');
        setLoading(false);
      });

    speakText(subtitleText);
    return () => {
      active = false;
      stopSpeaking();
    };
  }, [auditId, subtitleText, speakText, stopSpeaking, trackEvent]);

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      <QalamCharacter
        state={isSpeaking ? 'SPEAKING' : 'CURIOUS'}
        audioAmplitude={amplitude}
        subtitles={subtitleText}
        onSpeak={() => speakText(subtitleText)}
      />

      <div className="w-full my-3 space-y-3 text-left">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#1f3861]" />
            <span className="text-xs font-bold text-[#0b111e]">Career Directions</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Career Fit ≠ Career Readiness</span>
        </div>

        {loading ? (
          <div className="p-8 rounded-3xl bg-white border border-slate-200 flex flex-col items-center justify-center space-y-2 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#1f3861]" />
            <span className="text-xs text-slate-500 font-medium">Comparing your discovery profile with published roles…</span>
          </div>
        ) : error ? (
          <div className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">{error}</div>
        ) : roles.length === 0 ? (
          <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">No published CareerVoice roles are available for comparison.</div>
        ) : (
          <div className="space-y-3">
            {roles.slice(0, 5).map((role, index) => (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.3, ease: 'easeOut' }}
                className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#0b111e]">{role.title}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">{role.category}</p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold whitespace-nowrap ${bandClasses(role.recommendationType)}`}>
                    {role.recommendationType}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{role.reasons?.[0] || role.description}</p>

                {role.supportingEvidence?.length > 0 && (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-2.5">
                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-1">Why Qalam surfaced it</p>
                    {role.supportingEvidence.slice(0, 3).map((evidence, evidenceIndex) => (
                      <p key={`${role.id}-evidence-${evidenceIndex}`} className="text-[10px] text-slate-600 leading-relaxed">• {evidence}</p>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1">
                  {(role.keySkills || []).slice(0, 4).map((skill) => (
                    <span key={skill} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">{skill}</span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    trackEvent('role_explanation_requested', {
                      auditId,
                      roleId: role.id,
                      recommendationType: role.recommendationType,
                    });
                    onSelectRoleForExplanation(role);
                  }}
                  className="w-full py-2.5 px-3 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                >
                  Understand This Role <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400 font-medium">Direction labels are based on your stated discovery evidence and published role requirements. Readiness is assessed later.</p>
    </div>
  );
};
