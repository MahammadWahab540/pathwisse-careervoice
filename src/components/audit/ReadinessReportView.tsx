import React, { useEffect } from 'react';
import { CareerAuditResult, CareerRoleTarget } from '../../types';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { DiagnosticChainCard } from './DiagnosticChainCard';
import { ArrowRight, Award, BookOpenCheck, CheckCircle2, FileSearch, ShieldCheck, Target, TrendingUp } from 'lucide-react';

interface ReadinessReportViewProps {
  result: CareerAuditResult;
  role: CareerRoleTarget;
  onNext: () => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
}

export const ReadinessReportView: React.FC<ReadinessReportViewProps> = ({ result, role, onNext, trackEvent }) => {
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
    ['Technical', result.dimensionScores.technicalReadiness],
    ['Projects', result.dimensionScores.projectReadiness],
    ['Communication', result.dimensionScores.communication],
    ['Placement', result.dimensionScores.placementReadiness],
    ['Execution', result.dimensionScores.executionReadiness],
  ] as const;

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] px-4 py-5 max-w-md mx-auto text-center selection:bg-[#1f3861] selection:text-white space-y-4">
      <QalamCharacter
        state={result.readinessStatus === 'Ready' ? 'CELEBRATING' : 'CURIOUS'}
        subtitles={`Your ${role.title} audit is complete. The ${result.overallScore}/100 score below was calculated from persisted evidence against a ${result.hiringBenchmark}/100 hiring benchmark.`}
      />

      <div className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-[0_4px_20px_rgb(0,0,0,0.03)] space-y-5">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1f3861]">Verified Readiness</span>
            <h2 className="text-lg font-bold text-[#0b111e] mt-0.5">{result.readinessStatus}</h2>
            <p className="text-[11px] text-slate-500 mt-1">Audit {result.auditId}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono font-extrabold text-[#1f3861]">{result.overallScore}</div>
            <div className="text-[10px] font-bold text-slate-500">/ 100</div>
          </div>
        </div>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><Target className="w-3.5 h-3.5 text-[#1f3861]" />Overall Readiness</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="text-[9px] font-bold uppercase text-slate-500">Hiring benchmark</span><p className="text-lg font-mono font-bold text-[#0b111e]">{result.hiringBenchmark}</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="text-[9px] font-bold uppercase text-slate-500">Distance to bar</span><p className="text-lg font-mono font-bold text-[#0b111e]">{result.distanceFromBenchmark}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {dimensions.map(([label, score]) => (
              <div key={label} className="rounded-xl border border-slate-200 p-2.5">
                <div className="flex justify-between gap-2 text-[10px] font-semibold"><span className="text-slate-600">{label}</span><span className="font-mono text-[#1f3861]">{score}</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#1f3861]" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><TrendingUp className="w-3.5 h-3.5 text-[#1f3861]" />Why This Role Fits</div>
          {result.whyRoleFits.length > 0 ? result.whyRoleFits.map((reason, index) => (
            <div key={`${reason}-${index}`} className="rounded-xl border border-blue-100 bg-blue-50/50 p-2.5 text-[11px] leading-relaxed text-slate-700">{reason}</div>
          )) : <p className="text-[11px] text-slate-500">No evidence-supported fit reason was produced.</p>}
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><Award className="w-3.5 h-3.5 text-emerald-600" />Strengths</div>
          {result.strengths.length > 0 ? result.strengths.map((strength) => (
            <div key={strength.skillId} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1.5">
              <div className="flex items-center justify-between"><span className="text-xs font-bold text-[#0b111e]">{strength.skillName}</span><span className="text-[10px] font-mono font-bold text-emerald-800">{strength.demonstratedScore}/100 · {strength.confidenceScore}% conf.</span></div>
              <p className="text-[11px] text-slate-700"><strong>Evidence:</strong> {strength.evidence}</p>
              <p className="text-[11px] text-slate-600"><strong>Why it matters:</strong> {strength.whyItMatters}</p>
            </div>
          )) : <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">No competency crossed the configured strength threshold yet. That is a diagnostic result, not a missing section.</p>}
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><FileSearch className="w-3.5 h-3.5 text-[#1f3861]" />Evidence Ledger</div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {result.evidenceLedger.map((item) => (
              <div key={item.skillId} className="rounded-2xl border border-slate-200 p-3 space-y-1.5">
                <p className="text-xs font-bold text-[#0b111e]">{item.skillName}</p>
                {item.observedEvidence.map((value, index) => <p key={`observed-${index}`} className="text-[10px] text-emerald-800"><strong>Observed:</strong> {value}</p>)}
                {item.weakEvidence.map((value, index) => <p key={`weak-${index}`} className="text-[10px] text-amber-800"><strong>Weak:</strong> {value}</p>)}
                {item.missingEvidence.map((value, index) => <p key={`missing-${index}`} className="text-[10px] text-rose-800"><strong>Missing:</strong> {value}</p>)}
                {item.contradictoryEvidence.map((value, index) => <p key={`contradictory-${index}`} className="text-[10px] text-rose-900"><strong>Contradictory:</strong> {value}</p>)}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><BookOpenCheck className="w-3.5 h-3.5 text-[#1f3861]" />Priority Recommendations</div>
          {result.priorityRecommendations.map((recommendation) => (
            <div key={recommendation.recommendationId} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-2"><span className="w-5 h-5 rounded-lg bg-[#1f3861] text-white text-[9px] font-mono font-bold flex items-center justify-center shrink-0">{recommendation.rank}</span><div><p className="text-xs font-bold text-[#0b111e]">{recommendation.recommendedAction}</p><p className="text-[10px] text-slate-600 mt-1">{recommendation.reason}</p><span className={`inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${recommendation.mappingStatus === 'MAPPED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>{recommendation.mappingStatus}</span></div></div>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><ShieldCheck className="w-3.5 h-3.5 text-[#1f3861]" />Diagnostic Chain</div>
          <div className="space-y-2">{result.diagnosticConclusions.map((conclusion, index) => <DiagnosticChainCard key={conclusion.id} conclusion={conclusion} index={index} />)}</div>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Diagnostic Summary</p>
          <p className="text-xs text-slate-700 leading-relaxed mt-1">{result.diagnosisSummary}</p>
        </div>

        <button onClick={onNext} className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"><span>Review Prioritised Skill Gaps</span><ArrowRight className="w-4 h-4" /></button>
      </div>

      <p className="text-[10px] text-slate-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Scores are deterministic from persisted classifications and configured weights.</p>
    </div>
  );
};
