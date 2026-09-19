import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlacementLayout } from '../../layouts/PlacementLayout';
import { useAuth } from '../../context/AuthContext';
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Users,
  BarChart3,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
  Compass,
  Zap,
  Plus,
} from 'lucide-react';

interface TopRole {
  roleTitle: string;
  studentCount: number;
  percentage: number;
  demandLevel: string;
}

interface CriticalGap {
  skillName: string;
  gapAverage: number;
  affectedCount: number;
  priority: string;
  recommendedAction: string;
}

interface ReadinessDistribution {
  ready: number;
  growing: number;
  foundation: number;
}

interface InsightsData {
  topRoles?: TopRole[];
  criticalGaps?: CriticalGap[];
  readinessDistribution?: ReadinessDistribution;
}

const DEMAND_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Extremely High': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200/80' },
  High: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200/80' },
  Moderate: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200/80' },
};

const GAP_PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  High: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  Medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Low: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

export function InsightsPage() {
  const navigate = useNavigate();
  const { collegeContext } = useAuth();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const collegeId = collegeContext?.collegeId;
      const res = await fetch(
        `/api/college/dashboard${collegeId ? `?collegeId=${collegeId}` : ''}`
      );
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();
      setInsights(json?.insights ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load insights.');
    } finally {
      setLoading(false);
    }
  }, [collegeContext?.collegeId]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const hasInsightsData = Boolean(
    insights &&
      ((insights.topRoles && insights.topRoles.length > 0) ||
        (insights.criticalGaps && insights.criticalGaps.length > 0) ||
        (insights.readinessDistribution &&
          (insights.readinessDistribution.ready > 0 ||
            insights.readinessDistribution.growing > 0 ||
            insights.readinessDistribution.foundation > 0)))
  );

  const dist = insights?.readinessDistribution;
  const totalDist = dist ? dist.ready + dist.growing + dist.foundation : 0;
  const pct = (val: number) => (totalDist > 0 ? Math.round((val / totalDist) * 100) : 0);

  return (
    <PlacementLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#0b111d]">
                Cohort Insights &amp; Analytics
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                AI Diagnostics
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Aggregated skill signals, market alignment, and diagnostic intervention points for {collegeContext?.collegeName ?? 'your cohort'}.
            </p>
          </div>
          <button
            onClick={fetchInsights}
            title="Refresh insights"
            className="p-2.5 bg-white hover:bg-slate-50 border border-[#e2e8f0] text-slate-600 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#e2e8f0] rounded-xl shadow-xs">
            <Loader2 className="w-7 h-7 animate-spin text-[#ea580c] mb-3" />
            <span className="text-sm font-medium text-slate-600">Synthesizing cohort diagnostics…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50/80 border border-red-200 rounded-xl p-5 flex items-start gap-3.5 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-900">Could not load cohort insights</h3>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchInsights}
                className="mt-3 text-xs font-semibold text-red-700 hover:text-red-900 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && !hasInsightsData && (
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-8 sm:p-12 shadow-xs text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 text-[#ea580c] flex items-center justify-center mx-auto shadow-xs">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h2 className="text-lg font-bold text-[#0b111d]">No Cohort Insights Available Yet</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Insights, benchmark distributions, and critical skill gap signals populate automatically as students complete their CareerVoice diagnostic assessments.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/placement/campaigns/new')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#ea580c] text-white text-xs font-bold hover:bg-[#c2410c] transition shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Assessment Campaign</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/placement/students')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-[#e2e8f0] text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-xs cursor-pointer"
              >
                <Users className="w-4 h-4 text-slate-500" />
                <span>View Student Roster</span>
              </button>
            </div>
          </div>
        )}

        {!loading && !error && hasInsightsData && (
          <div className="space-y-6">
            {/* Section 1: Readiness Distribution */}
            {dist && totalDist > 0 && (
              <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#ea580c]" />
                    <h2 className="font-bold text-base text-[#0b111d]">
                      Readiness Distribution
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    {totalDist} evaluated students
                  </span>
                </div>

                {/* Segmented Bar */}
                <div className="h-3 rounded-full overflow-hidden flex bg-slate-100 gap-1 p-0.5 border border-slate-200">
                  {dist.ready > 0 && (
                    <div
                      style={{ width: `${pct(dist.ready)}%` }}
                      className="bg-emerald-500 rounded-full transition-all duration-500"
                      title={`Placement Ready: ${dist.ready} (${pct(dist.ready)}%)`}
                    />
                  )}
                  {dist.growing > 0 && (
                    <div
                      style={{ width: `${pct(dist.growing)}%` }}
                      className="bg-amber-500 rounded-full transition-all duration-500"
                      title={`Growing: ${dist.growing} (${pct(dist.growing)}%)`}
                    />
                  )}
                  {dist.foundation > 0 && (
                    <div
                      style={{ width: `${pct(dist.foundation)}%` }}
                      className="bg-slate-400 rounded-full transition-all duration-500"
                      title={`Foundation: ${dist.foundation} (${pct(dist.foundation)}%)`}
                    />
                  )}
                </div>

                {/* Legend Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-800">Placement Ready</span>
                      <span className="text-xs font-mono font-bold text-emerald-700">{pct(dist.ready)}%</span>
                    </div>
                    <p className="text-xl font-bold text-emerald-900 font-mono mt-1">{dist.ready}</p>
                    <p className="text-[11px] text-emerald-700/80 mt-0.5">High fit for immediate recruitment</p>
                  </div>

                  <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-800">Growing Trajectory</span>
                      <span className="text-xs font-mono font-bold text-amber-700">{pct(dist.growing)}%</span>
                    </div>
                    <p className="text-xl font-bold text-amber-900 font-mono mt-1">{dist.growing}</p>
                    <p className="text-[11px] text-amber-700/80 mt-0.5">Needs 2-4 week targeted polish</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">Foundation Stage</span>
                      <span className="text-xs font-mono font-bold text-slate-600">{pct(dist.foundation)}%</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800 font-mono mt-1">{dist.foundation}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Needs fundamental bridge course</p>
                  </div>
                </div>
              </div>
            )}

            {/* Section 2: Top Career Directions */}
            {insights?.topRoles && insights.topRoles.length > 0 && (
              <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <h2 className="font-bold text-base text-[#0b111d]">
                      Top Career Directions
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">Market Demand Breakdown</span>
                </div>

                <div className="divide-y divide-[#e2e8f0]">
                  {insights.topRoles.map((role, i) => {
                    const demandStyle =
                      DEMAND_STYLES[role.demandLevel] ?? DEMAND_STYLES['Moderate'];

                    return (
                      <div key={i} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="font-semibold text-sm text-[#0b111d]">
                              {role.roleTitle}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${demandStyle.bg} ${demandStyle.text} ${demandStyle.border}`}
                            >
                              {role.demandLevel} Demand
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden max-w-md">
                              <div
                                className="h-full bg-slate-900 rounded-full"
                                style={{ width: `${role.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 font-mono">
                              {role.percentage}% of cohort
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 text-right sm:pl-4">
                          <p className="font-mono text-base font-bold text-[#0b111d]">
                            {role.studentCount}
                          </p>
                          <p className="text-[11px] text-slate-500">students</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 3: Critical Skill Gaps */}
            {insights?.criticalGaps && insights.criticalGaps.length > 0 && (
              <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                    <h2 className="font-bold text-base text-[#0b111d]">
                      Critical Skill Gaps &amp; Interventions
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">Recommended Placement Actions</span>
                </div>

                <div className="space-y-3">
                  {insights.criticalGaps.map((gap, i) => {
                    const pStyle =
                      GAP_PRIORITY_STYLES[gap.priority] ?? GAP_PRIORITY_STYLES.Medium;

                    return (
                      <div
                        key={i}
                        className="p-4 rounded-lg bg-slate-50 border border-[#e2e8f0] hover:border-slate-300 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm text-[#0b111d]">
                              {gap.skillName}
                            </h3>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${pStyle.bg} ${pStyle.text} ${pStyle.border}`}
                            >
                              {gap.priority} Priority
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
                            <Zap className="w-3.5 h-3.5 text-[#ea580c] flex-shrink-0" />
                            <span><strong>Action:</strong> {gap.recommendedAction}</span>
                          </p>
                        </div>

                        <div className="text-right flex-shrink-0 pt-1 sm:pt-0">
                          <span className="text-lg font-bold font-mono text-red-600">
                            {gap.affectedCount}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">students impacted</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PlacementLayout>
  );
}
