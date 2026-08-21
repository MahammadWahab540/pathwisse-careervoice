import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { CareerAuditResult, CareerRoleTarget } from '../../types';
import { Award, ArrowRight, CheckCircle2, AlertTriangle, ChevronRight, BarChart2, Zap, Target } from 'lucide-react';

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

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white space-y-4">
      {/* Qalam Mascot */}
      <QalamCharacter
        state="ENCOURAGING"
        subtitles="Here is your verified career readiness score. Let's look at your key strengths and growth areas."
      />

      {/* Main Score Card */}
      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        {/* Score Radial Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#1f3861] font-bold flex items-center gap-1">
              <Target className="w-3 h-3 text-[#1f3861]" />
              Target: {role.title}
            </span>
            <h2 className="text-base font-bold text-[#0b111e] mt-0.5">Career Readiness Index</h2>
          </div>

          <div
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
          </div>
        </div>

        {/* Constructive Diagnosis Summary */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1f3861]">
            <Award className="w-3.5 h-3.5 text-[#1f3861]" />
            Qalam's Strategic Feedback
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            "{result.diagnosisSummary}"
          </p>
        </div>

        {/* 6 Dimension Sub-Scores Breakdown */}
        <div className="space-y-2.5 pt-1">
          <h3 className="text-xs font-bold text-[#0b111e] uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-[#1f3861]" />
            Readiness Breakdown
          </h3>

          <div className="grid grid-cols-2 gap-2">
            {dimensions.map((d) => (
              <div
                key={d.label}
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
              </div>
            ))}
          </div>
        </div>

        {/* Primary Next Action */}
        <button
          onClick={onNext}
          className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
        >
          <span>View Identified Gaps & Solutions</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

