import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2, RefreshCw, Scale, Sparkles } from 'lucide-react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import type { CareerRoleExplanation, CareerRoleRecommendation } from '../../types';

interface RoleExplanationStepProps {
  auditId: string;
  role: CareerRoleRecommendation;
  firstName: string;
  onChooseRole: (role: CareerRoleRecommendation) => void;
  onExploreAnotherRole: () => void;
  onSelectDifferentRole?: (roleId: string) => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
}

function textList(value: unknown[]): string[] {
  return value.map((item) => String(item)).filter(Boolean);
}

const MissingConfig: React.FC = () => (
  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
    Not yet configured in the CareerVoice role catalog.
  </p>
);

export const RoleExplanationStep: React.FC<RoleExplanationStepProps> = ({
  auditId,
  role,
  firstName,
  onChooseRole,
  onExploreAnotherRole,
  onSelectDifferentRole,
  trackEvent,
}) => {
  const [details, setDetails] = useState<CareerRoleExplanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  const explanationText = useMemo(() => {
    if (!details) return `Loading the published CareerVoice definition for ${role.title}.`;
    const fitReason = details.whyThisStudent?.reason ? ` ${details.whyThisStudent.reason}` : '';
    return `${details.title}: ${details.description}.${fitReason}`;
  }, [details, role.title]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/roles/${encodeURIComponent(role.id)}/explanation?auditId=${encodeURIComponent(auditId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.success === false) throw new Error(data.message || 'Role explanation could not be loaded.');
        return data as CareerRoleExplanation;
      })
      .then((data) => {
        if (!active) return;
        setDetails(data);
        setLoading(false);
        trackEvent('role_explanation_opened', { auditId, roleId: role.id, contentStatus: data.contentStatus });
      })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError instanceof Error ? requestError.message : 'Role explanation could not be loaded.');
        setLoading(false);
      });
    return () => {
      active = false;
      stopSpeaking();
    };
  }, [auditId, role.id, stopSpeaking, trackEvent]);

  useEffect(() => {
    if (details) speakText(explanationText);
  }, [details, explanationText, speakText]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center gap-3 px-5 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1f3861]" />
        <p className="text-xs text-slate-500">Loading the canonical role definition…</p>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center gap-3 px-5 text-center">
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">{error || 'Role explanation is unavailable.'}</p>
        <button type="button" onClick={onExploreAnotherRole} className="text-xs font-bold text-[#1f3861] flex items-center gap-1"><RefreshCw className="w-3 h-3" />Return to recommendations</button>
      </div>
    );
  }

  const responsibilities = textList(details.responsibilities);
  const problemsSolved = textList(details.problemsSolved);
  const toolsUsed = textList(details.toolsUsed);
  const progression = textList(details.careerProgression);
  const challenges = textList(details.challenges);

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] px-4 py-4 max-w-md mx-auto text-center space-y-3">
      <QalamCharacter
        state={isSpeaking ? 'SPEAKING' : 'CURIOUS'}
        audioAmplitude={amplitude}
        subtitles={explanationText}
        onSpeak={() => speakText(explanationText)}
      />

      <div className="w-full bg-white border border-slate-200 rounded-3xl p-4 shadow-sm text-left space-y-4">
        <div className="flex items-center justify-between bg-slate-100 p-1 rounded-2xl">
          <button type="button" onClick={() => setIsComparing(false)} className={`flex-1 py-1.5 text-xs font-bold rounded-xl ${!isComparing ? 'bg-white text-[#1f3861] shadow-sm' : 'text-slate-600'}`}>Role Deep Dive</button>
          <button type="button" onClick={() => setIsComparing(true)} className={`flex-1 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1 ${isComparing ? 'bg-white text-[#1f3861] shadow-sm' : 'text-slate-600'}`}><Scale className="w-3.5 h-3.5" />Compare</button>
        </div>

        {!isComparing ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Target-role definition</p>
                  <h2 className="text-lg font-bold text-[#0b111e] mt-0.5">{details.title}</h2>
                  <p className="text-[10px] text-slate-500">{details.category}</p>
                </div>
                <span className={`text-[9px] rounded-full border px-2 py-0.5 font-bold ${details.contentStatus === 'complete' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>{details.contentStatus === 'complete' ? 'Catalog complete' : 'Catalog partial'}</span>
              </div>
              <p className="mt-2 text-xs text-slate-700 leading-relaxed">{details.description}</p>
            </div>

            <section className="space-y-1.5"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">What the role actually does</p>{responsibilities.length ? responsibilities.map((item, index) => <p key={index} className="text-[11px] text-slate-700">• {item}</p>) : <MissingConfig />}</section>
            <section className="space-y-1.5"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Normal working day</p>{details.typicalDay ? <p className="text-[11px] text-slate-700 leading-relaxed">{details.typicalDay}</p> : <MissingConfig />}</section>
            <section className="space-y-1.5"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Problems solved</p>{problemsSolved.length ? problemsSolved.map((item, index) => <p key={index} className="text-[11px] text-slate-700">• {item}</p>) : <MissingConfig />}</section>
            <section className="space-y-1.5"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Tools used</p>{toolsUsed.length ? <div className="flex flex-wrap gap-1">{toolsUsed.map((item) => <span key={item} className="text-[10px] rounded-md bg-slate-100 px-2 py-1 text-slate-700">{item}</span>)}</div> : <MissingConfig />}</section>

            <section className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Skills required</p>
              <div className="space-y-1.5">
                {details.skills.map((skill) => (
                  <div key={skill.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <span className="text-[11px] font-bold text-[#0b111e]">{skill.name}</span>
                    <span className="text-[10px] text-slate-500">{skill.requiredLevel} · target {skill.expectedReadiness}/100</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-1.5"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Career progression</p>{progression.length ? progression.map((item, index) => <p key={index} className="text-[11px] text-slate-700">• {item}</p>) : <MissingConfig />}</section>
            <section className="space-y-1.5"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Challenges</p>{challenges.length ? challenges.map((item, index) => <p key={index} className="text-[11px] text-slate-700">• {item}</p>) : <MissingConfig />}</section>
            <section className="space-y-1.5"><p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Who usually enjoys this work</p>{details.whoEnjoys ? <p className="text-[11px] text-slate-700">{details.whoEnjoys}</p> : <MissingConfig />}</section>

            <section className="rounded-2xl bg-blue-50 border border-blue-100 p-3 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#1f3861] flex items-center gap-1"><Sparkles className="w-3 h-3" />Why Qalam thinks it fits you</p>
              {details.whyThisStudent ? (
                <>
                  <p className="text-xs font-bold text-[#0b111e]">{details.whyThisStudent.recommendationType}</p>
                  <p className="text-[11px] text-slate-700 leading-relaxed">{details.whyThisStudent.reason}</p>
                  {details.whyThisStudent.supportingEvidence.map((item, index) => <p key={index} className="text-[10px] text-slate-600">• {item}</p>)}
                </>
              ) : <p className="text-[11px] text-slate-600">No persisted discovery rationale is available for this role.</p>}
            </section>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Other recommended directions</p>
            {details.comparison.length ? details.comparison.map((item) => (
              <button key={item.roleId} type="button" onClick={() => onSelectDifferentRole?.(item.roleId)} className="w-full text-left rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:border-[#1f3861]">
                <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-[#0b111e]">{item.role}</span><span className="text-[9px] border border-slate-200 bg-white rounded-full px-2 py-0.5 font-bold text-slate-600">{item.recommendationType}</span></div>
                <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">{item.reason}</p>
                <p className="text-[9px] text-slate-400 mt-1">{item.keySkills.slice(0, 4).join(' · ')}</p>
              </button>
            )) : <p className="text-[11px] text-slate-500">No additional persisted recommendations are available.</p>}
          </div>
        )}

        <div className="space-y-2 pt-1">
          <button type="button" onClick={() => onChooseRole(role)} className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] text-white font-bold text-xs flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" />Choose {details.title}<ArrowRight className="w-4 h-4" /></button>
          <button type="button" onClick={onExploreAnotherRole} className="w-full py-2.5 text-xs font-bold text-slate-600">Explore another direction</button>
        </div>
      </div>

      <p className="text-[10px] text-slate-400">Role content is displayed from the CareerVoice database. Missing catalog fields are surfaced instead of generated in the browser.</p>
    </div>
  );
};
