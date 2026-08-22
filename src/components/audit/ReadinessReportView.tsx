import React, { useEffect, useState } from 'react';
import type { CareerAuditResult, CareerRoleTarget } from '../../types';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { DiagnosticChainCard } from './DiagnosticChainCard';
import { EvidenceCoverageBadge } from './EvidenceCoverageBadge';
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  FileSearch,
  ShieldCheck,
  Target,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface ReadinessReportViewProps {
  result: CareerAuditResult;
  role: CareerRoleTarget;
  onNext: () => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
}

export const ReadinessReportView: React.FC<ReadinessReportViewProps> = ({
  result,
  role,
  onNext,
  trackEvent,
}) => {
  const [showFullEvidenceLedger, setShowFullEvidenceLedger] = useState(false);
  const [showDiagnosticChain, setShowDiagnosticChain] = useState(false);

  useEffect(() => {
    trackEvent('readiness_report_viewed', {
      auditId: result.auditId,
      score: result.overallScore,
      readinessStatus: result.readinessStatus,
      benchmark: result.hiringBenchmark,
    });
  }, [result, trackEvent]);

  const dimensions = [
    ['Career Clarity', result.dimensionScores.careerClarity],
    ['Technical Readiness', result.dimensionScores.technicalReadiness],
    ['Project Readiness', result.dimensionScores.projectReadiness],
    ['Communication', result.dimensionScores.communication],
    ['Placement Readiness', result.dimensionScores.placementReadiness],
    ['Execution Discipline', result.dimensionScores.executionReadiness],
  ] as const;

  const readinessStatus =
    result.overallScore >= 85
      ? 'Ready'
      : result.overallScore >= 70
      ? 'Nearly Ready'
      : result.overallScore >= 45
      ? 'Developing'
      : 'Early Stage';

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] px-4 py-5 max-w-md mx-auto text-center selection:bg-[#1f3861] selection:text-white space-y-4">
      <QalamCharacter
        state={result.readinessStatus === 'Ready' ? 'CELEBRATING' : 'CURIOUS'}
        subtitles={`Here is your verified ${role.title} Career Readiness Report, calculated purely from stored evidence against the ${result.hiringBenchmark}/100 benchmark.`}
      />

      <div className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-5">
        {/* 1. Target Role & Verified Direction */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1f3861] flex items-center gap-1">
              <Target className="w-3 h-3 text-[#1f3861]" />
              Your Career Direction
            </span>
            <h2 className="text-lg font-bold text-[#0b111e] mt-0.5">{role.title}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Status: <span className="font-semibold text-[#1f3861]">{result.readinessStatus}</span></p>
          </div>
<<<<<<< HEAD

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
=======
          <div className="text-right">
            <div className="text-3xl font-mono font-extrabold text-[#1f3861]">{result.overallScore}</div>
            <div className="text-[10px] font-bold text-slate-500">Readiness Score</div>
          </div>
        </div>

        {/* 2. Why This Role Fits */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]">
            <TrendingUp className="w-3.5 h-3.5 text-[#1f3861]" />
            <span>Why This Role Fits You</span>
          </div>
          {result.whyRoleFits.length > 0 ? (
            result.whyRoleFits.map((reason, index) => (
              <div
                key={`${reason}-${index}`}
                className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3 text-[11px] leading-relaxed text-slate-700 font-medium"
              >
                {reason}
              </div>
            ))
          ) : (
            <p className="text-[11px] text-slate-500">Strong alignment with your stated engineering interest.</p>
          )}
        </section>

        {/* 3. What You Already Do Well (Strengths) */}
        <section className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>What You Already Do Well</span>
          </div>
          {result.strengths.length > 0 ? (
            result.strengths.map((strength) => (
              <div
                key={strength.skillId}
                className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0b111e]">{strength.skillName}</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-800">
                    Demonstrated: {strength.demonstratedScore}/100
                  </span>
                </div>
                <p className="text-[11px] text-slate-700">
                  <strong>Observed Evidence:</strong> {strength.evidence}
                </p>
                <p className="text-[11px] text-slate-600">
                  <strong>Why it matters:</strong> {strength.whyItMatters}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 font-medium">
              You are building foundational competencies across core engineering principles.
            </div>
          )}
        </section>

        {/* 4. Career Readiness Benchmark & Distance */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]">
              <Target className="w-3.5 h-3.5 text-[#1f3861]" />
              <span>Career Readiness Breakdown</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-600">
              Benchmark: {result.hiringBenchmark}/100
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <span className="text-[9px] font-bold uppercase text-slate-500">Benchmark Bar</span>
              <p className="text-base font-mono font-bold text-[#0b111e]">{result.hiringBenchmark}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <span className="text-[9px] font-bold uppercase text-slate-500">Distance to Bar</span>
              <p className="text-base font-mono font-bold text-[#1f3861]">{result.distanceFromBenchmark}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {dimensions.map(([label, score]) => (
              <div key={label} className="rounded-xl border border-slate-200 p-2.5 bg-white">
                <div className="flex justify-between gap-1 text-[10px] font-semibold">
                  <span className="text-slate-600 truncate">{label}</span>
                  <span className="font-mono text-[#1f3861] font-bold">{score}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#1f3861] transition-all duration-500"
                    style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Fix These First (Top Priorities) */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]">
            <BookOpenCheck className="w-3.5 h-3.5 text-[#1f3861]" />
            <span>Fix These First (Priority Actions)</span>
          </div>
          {result.priorityRecommendations.map((rec) => (
            <div key={rec.recommendationId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-lg bg-[#1f3861] text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {rec.rank}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0b111e]">{rec.recommendedAction}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">{rec.reason}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* 6. Expandable Evidence Ledger */}
        <section className="space-y-2 border-t border-slate-100 pt-3">
>>>>>>> c9a0a7f28e698dc85cf6f8f39b82247c90001fab
          <button
            type="button"
            onClick={() => setShowFullEvidenceLedger(!showFullEvidenceLedger)}
            className="w-full flex items-center justify-between text-xs font-bold text-[#0b111e] hover:text-[#1f3861] transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <FileSearch className="w-3.5 h-3.5 text-[#1f3861]" />
              <span>Evidence Behind the Score</span>
            </div>
            {showFullEvidenceLedger ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

<<<<<<< HEAD
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
=======
          {showFullEvidenceLedger && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar pt-1">
              {result.evidenceLedger.map((item) => (
                <div key={item.skillId} className="rounded-2xl border border-slate-200 p-3 space-y-1 bg-slate-50/60">
                  <p className="text-xs font-bold text-[#0b111e]">{item.skillName}</p>
                  {item.observedEvidence.map((v, idx) => (
                    <p key={`obs-${idx}`} className="text-[10px] text-emerald-800">
                      <strong>Observed:</strong> {v}
                    </p>
                  ))}
                  {item.weakEvidence.map((v, idx) => (
                    <p key={`weak-${idx}`} className="text-[10px] text-amber-800">
                      <strong>Weak:</strong> {v}
                    </p>
                  ))}
                  {item.missingEvidence.map((v, idx) => (
                    <p key={`miss-${idx}`} className="text-[10px] text-rose-800">
                      <strong>Missing:</strong> {v}
                    </p>
                  ))}
                </div>
>>>>>>> c9a0a7f28e698dc85cf6f8f39b82247c90001fab
              ))}
            </div>
          )}
        </section>

        {/* 7. Diagnostic Summary */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Diagnostic Summary</p>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">{result.diagnosisSummary}</p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onNext}
          className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
        >
          <span>View Prioritised Skill Gaps & Roadmap</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[10px] text-slate-400 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        All ratings are derived strictly from persisted evidence.
      </p>
    </div>
  );
};
