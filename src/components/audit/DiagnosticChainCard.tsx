import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DiagnosticConclusion } from '../../types';
import {
  MessageSquare,
  FileCheck2,
  Cpu,
  Target,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
} from 'lucide-react';

interface DiagnosticChainCardProps {
  conclusion: DiagnosticConclusion;
  index: number;
}

export const DiagnosticChainCard: React.FC<DiagnosticChainCardProps> = ({
  conclusion,
  index,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getSeverityBadge = (severity: 'RED' | 'ORANGE' | 'GREEN') => {
    switch (severity) {
      case 'RED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Critical Blocker
          </span>
        );
      case 'ORANGE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Moderate Gap
          </span>
        );
      case 'GREEN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Demonstrated Strength
          </span>
        );
    }
  };

  const getEvidenceStrengthBadge = (strength: 'Strong' | 'Moderate' | 'Weak' | 'None') => {
    switch (strength) {
      case 'Strong':
        return <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Verified Proof</span>;
      case 'Moderate':
        return <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">Partial Proof</span>;
      case 'Weak':
        return <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">Claim Without Proof</span>;
      default:
        return <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">No Evidence</span>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`rounded-2xl border transition shadow-xs overflow-hidden ${
        conclusion.gapSeverity === 'RED'
          ? 'bg-white border-rose-200/90'
          : conclusion.gapSeverity === 'ORANGE'
          ? 'bg-white border-amber-200/90'
          : 'bg-white border-emerald-200/90'
      }`}
    >
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 flex items-center justify-between cursor-pointer bg-slate-50/70 hover:bg-slate-100/60 transition border-b border-slate-100"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-5 h-5 rounded-full bg-[#1f3861] text-white text-[10px] flex items-center justify-center font-mono font-bold">
            {index + 1}
          </span>
          <div>
            <h4 className="text-xs font-bold text-[#0b111e] flex items-center gap-1.5">
              {conclusion.skillName}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono font-bold text-slate-500">
                Score: <strong className="text-[#0b111e]">{conclusion.score}/100</strong>
              </span>
              <span className="text-[10px] text-slate-300">•</span>
              <span className="text-[10px] font-mono font-semibold text-slate-500">
                Confidence: <strong className="text-[#1f3861]">{conclusion.confidenceScore}% ({conclusion.confidenceLevel})</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getSeverityBadge(conclusion.gapSeverity)}
          <button className="text-slate-400 hover:text-slate-600 p-0.5">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Strict 6-Stage Diagnostic Chain Body */}
      {isExpanded && (
        <div className="p-3.5 space-y-3 text-left">
          {/* Step 1: Student Answer */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              <MessageSquare className="w-3 h-3 text-[#1f3861]" />
              1. Student Audit Response
            </div>
            <p className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 italic">
              "{conclusion.studentAnswerSnippet}"
            </p>
          </div>

          {/* Step 2: Evidence Verified */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                <FileCheck2 className="w-3 h-3 text-blue-600" />
                2. Evidence Verified
              </div>
              {getEvidenceStrengthBadge(conclusion.evidenceStrength)}
            </div>
            <p className="text-xs text-slate-700 font-medium bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
              {conclusion.evidenceVerified}
            </p>
          </div>

          {/* Step 3 & 4: Skill + Score / Confidence */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-500 uppercase">
                <Cpu className="w-3 h-3 text-[#1f3861]" />
                3. Tested Skill
              </div>
              <p className="text-xs font-bold text-[#0b111e] truncate">{conclusion.skillName}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-500 uppercase">
                <Target className="w-3 h-3 text-emerald-600" />
                4. Verified Score
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-[#0b111e]">
                <span>{conclusion.score} / 100</span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                  {conclusion.confidenceScore}% Conf
                </span>
              </div>
            </div>
          </div>

          {/* Step 5: Identified Gap */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-700 uppercase tracking-wider">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              5. Identified Skill Gap
            </div>
            <p className="text-xs text-slate-700 font-medium bg-rose-50/60 p-2.5 rounded-xl border border-rose-200/80">
              {conclusion.gapDescription}
            </p>
          </div>

          {/* Step 6: Recommended Action */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">
              <Zap className="w-3 h-3 text-emerald-600" />
              6. Recommended Pathwisse Action
            </div>
            <div className="flex items-start gap-2 text-xs font-bold text-[#0b111e] bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200">
              <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{conclusion.recommendedAction}</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
