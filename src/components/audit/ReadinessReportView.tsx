import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { CareerAuditResult, CareerRoleTarget } from '../../types';
import { DiagnosticChainCard } from './DiagnosticChainCard';
import { Award, ArrowRight, CheckCircle2, AlertTriangle, ChevronRight, BarChart2, Zap, Target, ShieldAlert, Sparkles } from 'lucide-react';

interface ReadinessReportViewProps {
  result: CareerAuditResult;
  role: CareerRoleTarget;
  onNext: () => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

export const ReadinessReportView: React.FC<ReadinessReportViewProps> = ({
  result,
  role,
  onNext,
  trackEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'diagnostics'>('overview');

  useEffect(() => {
    trackEvent('audit_completed', { overallScore: result.overallScore, role: role.id });
    trackEvent('readiness_report_viewed');

    // Trigger celebratory confetti on report load
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.55 },
    });
  }, [result, role, trackEvent]);

  const dimensions = [
    { label: 'Role Clarity', score: result.dimensionScores.careerClarity },
    { label: 'Technical Depth', score: result.dimensionScores.technicalReadiness },
    { label: 'Project Rigor', score: result.dimensionScores.projectReadiness },
    { label: 'Communication', score: result.dimensionScores.communication },
    { label: 'Placement Timing', score: result.dimensionScores.placementReadiness },
    { label: 'Execution Rate', score: result.dimensionScores.executionReadiness },
  ];

  const readinessStatus =
    result.overallScore >= 85
      ? 'Ready'
      : result.overallScore >= 70
      ? 'Nearly Ready'
      : result.overallScore >= 45
      ? 'Developing'
      : 'Early Stage';

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-4 max-w-md mx-auto text-center selection:bg-[#1f3861] selection:text-white space-y-4">
      {/* Qalam Mascot */}
      <QalamCharacter
        state="ENCOURAGING"
        subtitles="Here is your verified career readiness score and auditor diagnostic chain. Let's inspect where evidence holds you back and where you shine."
      />

      {/* Main Score & Diagnostic Card */}
      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        {/* Score Radial Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#1f3861] font-bold flex items-center gap-1">
              <Target className="w-3 h-3 text-[#1f3861]" />
              Target: {role.title}
            </span>
            <h2 className="text-base font-bold text-[#0b111e] mt-0.5">Career Readiness Index</h2>
          </div>

           <motion.div
             initial={{ opacity: 0, scale: 0.65, rotate: -12 }}
             animate={{ opacity: 1, scale: 1, rotate: 0 }}
             transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.2 }}
            className={`w-16 h-16 rounded-2xl border flex flex-col items-center justify-center font-mono font-black shadow-xs ${
              result.overallScore >= 70
                ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                : result.overallScore >= 45
                ? 'text-blue-700 border-blue-200 bg-blue-50'
                : 'text-amber-700 border-amber-200 bg-amber-50'
            }`}
           >
            <span className="text-2xl leading-none font-bold">{result.overallScore}</span>
            <span className="text-[9px] text-slate-500 font-semibold mt-0.5">/ 100</span>
           </motion.div>
        </div>

         <motion.div
           initial={{ opacity: 0, y: -6 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.55, duration: 0.3 }}
           className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/60 px-3 py-2"
         >
           <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Readiness status</span>
           <span className="text-xs font-bold text-[#1f3861]">{readinessStatus}</span>
         </motion.div>

        {/* Tab Toggle: Index Overview vs 6-Stage Diagnostic Chain */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'overview' ? 'bg-white text-[#1f3861] shadow-2xs' : 'text-slate-600'
            }`}
          >
            Dimension Scores
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('diagnostics');
              trackEvent('diagnostic_chain_tab_viewed');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'diagnostics' ? 'bg-white text-[#1f3861] shadow-2xs' : 'text-slate-600'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Auditor Findings ({result.diagnosticConclusions?.length || result.gaps?.length || 3})
          </button>
        </div>

        {/* Constructive Diagnosis Summary */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1f3861]">
            <Award className="w-3.5 h-3.5 text-[#1f3861]" />
            Qalam's Auditor Assessment
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            "{result.diagnosisSummary}"
          </p>
        </div>

        {activeTab === 'overview' ? (
          /* 6 Dimension Sub-Scores Breakdown */
          <div className="space-y-2.5 pt-1">
            <h3 className="text-xs font-bold text-[#0b111e] uppercase tracking-wider flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-[#1f3861]" />
              Readiness Breakdown
            </h3>

            <div className="grid grid-cols-2 gap-2">
               {dimensions.map((d, idx) => (
                 <motion.div
                  key={d.label}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: 0.12 * idx, duration: 0.3 }}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 font-bold truncate">{d.label}</span>
                    <span className="font-mono font-black text-[#0b111e]">{d.score}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${d.score}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        d.score >= 70 ? 'bg-emerald-500' : d.score >= 45 ? 'bg-[#1f3861]' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                 </motion.div>
              ))}
            </div>
          </div>
        ) : (
          /* Diagnostic Chain Conclusions */
          <div className="space-y-3 pt-1 max-h-80 overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                Answer → Evidence → Skill → Score → Gap → Action
              </span>
            </div>
            {result.diagnosticConclusions && result.diagnosticConclusions.length > 0 ? (
              result.diagnosticConclusions.map((conclusion, idx) => (
                <DiagnosticChainCard key={conclusion.id || idx} conclusion={conclusion} index={idx} />
              ))
            ) : (
              result.gaps.map((gap, idx) => (
                <div key={gap.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span>{gap.title}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">{gap.severity}</span>
                  </div>
                  <p className="text-slate-600">{gap.description}</p>
                  <p className="text-emerald-700 font-semibold pt-1">Fix: {gap.recommendedAction}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Primary Next Action */}
        <button
          onClick={onNext}
          className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
        >
          <span>View Detailed Prioritized Gap Report</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};


