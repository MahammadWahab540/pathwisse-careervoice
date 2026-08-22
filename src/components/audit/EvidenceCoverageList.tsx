import React from 'react';
import type { EvidenceCoverageItemDto } from '../../types/audit';
import { EvidenceCoverageBadge } from './EvidenceCoverageBadge';
import { Shield, Sparkles } from 'lucide-react';

interface EvidenceCoverageListProps {
  items: EvidenceCoverageItemDto[];
  title?: string;
  className?: string;
}

export const EvidenceCoverageList: React.FC<EvidenceCoverageListProps> = ({
  items,
  title = 'Live Competency Evidence Coverage',
  className = '',
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div className={`rounded-2xl bg-white border border-slate-200/80 p-3.5 space-y-2.5 shadow-2xs ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#1f3861]" />
          <span className="text-xs font-bold text-[#0b111e]">{title}</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 font-semibold">
          {items.filter((i) => i.evidenceStrength !== 'None').length} / {items.length} verified
        </span>
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        {items.map((item) => (
          <div
            key={item.skillId}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#0b111e] truncate">{item.skillName}</p>
              <p className="text-[9px] text-slate-500 font-mono">
                {item.category} · Target: {item.expectedScore}
              </p>
            </div>
            <EvidenceCoverageBadge strength={item.evidenceStrength} />
          </div>
        ))}
      </div>
    </div>
  );
};
