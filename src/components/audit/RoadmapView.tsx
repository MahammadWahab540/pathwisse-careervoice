import React, { useEffect } from 'react';
import { CareerAuditRoadmapHandoff, CareerRoleTarget } from '../../types';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { ArrowRight, CheckCircle2, ExternalLink, Link2Off, Map, Rocket, Share2 } from 'lucide-react';

interface RoadmapViewProps {
  handoff: CareerAuditRoadmapHandoff;
  role: CareerRoleTarget;
  onOpenShare: () => void;
  onOpenUpgrade: () => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  handoff,
  role,
  onOpenShare,
  onOpenUpgrade,
  trackEvent,
}) => {
  useEffect(() => {
    trackEvent('roadmap_handoff_viewed', {
      auditId: handoff.auditId,
      role: role.id,
      gapCount: handoff.priorityGaps.length,
      mappedCount: handoff.priorityGaps.filter((gap) => gap.mappingStatus === 'MAPPED').length,
    });
  }, [handoff, role.id, trackEvent]);

  const mappedCount = handoff.priorityGaps.filter((gap) => gap.mappingStatus === 'MAPPED').length;
  const unmappedCount = handoff.priorityGaps.length - mappedCount;

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white space-y-4">
      <QalamCharacter
        state={mappedCount > 0 ? 'CELEBRATING' : 'CURIOUS'}
        subtitles={mappedCount > 0
          ? 'Your highest-priority gaps are now linked to real Pathwisse skills and stages. Nothing here was generated from a generic roadmap template.'
          : 'Your audit is complete. These gaps are verified, but Pathwisse has not yet configured stable skill and stage mappings for them, so I will not invent roadmap items.'}
      />

      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#1f3861] font-bold">career-audit-roadmap-contract:v1</span>
            <h2 className="text-base font-bold text-[#0b111e] mt-0.5">Pathwisse Gap Handoff</h2>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1f3861] flex items-center justify-center"><Map className="w-4 h-4" /></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3"><span className="text-[9px] uppercase font-bold text-emerald-700">Mapped</span><p className="text-xl font-mono font-bold text-emerald-900">{mappedCount}</p></div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3"><span className="text-[9px] uppercase font-bold text-amber-700">Unmapped</span><p className="text-xl font-mono font-bold text-amber-900">{unmappedCount}</p></div>
        </div>

        <div className="space-y-2.5 max-h-[410px] overflow-y-auto pr-1">
          {handoff.priorityGaps.map((gap, index) => (
            <div key={gap.gapId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#1f3861] text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0">{index + 1}</span>
                  <div><h3 className="text-xs font-bold text-[#0b111e]">{gap.skillName}</h3><p className="text-[10px] text-slate-500 mt-0.5">Expected {gap.expectedScore} · Demonstrated {gap.demonstratedScore} · Gap {gap.gapScore}</p></div>
                </div>
                <span className="text-[9px] font-bold rounded-full bg-white border border-slate-200 px-2 py-0.5 text-slate-700">{gap.priority}</span>
              </div>

              {gap.mappingStatus === 'MAPPED' ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 space-y-1.5">
                  <p className="text-[10px] font-bold text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Stable Pathwisse mapping verified</p>
                  <p className="text-[10px] font-mono text-emerald-900 break-all">Skill: {gap.recommendedPathwisseSkillId}</p>
                  <div className="flex flex-wrap gap-1">{gap.recommendedStageIds.map((stageId) => <span key={stageId} className="text-[9px] font-mono rounded-md bg-white border border-emerald-200 px-1.5 py-0.5 text-emerald-800">Stage {stageId}</span>)}</div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                  <p className="text-[10px] font-bold text-amber-900 flex items-center gap-1"><Link2Off className="w-3 h-3" />UNMAPPED</p>
                  <p className="text-[10px] text-amber-800 mt-1">No stable Pathwisse skill/stage IDs exist for this competency yet. CareerVoice will not create a placeholder learning item.</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {mappedCount > 0 && (
          <button type="button" onClick={onOpenUpgrade} className="w-full py-3 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"><Rocket className="w-4 h-4" /><span>Open Mapped Pathwisse Learning</span><ArrowRight className="w-3.5 h-3.5" /></button>
        )}

        <button type="button" onClick={onOpenShare} className="w-full py-2.5 px-4 rounded-full bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"><Share2 className="w-4 h-4 text-[#1f3861]" /><span>Share My Verified Career Card</span></button>

        <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1"><ExternalLink className="w-3 h-3" /><span>Audit {handoff.auditId}</span></div>
      </div>
    </div>
  );
};
