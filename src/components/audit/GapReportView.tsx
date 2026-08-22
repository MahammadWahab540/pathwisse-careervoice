import React, { useEffect } from 'react';
import { CareerGap, CareerRoleTarget } from '../../types';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { AlertCircle, AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert, Sparkles, Target } from 'lucide-react';

interface GapReportViewProps {
  gaps: CareerGap[];
  role: CareerRoleTarget;
  onNext: () => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

export const GapReportView: React.FC<GapReportViewProps> = ({
  gaps,
  role,
  onNext,
  trackEvent,
}) => {
  useEffect(() => {
    trackEvent('gap_report_viewed', { gapCount: gaps.length });
  }, [gaps, trackEvent]);

  const getSeverityBadge = (severity: 'RED' | 'ORANGE' | 'GREEN') => {
    switch (severity) {
      case 'RED':
        return {
          bg: 'bg-rose-50/70 border-rose-200/80 text-rose-900',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
          label: 'Critical Gap',
        };
      case 'ORANGE':
        return {
          bg: 'bg-amber-50/70 border-amber-200/80 text-amber-900',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
          label: 'Moderate Gap',
        };
      case 'GREEN':
        return {
          bg: 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
          label: 'Strong Foundation',
        };
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white space-y-4">
      {/* Qalam Mascot */}
      <QalamCharacter
        state="CURIOUS"
        subtitles="Here are the specific technical and project gaps we need to address to qualify you for top roles."
      />

      {/* Main Gaps Container */}
      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#1f3861] font-bold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              Gap Analysis
            </span>
            <h2 className="text-base font-bold text-[#0b111e] mt-0.5">Identified Career Blockers</h2>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {gaps.length} Action Items
          </span>
        </div>

        {/* Gaps List */}
        <div className="space-y-3">
          {gaps.map((gap) => {
            const sev = getSeverityBadge(gap.severity);

            return (
              <div
                key={gap.id}
                className={`p-4 rounded-2xl border space-y-2.5 transition ${sev.bg}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {sev.icon}
                    <h4 className="text-xs font-bold text-[#0b111e]">{gap.title}</h4>
                  </div>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${sev.badgeBg}`}>
                    {sev.label}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">{gap.description}</p>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">Recommended Fix:</span>
                  <span className="text-[#1f3861] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#1f3861]" />
                    {gap.recommendedAction}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Primary CTA */}
        <button
          onClick={onNext}
          className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
        >
          <span>Explore 6-Week Pathwisse Action Plan</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

