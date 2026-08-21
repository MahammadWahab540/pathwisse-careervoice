import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock3, LockKeyhole, Play } from 'lucide-react';
import type { RoadmapArgs } from '../../ai/qalamTools';

interface RoadmapCardProps {
  data: RoadmapArgs;
}

const statusUi = {
  COMPLETED: { label: 'Done', icon: Check, shell: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  IN_PROGRESS: { label: 'Now', icon: Play, shell: 'bg-blue-50 text-[#1f3861] border-blue-200' },
  NEXT: { label: 'Next', icon: Play, shell: 'bg-amber-50 text-amber-700 border-amber-200' },
  LOCKED: { label: 'Locked', icon: LockKeyhole, shell: 'bg-slate-50 text-slate-400 border-slate-200' },
} as const;

export const RoadmapCard: React.FC<RoadmapCardProps> = ({ data }) => (
  <div className="space-y-3 text-left">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#1f3861]">Adaptive roadmap</p>
      <h3 className="mt-0.5 text-lg font-black tracking-tight text-[#0b111e]">{data.roleTitle}</h3>
    </div>

    <div className="relative space-y-2.5 pl-3">
      <div className="absolute bottom-3 left-[18px] top-3 w-px bg-slate-200" />
      {data.phases.map((phase, index) => {
        const status = phase.status || (index === 0 ? 'NEXT' : 'LOCKED');
        const ui = statusUi[status];
        const Icon = ui.icon;
        return (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="relative flex gap-3"
          >
            <div className={`relative z-10 mt-3 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2 border-white ${status === 'COMPLETED' ? 'bg-emerald-500' : status === 'IN_PROGRESS' ? 'bg-[#1f3861]' : status === 'NEXT' ? 'bg-amber-500' : 'bg-slate-300'}`} />
            <div className={`min-w-0 flex-1 rounded-2xl border bg-white p-3 ${status === 'LOCKED' ? 'border-slate-200 opacity-75' : 'border-slate-200 shadow-xs'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{phase.title}</p>
                  <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-600">{phase.outcome}</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-black uppercase ${ui.shell}`}>
                  <Icon className="h-3 w-3" /> {ui.label}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {phase.durationWeeks != null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-500">
                    <Clock3 className="h-3 w-3" /> {phase.durationWeeks}w
                  </span>
                )}
                {(phase.skills || []).slice(0, 3).map((skill) => (
                  <span key={skill} className="rounded-full bg-[#1f3861]/5 px-2 py-1 text-[9px] font-bold text-[#1f3861]">{skill}</span>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  </div>
);
