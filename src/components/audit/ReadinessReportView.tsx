import React, { useEffect } from 'react';
import { ArrowRight, Award, BookOpenCheck, CheckCircle2, FileSearch, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import type { CareerAuditResult, CareerRoleTarget } from '../../types';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { DiagnosticChainCard } from './DiagnosticChainCard';

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
      readinessBenchmark: result.readinessBenchmark,
    });
  }, [result, trackEvent]);

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] px-4 py-5 max-w-md mx-auto text-center space-y-4">
      <QalamCharacter
        state={result.readinessStatus === 'Ready' ? 'CELEBRATING' : 'CURIOUS'}
        subtitles={`Your ${role.title} diagnosis is ready. The readiness number below comes only from competencies that met their configured evidence threshold.`}
      />

      <div className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm space-y-5">
        <header className="border-b border-slate-100 pb-4 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Target Role</p>
            <h2 className="text-lg font-bold text-[#0b111e]">{result.targetRole}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[9px] uppercase font-bold text-slate-400">Career Readiness</p>
              <p className="text-2xl font-mono font-extrabold text-[#1f3861]">{result.overallScore}<span className="text-[10px] text-slate-400"> /100</span></p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[9px] uppercase font-bold text-slate-400">Readiness Status</p>
              <p className="text-base font-bold text-[#0b111e] mt-1">{result.readinessStatus}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 p-3"><p className="text-[9px] uppercase font-bold text-slate-400">Target-role readiness benchmark</p><p className="text-lg font-mono font-bold text-[#0b111e]">{result.readinessBenchmark}</p></div>
            <div className="rounded-xl border border-slate-200 p-3"><p className="text-[9px] uppercase font-bold text-slate-400">Distance from benchmark</p><p className="text-lg font-mono font-bold text-[#0b111e]">{result.distanceFromBenchmark}</p></div>
          </div>
        </header>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><TrendingUp className="w-3.5 h-3.5 text-[#1f3861]" />Why This Role Fits</div>
          {result.whyRoleFits.length ? result.whyRoleFits.map((reason, index) => <div key={index} className="rounded-xl border border-blue-100 bg-blue-50/50 p-2.5 text-[11px] leading-relaxed text-slate-700">{reason}</div>) : <p className="text-[11px] text-slate-500">No persisted discovery rationale is available.</p>}
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><Award className="w-3.5 h-3.5 text-emerald-600" />What Already Works</div>
          {result.strengths.length ? result.strengths.map((strength) => (
            <div key={strength.skillId} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-bold text-[#0b111e]">{strength.skillName}</span><span className="text-[10px] font-mono font-bold text-emerald-800">{strength.demonstratedScore}/100</span></div>
              <p className="text-[10px] text-emerald-800">Evidence confidence: {strength.confidenceScore}%</p>
              <p className="text-[11px] text-slate-700"><strong>Observed:</strong> {strength.evidence}</p>
              <p className="text-[11px] text-slate-600"><strong>Why it matters:</strong> {strength.whyItMatters}</p>
            </div>
          )) : <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">No competency currently qualifies as a demonstrated strength.</p>}
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><Target className="w-3.5 h-3.5 text-[#1f3861]" />Complete Skill Map</div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {result.skillMap.map((skill) => (
              <div key={skill.skillId} className="rounded-2xl border border-slate-200 p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-xs font-bold text-[#0b111e]">{skill.skillName}</p><p className="text-[9px] text-slate-400">Expected level: {skill.requiredLevel}</p></div>
                  <span className="text-[9px] rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-bold text-slate-600">{skill.evidenceStrength}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="rounded-lg bg-slate-50 p-2"><p className="text-[8px] uppercase text-slate-400 font-bold">Expected</p><p className="text-xs font-mono font-bold">{skill.expectedReadiness}</p></div>
                  <div className="rounded-lg bg-slate-50 p-2"><p className="text-[8px] uppercase text-slate-400 font-bold">Demonstrated</p><p className="text-xs font-mono font-bold">{skill.demonstratedReadiness}</p></div>
                  <div className="rounded-lg bg-slate-50 p-2"><p className="text-[8px] uppercase text-slate-400 font-bold">Confidence</p><p className="text-xs font-mono font-bold">{skill.evidenceConfidence}%</p></div>
                </div>
                {skill.evidenceObserved.map((item, index) => <p key={`observed-${index}`} className="text-[10px] text-emerald-800"><strong>Evidence observed:</strong> {item}</p>)}
                {skill.missingEvidence.map((item, index) => <p key={`missing-${index}`} className="text-[10px] text-rose-800"><strong>Missing evidence:</strong> {item}</p>)}
              </div>
            ))}
          </div>
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
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><BookOpenCheck className="w-3.5 h-3.5 text-[#1f3861]" />Fix These First</div>
          {result.gaps.filter((gap) => (gap.gap || 0) > 0).slice(0, 5).map((gap, index) => (
            <div key={gap.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start gap-2"><span className="w-5 h-5 rounded-lg bg-[#1f3861] text-white text-[9px] font-mono font-bold flex items-center justify-center shrink-0">{index + 1}</span><div><p className="text-xs font-bold text-[#0b111e]">{gap.skillName || gap.title}</p><p className="text-[10px] text-slate-600 mt-1">Expected {gap.expectedScore} · demonstrated {gap.demonstratedScore} · gap {gap.gap}</p><p className="text-[10px] text-slate-700 mt-1">{gap.recommendedAction}</p></div></div>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><BookOpenCheck className="w-3.5 h-3.5 text-[#1f3861]" />Recommended Actions</div>
          {result.priorityRecommendations.map((recommendation) => (
            <div key={recommendation.recommendationId} className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-bold text-[#0b111e]">{recommendation.recommendedAction}</p>
              <p className="text-[10px] text-slate-600 mt-1">{recommendation.reason}</p>
              <span className={`inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${recommendation.mappingStatus === 'MAPPED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>{recommendation.mappingStatus}</span>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><ShieldCheck className="w-3.5 h-3.5 text-[#1f3861]" />Diagnostic Chain</div>
          <div className="space-y-2">{result.diagnosticConclusions.map((conclusion, index) => <DiagnosticChainCard key={conclusion.id} conclusion={conclusion} index={index} />)}</div>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Diagnosis</p><p className="text-xs text-slate-700 leading-relaxed mt-1">{result.diagnosisSummary}</p></div>

        <button onClick={onNext} className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] text-white font-bold text-xs flex items-center justify-center gap-2"><span>Review Priority Gaps</span><ArrowRight className="w-4 h-4" /></button>
      </div>

      <p className="text-[10px] text-slate-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Readiness is calculated from persisted evidence and configured role-skill weights. It is not an external hiring-data claim.</p>
    </div>
  );
};
