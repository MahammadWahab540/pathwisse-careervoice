import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SkillRadarArgs } from '../../ai/qalamTools';

interface SkillRadarCardProps {
  data: SkillRadarArgs;
}

function polygonPoints(values: number[], radius: number, center = 60): string {
  const count = Math.max(values.length, 1);
  return values
    .map((value, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
      const r = radius * (Math.max(0, Math.min(100, value)) / 100);
      return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
    })
    .join(' ');
}

export const SkillRadarCard: React.FC<SkillRadarCardProps> = ({ data }) => {
  const skills = data.skills.slice(0, 8);
  const axes = useMemo(() => {
    const count = Math.max(skills.length, 1);
    return skills.map((skill, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
      return {
        ...skill,
        x: 60 + Math.cos(angle) * 48,
        y: 60 + Math.sin(angle) * 48,
        labelX: 60 + Math.cos(angle) * 57,
        labelY: 60 + Math.sin(angle) * 57,
      };
    });
  }, [skills]);

  const scorePoints = polygonPoints(skills.map((skill) => skill.score), 42);
  const hasBenchmarks = skills.some((skill) => skill.benchmark != null);
  const benchmarkPoints = polygonPoints(skills.map((skill) => skill.benchmark ?? 0), 42);

  if (!skills.length) {
    return <p className="text-sm font-semibold text-slate-500">Qalam needs more skill evidence before drawing a radar.</p>;
  }

  return (
    <div className="space-y-3 text-left">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#1f3861]">Evidence radar</p>
        <h3 className="mt-0.5 text-lg font-black tracking-tight text-[#0b111e]">{data.title}</h3>
      </div>

      <div className="grid grid-cols-[145px_1fr] items-center gap-2">
        <svg className="h-[145px] w-[145px] overflow-visible" viewBox="0 0 120 120" role="img" aria-label={data.title}>
          {[25, 50, 75, 100].map((level) => (
            <polygon
              key={level}
              points={polygonPoints(skills.map(() => level), 42)}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              className="text-slate-200"
            />
          ))}

          {axes.map((axis) => (
            <line key={axis.name} x1="60" y1="60" x2={axis.x} y2={axis.y} stroke="currentColor" strokeWidth="0.6" className="text-slate-200" />
          ))}

          {hasBenchmarks && (
            <motion.polygon
              points={benchmarkPoints}
              fill="rgba(245, 158, 11, 0.08)"
              stroke="rgb(245, 158, 11)"
              strokeDasharray="2 2"
              strokeWidth="1.2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          )}

          <motion.polygon
            points={scorePoints}
            fill="rgba(31, 56, 97, 0.18)"
            stroke="rgb(31, 56, 97)"
            strokeWidth="1.8"
            initial={{ opacity: 0, scale: 0.75, transformOrigin: '60px 60px' }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />

          {axes.map((axis) => (
            <circle key={`dot-${axis.name}`} cx={60 + ((axis.x - 60) * axis.score) / 100} cy={60 + ((axis.y - 60) * axis.score) / 100} r="1.8" fill="rgb(31, 56, 97)" />
          ))}
        </svg>

        <div className="space-y-2">
          {skills.map((skill) => (
            <div key={skill.name} className="rounded-xl bg-slate-50 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[10px] font-black text-slate-700">{skill.name}</span>
                <span className="text-xs font-black tabular-nums text-[#1f3861]">{skill.score}</span>
              </div>
              {skill.confidence != null && (
                <p className="mt-0.5 text-[9px] font-semibold text-slate-400">Evidence confidence {skill.confidence}%</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {hasBenchmarks && (
        <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500">
          <span className="inline-flex items-center gap-1"><i className="h-1.5 w-4 rounded-full bg-[#1f3861]" /> Student</span>
          <span className="inline-flex items-center gap-1"><i className="h-1.5 w-4 rounded-full border border-dashed border-amber-500" /> Role bar</span>
        </div>
      )}
    </div>
  );
};
