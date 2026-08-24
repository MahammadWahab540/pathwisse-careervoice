import React, { useEffect } from 'react';
import { CareerGap, CareerRoleTarget } from '../../types';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { AlertCircle, AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert, Sparkles, Link2Off } from 'lucide-react';

interface GapReportViewProps {
  gaps: CareerGap[];
  role: CareerRoleTarget;
  onNext: () => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
}

export const GapReportView: React.FC<GapReportViewProps> = ({ gaps, role, onNext, trackEvent }) => {
  useEffect(() => {
    trackEvent('gap_report_viewed', { gapCount: gaps.length, roleId: role.id });
  }, [gaps.length, role.id, trackEvent]);

  const getSeverityBadge = (severity: 'RED' | 'ORANGE' | 'GREEN') => {
    if (severity === 'RED') return { bg: 'bg-rose-50/70 border-rose-200/80 text-rose-900', badgeBg: 'bg-rose-100 text-rose-800 border-rose-200', icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />, label: 'Priority Gap' };
    if (severity === 'ORANGE') return { bg: 'bg-amber-50/70 border-amber-200/80 text-amber-900', badgeBg: 'bg-amber-100 text-amber-800 border-amber-200', icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />, label: 'Moderate Gap' };
    return { bg: 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900', badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />, label: 'Low Gap' };
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white space-y-4">
      <QalamCharacter state="CURIOUS" subtitles={`These are the ${role.title} skills to improve first, ranked by how much they affect your readiness.`} />

      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div><span className="text-[10px] font-mono uppercase tracking-wider text-[#1f3861] font-bold flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5 text-rose-500" />Benchmarked Gap Analysis</span><h2 className="text-base font-bold text-[#0b111e] mt-0.5">Prioritised Career Gaps</h2></div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{gaps.length} skills</span>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {gaps.map((gap) => {
            const severity = getSeverityBadge(gap.severity);
            return (
              <div key={gap.id} className={`p-4 rounded-2xl border space-y-2.5 transition ${severity.bg}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">{severity.icon}<h4 className="text-xs font-bold text-[#0b111e]">{gap.title}</h4></div>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${severity.badgeBg}`}>{gap.priority || severity.label}</span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="rounded-lg bg-white/70 border border-slate-200 p-2"><span className="block text-[8px] uppercase font-bold text-slate-500">Expected</span><span className="text-xs font-mono font-bold">{gap.expectedScore ?? '—'}</span></div>
                  <div className="rounded-lg bg-white/70 border border-slate-200 p-2"><span className="block text-[8px] uppercase font-bold text-slate-500">Demonstrated</span><span className="text-xs font-mono font-bold">{gap.demonstratedScore ?? '—'}</span></div>
                  <div className="rounded-lg bg-white/70 border border-slate-200 p-2"><span className="block text-[8px] uppercase font-bold text-slate-500">Gap</span><span className="text-xs font-mono font-bold">{gap.gap ?? '—'}</span></div>
                </div>

                {gap.evidenceBasis && <p className="text-[10px] text-slate-700 leading-relaxed bg-white/60 border border-slate-200/70 rounded-xl p-2.5"><strong>Evidence basis:</strong> {gap.evidenceBasis}</p>}

                <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-[11px]">
                  <div className="flex items-start gap-1.5"><Sparkles className="w-3 h-3 text-[#1f3861] shrink-0 mt-0.5" /><span><strong>Action:</strong> {gap.recommendedAction}</span></div>
                  {gap.mappingStatus === 'UNMAPPED' && <div className="flex items-start gap-1.5 text-amber-800"><Link2Off className="w-3 h-3 shrink-0 mt-0.5" /><span>A guided lesson is not ready for this gap yet. Use the action above for now.</span></div>}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={onNext} className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"><span>Open Pathwisse Handoff</span><ArrowRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
};
