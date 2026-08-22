import React from 'react';
import type { EvidenceStrength } from '../../types/audit';
import { CheckCircle2, ShieldCheck, AlertTriangle, HelpCircle } from 'lucide-react';

interface EvidenceCoverageBadgeProps {
  strength: EvidenceStrength;
  showIcon?: boolean;
  className?: string;
}

export const EvidenceCoverageBadge: React.FC<EvidenceCoverageBadgeProps> = ({
  strength,
  showIcon = true,
  className = '',
}) => {
  switch (strength) {
    case 'Strong':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 ${className}`}
        >
          {showIcon && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
          Strong Evidence
        </span>
      );
    case 'Moderate':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1f3861] border border-blue-200/80 ${className}`}
        >
          {showIcon && <ShieldCheck className="w-3 h-3 text-[#1f3861]" />}
          Moderate Evidence
        </span>
      );
    case 'Weak':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 ${className}`}
        >
          {showIcon && <AlertTriangle className="w-3 h-3 text-amber-600" />}
          Weak Evidence
        </span>
      );
    case 'None':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-dashed border-slate-300 ${className}`}
        >
          {showIcon && <HelpCircle className="w-3 h-3 text-slate-400" />}
          Insufficient Evidence
        </span>
      );
  }
};
