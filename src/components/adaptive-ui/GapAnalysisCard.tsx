import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, CircleAlert, TriangleAlert } from 'lucide-react';
import type { GapAnalysisArgs, GapSeverity } from '../../ai/qalamTools';

const severityUi: Record<GapSeverity, { label: string; shell: string; bar: string; icon: React.ReactNode }> = {
  RED: {
    label: 'Critical gap',
    shell: 'border-rose-200 bg-rose-50/70 text-rose-800',
    bar: 'bg-rose-500',
    icon: <CircleAlert className="h-4 w-4" />,
  },
  ORANGE: {
    label: 'Needs work',
    shell: 'border-amber-200 bg-amber-50/70 text-amber-800',
    bar: 'bg-amber-500',
    icon: <TriangleAlert className="h-4 w-4" />,
  },
  GREEN: {
    label: 'On track',
    shell: 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
    bar: 'bg-emerald-500',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
};

interface GapAnalysisCardProps {
  data: GapAnalysisArgs;
}

export const GapAnalysisCard: React.FC<GapAnalysisCardProps> = ({ data }) => (
  <div className="space-y-3 text-left">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#1f3861]">Gap map</p>
      <h3 className="mt-0.5 text-lg font-black tracking-tight text-[#0b111e]">{data.roleTitle}</h3>
    </div>

    <div className="space-y-2.5">
      {data.gaps.map((gap, index) => {
        const ui = severityUi[gap.severity];
        const score = gap.score;
        const target = gap.targetScore;
        return (
          <motion.div
            key={`${gap.skill}-${index}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-900">{gap.skill}</p>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-600">{gap.summary}</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wide ${ui.shell}`}>
                {ui.icon}{ui.label}
              </span>
            </div>

            {score != null && (
              <div className="mt-2.5">
                <div className="mb-1 flex justify-between text-[9px] font-bold text-slate-400">
                  <span>Current {score}</span>
                  {target != null && <span>Target {target}</span>}
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    className={`h-full rounded-full ${ui.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.45 }}
                  />
                  {target != null && (
                    <span className="absolute top-0 h-full w-px bg-slate-800/50" style={{ left: `${target}%` }} />
                  )}
                </div>
              </div>
            )}

            {gap.action && (
              <div className="mt-2.5 rounded-xl bg-slate-50 px-2.5 py-2 text-[10px] font-semibold leading-relaxed text-slate-700">
                <span className="font-black text-[#1f3861]">Next signal:</span> {gap.action}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  </div>
);
