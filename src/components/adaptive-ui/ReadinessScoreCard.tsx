import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ReadinessScoreArgs } from '../../ai/qalamTools';

interface ReadinessScoreCardProps {
  data: ReadinessScoreArgs;
}

export const ReadinessScoreCard: React.FC<ReadinessScoreCardProps> = ({ data }) => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (data.overallScore / 100) * circumference;
  const delta = data.previousScore == null ? null : data.overallScore - data.previousScore;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100" aria-label={`Career readiness score ${data.overallScore} out of 100`}>
            <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100" />
            <motion.circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className="text-[#1f3861]"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: progress }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={data.overallScore}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-3xl font-black tracking-tight text-[#0b111e]"
            >
              {data.overallScore}
            </motion.span>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Readiness</span>
          </div>
        </div>

        <div className="min-w-0 flex-1 text-left">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#1f3861]">Career signal</span>
            {delta !== null && delta !== 0 && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${delta > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta > 0 ? '+' : ''}{delta}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold leading-relaxed text-slate-700">{data.summary}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {data.dimensions.map((dimension) => (
          <div key={dimension.name} className="grid grid-cols-[1fr_34px] items-center gap-2 text-left">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-bold text-slate-600">{dimension.name}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full rounded-full bg-[#1f3861]"
                  initial={{ width: 0 }}
                  animate={{ width: `${dimension.score}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
            <span className="text-right text-xs font-black tabular-nums text-[#0b111e]">{dimension.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
