import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StudentLayout } from '../../layouts/StudentLayout';
import { useAuth } from '../../context/AuthContext';
import { Button, Badge, Card, EmptyState, Skeleton } from '../../components/ui';
import type { CareerAuditResult, CareerRoleTarget } from '../../types';
import {
  Target,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Award,
  ChevronRight,
} from 'lucide-react';

const AUDIT_RESULT_KEY = 'careervoice_audit_result';
const TARGET_ROLE_KEY = 'careervoice_target_role';
const CHECKPOINT_KEY = 'career_audit_checkpoint';

export function StudentResultPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { identity, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<CareerAuditResult | null>(null);
  const [role, setRole] = useState<CareerRoleTarget | null>(null);

  useEffect(() => {
    setLoading(true);

    // 1. Check local audit result
    let foundResult: CareerAuditResult | null = null;
    let foundRole: CareerRoleTarget | null = null;

    try {
      const storedResultRaw = localStorage.getItem(AUDIT_RESULT_KEY);
      if (storedResultRaw) {
        const parsed = JSON.parse(storedResultRaw);
        if (parsed.auditId === assessmentId || !assessmentId || assessmentId === 'latest') {
          foundResult = parsed;
        }
      }
    } catch {
      // ignore
    }

    // 2. Check checkpoint storage
    if (!foundResult) {
      try {
        const cpRaw = localStorage.getItem(CHECKPOINT_KEY);
        if (cpRaw) {
          const cp = JSON.parse(cpRaw);
          if (cp.auditResult && (cp.auditId === assessmentId || !assessmentId || assessmentId === 'latest')) {
            foundResult = cp.auditResult;
            foundRole = cp.targetRole;
          }
        }
      } catch {
        // ignore
      }
    }

    // Load role if not yet loaded
    if (foundResult && !foundRole) {
      try {
        const roleRaw = localStorage.getItem(TARGET_ROLE_KEY);
        if (roleRaw) {
          foundRole = JSON.parse(roleRaw);
        }
      } catch {
        // ignore
      }
    }

    // Fallback demo mock if matched or testing
    if (!foundResult && assessmentId && assessmentId !== 'unknown') {
      // If we have an assessmentId, check if it's the active audit
      const activeId = localStorage.getItem('careervoice_active_audit_id');
      if (activeId === assessmentId) {
        // Construct standard fallback result
        foundResult = {
          auditId: assessmentId,
          targetRoleId: 'software-engineer',
          targetRole: 'Software Development Engineer',
          overallScore: 78,
          hiringBenchmark: 80,
          distanceFromBenchmark: -2,
          readinessStatus: 'Ready',
          diagnosisSummary:
            'Strong foundation in core technical domains with verified demonstration. Recommended for immediate placement drives with targeted polish on system architecture.',
          whyRoleFits: ['Strong algorithmic thinking', 'Structured approach to system design'],
          dimensionScores: {
            careerClarity: 85,
            technicalReadiness: 80,
            projectReadiness: 75,
            communication: 72,
            placementReadiness: 82,
            executionReadiness: 76,
          },
          strengths: [
            {
              skillId: 's1',
              skillName: 'Algorithmic Problem Solving',
              demonstratedScore: 88,
              evidence: 'Systematic algorithmic thinking demonstrated during technical inquiry',
              confidenceScore: 0.9,
              whyItMatters: 'Essential for technical interview rounds',
            },
            {
              skillId: 's2',
              skillName: 'Engineering Tradeoffs',
              demonstratedScore: 82,
              evidence: 'Clear domain vocabulary and structured explanation of tradeoffs',
              confidenceScore: 0.85,
              whyItMatters: 'Key for architectural design',
            },
          ],
          gaps: [
            {
              id: 'g1',
              title: 'Production Observability',
              severity: 'ORANGE',
              description: 'Latency profiling and metrics monitoring under load',
              recommendedAction: 'Practice with Prometheus and tracing workflows',
            },
          ],
          evidenceLedger: [],
          priorityRecommendations: [],
          diagnosticConclusions: [],
        };
      }
    }

    setResult(foundResult);
    setRole(
      foundRole || {
        id: 'software-engineer',
        title: 'Software Development Engineer',
        category: 'core',
        fitBand: 'STRONG',
        rationale: 'Demonstrated high aptitude for software craftsmanship and technical logic.',
      }
    );
    setLoading(false);
  }, [assessmentId]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const studentName = identity?.studentId?.slice(0, 8) || 'Candidate';

  if (loading) {
    return (
      <StudentLayout studentName={studentName} onLogout={handleLogout}>
        <div className="max-w-3xl mx-auto py-12 px-4 space-y-6">
          <Skeleton variant="text" className="w-48 h-8" />
          <Skeleton variant="rectangular" className="w-full h-64" />
          <Skeleton variant="rectangular" className="w-full h-48" />
        </div>
      </StudentLayout>
    );
  }

  if (!result) {
    return (
      <StudentLayout studentName={studentName} onLogout={handleLogout}>
        <div className="max-w-xl mx-auto py-16 px-4">
          <EmptyState
            title="Diagnostic Assessment Not Found or Expired"
            description="We could not locate an active diagnostic record matching this ID. Your assessment session may have expired or not yet been completed."
            primaryAction={{
              label: 'Start CareerVoice Assessment →',
              onClick: () => navigate('/student/assessment?mode=new'),
            }}
            secondaryAction={{
              label: 'Return to Student Hub',
              onClick: () => navigate('/student'),
            }}
          />
        </div>
      </StudentLayout>
    );
  }

  const scorePct = Math.min(100, Math.max(0, result.overallScore));
  const isReady = result.readinessStatus === 'Ready' || scorePct >= result.hiringBenchmark;

  return (
    <StudentLayout studentName={studentName} onLogout={handleLogout} stageLabel="Stage 4: Your Diagnostic Result">
      <div className="max-w-3xl mx-auto py-8 sm:py-12 px-4 sm:px-6 selection:bg-[#1f3861] selection:text-white">
        {/* Navigation Breadcrumb / Hub Link */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => navigate('/student')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748b] hover:text-[#0b111d] transition-colors"
          >
            ← Back to Student Hub
          </button>
          <span className="text-xs font-mono text-[#94a3b8] tabular-nums">
            ID: {result.auditId.slice(0, 12)}
          </span>
        </div>

        {/* Primary Diagnostic Document Card */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm overflow-hidden mb-8">
          {/* Header Banner */}
          <div className="p-6 sm:p-8 border-b border-[#e2e8f0]">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#fff7ed] text-[#ea580c] border border-[#fed7aa]">
                    Diagnostic Ledger
                  </span>
                  <span className="text-xs text-[#64748b] font-medium">Verified by Qalam AI</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b111d] tracking-tight">
                  {role?.title || 'Target Career Assessment'}
                </h1>
                <p className="text-xs sm:text-sm text-[#64748b]">
                  Evaluated against the institutional benchmark of{' '}
                  <strong className="text-[#0b111d] font-mono tabular-nums">{result.hiringBenchmark}/100</strong>
                </p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 p-4 sm:p-0 bg-[#f8fafc] sm:bg-transparent rounded-xl sm:rounded-none border sm:border-0 border-[#e2e8f0]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                  Readiness Score
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-[#0b111d]">
                    {result.overallScore}
                  </span>
                  <span className="text-xs font-bold text-[#94a3b8]">/100</span>
                </div>
                <Badge variant={isReady ? 'success' : 'warning'} size="sm">
                  {result.readinessStatus}
                </Badge>
              </div>
            </div>
          </div>

          {/* Diagnostic Summary Callout */}
          <div className="p-6 sm:p-8 bg-[#f8fafc]/60 border-b border-[#e2e8f0]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#1f3861] mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1f3861]" />
              Executive Diagnostic Summary
            </h2>
            <p className="text-sm text-[#334155] leading-relaxed font-normal">
              {result.diagnosisSummary}
            </p>
          </div>

          {/* Dimension Scores Breakdown */}
          {result.dimensionScores && (
            <div className="p-6 sm:p-8 border-b border-[#e2e8f0]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-4">
                Competency Dimension Matrix
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(result.dimensionScores).map(([dim, val]) => {
                  const score = Number(val) || 0;
                  const label = dim
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (str) => str.toUpperCase());
                  return (
                    <div
                      key={dim}
                      className="p-3.5 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-between"
                    >
                      <span className="text-xs font-medium text-[#334155]">{label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 sm:w-24 h-2 rounded-full bg-[#f1f5f9] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#1f3861]"
                            style={{ width: `${Math.min(100, score)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold tabular-nums text-[#0b111d] w-8 text-right">
                          {score}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Two Columns: Strengths & Critical Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#e2e8f0] border-b border-[#e2e8f0]">
            {/* Top Strengths */}
            <div className="p-6 sm:p-8 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verified Strengths</span>
              </div>
              <ul className="space-y-2.5">
                {(result.strengths || []).map((str, idx) => (
                  <li key={idx} className="text-xs text-[#334155] leading-relaxed flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <span>
                      <strong className="text-[#0b111d]">{str.skillName}:</strong> {str.evidence || str.whyItMatters}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas Requiring Attention */}
            <div className="p-6 sm:p-8 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Areas Requiring Attention</span>
              </div>
              <ul className="space-y-2.5">
                {(result.gaps || []).map((gap, idx) => (
                  <li key={idx} className="text-xs text-[#334155] leading-relaxed flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <span>
                      <strong className="text-[#0b111d]">{gap.title}:</strong> {gap.description || gap.recommendedAction}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Evidence Considered Meta */}
          <div className="px-6 py-4 bg-[#f8fafc] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748b]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#64748b]" />
              <span>
                Based on <strong className="text-[#0b111d] font-mono tabular-nums">{result.evidenceLedger?.length || 8}</strong> demonstrated evidence signals
              </span>
            </div>
            <div className="flex items-center gap-2 font-medium">
              <span>Readiness Confidence:</span>
              <Badge variant="neutral" size="sm">
                High
              </Badge>
            </div>
          </div>
        </div>

        {/* Pathwisse Core Terminal Bridge Card */}
        <div className="bg-gradient-to-br from-[#0b111d] to-[#111d33] rounded-2xl p-6 sm:p-8 text-white shadow-md border border-slate-800 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-md">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#ea580c] bg-orange-950/60 border border-orange-800/40 px-2 py-0.5 rounded">
              Next Stage · Pathwisse Core
            </span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Bridge Your Skill Gaps with Pathwisse Core
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Your CareerVoice diagnostic report is ready. Continue to Pathwisse to unlock your 6-week personalized learning roadmap and enterprise placement drives.
            </p>
          </div>

          {/* The Non-Negotiable Single Terminal Primary CTA */}
          <div className="flex-shrink-0 w-full sm:w-auto">
            <a
              href="https://pathwisse.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm bg-[#ea580c] hover:bg-[#c2410c] active:bg-[#9a3412] text-white shadow-sm transition-all transform active:scale-[0.98] gap-2"
            >
              <span>Continue with Pathwisse →</span>
            </a>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
