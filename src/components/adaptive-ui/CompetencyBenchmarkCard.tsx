import React from 'react';
import { motion } from 'framer-motion';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { CompetencyBenchmarkArgs } from '../../ai/qalamTools';

interface CompetencyBenchmarkCardProps {
  data: CompetencyBenchmarkArgs;
}

export const CompetencyBenchmarkCard: React.FC<CompetencyBenchmarkCardProps> = ({ data }) => (
  <div className="space-y-3 text-left">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#1f3861]">Role benchmark</p>
      <div className="mt-0.5 flex items-end justify-between gap-3">
        <h3 className="text-lg font-black tracking-tight text-[#0b111e]">{data.roleTitle}</h3>
        {data.benchmarkLabel && <span className="text-right text-[9px] font-bold leading-tight text-slate-400">{data.benchmarkLabel}</span>}
      </div>
    </div>

    <div className="space-y-3">
      {data.competencies.map((competency, index) => {
        const ahead = competency.gap > 0;
        const behind = competency.gap < 0;
        return (
          <motion.div
            key={`${competency.name}-${index}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-black text-slate-700">{competency.name}</span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-black tabular-nums ${ahead ? 'text-emerald-700' : behind ? 'text-rose-700' : 'text-slate-500'}`}>
                {ahead ? <TrendingUp className="h-3 w-3" /> : behind ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {competency.gap > 0 ? '+' : ''}{competency.gap}
              </span>
            </div>

            <div className="relative h-7 overflow-hidden rounded-xl bg-slate-100">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-xl bg-[#1f3861]/15"
                initial={{ width: 0 }}
                animate={{ width: `${competency.studentScore}%` }}
                transition={{ duration: 0.5 }}
              />
              <span className="absolute inset-y-0 z-10 w-0.5 bg-amber-500" style={{ left: `${competency.benchmark}%` }} aria-label={`Role benchmark ${competency.benchmark}`} />
              <div className="relative z-20 flex h-full items-center justify-between px-2.5 text-[9px] font-black">
                <span className="text-[#1f3861]">You {competency.studentScore}</span>
                <span className="text-slate-500">Role {competency.benchmark}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  </div>
);
