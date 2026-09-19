import React from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  FileText,
  AlertTriangle,
  RotateCcw,
  Building2,
  Mic,
  ShieldCheck,
  Calendar,
  Layers,
  LogOut,
  PlayCircle,
} from 'lucide-react';
import type { UserIdentity, CareerAuditResult, CareerRoleTarget } from '../../types';
import type { UserRole } from '../../domain/careerVoiceFlow';

interface StudentDashboardViewProps {
  identity: UserIdentity | null;
  firstName: string;
  collegeName: string;
  departmentName: string;
  academicYear: string;
  auditResult: CareerAuditResult | null;
  targetRole: CareerRoleTarget | null;
  inProgressAuditId?: string | null;
  onStartNewAudit: () => void;
  onResumeAudit?: () => void;
  onViewReadinessReport: () => void;
  onViewGapReport: () => void;
  onViewRoadmap: () => void;
  onSwitchToCollege?: () => void;
  onLogout?: () => void;
  trackEvent?: (name: string, meta?: Record<string, unknown>) => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  identity,
  firstName,
  collegeName,
  departmentName,
  academicYear,
  auditResult,
  targetRole,
  inProgressAuditId,
  onStartNewAudit,
  onResumeAudit,
  onViewReadinessReport,
  onViewGapReport,
  onViewRoadmap,
  onSwitchToCollege,
  onLogout,
  trackEvent,
}) => {
  const displayName = firstName || 'Student Candidate';
  const hasCompletedAudit = Boolean(auditResult && targetRole);
  const score = auditResult?.overallScore || 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 text-left">
      {/* Student Welcome & Identity Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-xl border border-[#e2e8f0] p-6 sm:p-7 shadow-xs"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0b111d] text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
              <GraduationCap className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 text-[#ea580c] border border-orange-200 text-xs font-semibold">
                  <Sparkles className="w-3 h-3 text-[#ea580c]" />
                  <span>Student Readiness Portal</span>
                </span>
                {collegeName && (
                  <span className="text-xs text-[#64748b] font-medium flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#94a3b8]" />
                    {collegeName}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b111d] tracking-tight">
                Welcome back, {displayName}
              </h1>
              <p className="text-xs sm:text-sm text-[#64748b] mt-0.5">
                {departmentName || 'Computer Science'} • {academicYear || '4th Year'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e2e8f0] bg-white text-xs font-semibold text-[#64748b] hover:text-rose-600 hover:bg-rose-50 transition shadow-xs cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* In-Progress Assessment Alert Banner */}
      {inProgressAuditId && !hasCompletedAudit && onResumeAudit && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-5 rounded-xl bg-orange-50/60 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#ea580c] text-white flex items-center justify-center shrink-0 shadow-xs">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0b111d]">In-Progress CareerVoice Assessment</h4>
              <p className="text-xs text-[#64748b] mt-0.5">
                You have an active diagnostic assessment session saved. Resume where you left off.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onResumeAudit}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#ea580c] text-white text-xs font-bold hover:bg-[#c2410c] transition shadow-xs cursor-pointer shrink-0 active:scale-[0.98]"
          >
            <span>Resume Assessment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* Main Readiness Hero Card */}
      {hasCompletedAudit ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-xl border border-[#e2e8f0] p-6 sm:p-8 shadow-xs relative overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2 space-y-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Assessment Completed</span>
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0b111d] tracking-tight">
                  {targetRole?.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#64748b] mt-1">
                  Your demonstrated competencies and evidence have been benchmarked against industry standards.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap pt-2">
                <button
                  type="button"
                  onClick={onViewReadinessReport}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ea580c] text-white text-xs font-bold hover:bg-[#c2410c] transition shadow-xs cursor-pointer active:scale-[0.98]"
                >
                  <FileText className="w-4 h-4" />
                  <span>CareerVoice Report</span>
                </button>

                <button
                  type="button"
                  onClick={onViewGapReport}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#334155] border border-[#e2e8f0] text-xs font-bold hover:bg-[#f8fafc] hover:border-slate-300 transition shadow-xs cursor-pointer"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Skill Gaps ({auditResult?.gaps?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={onViewRoadmap}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition shadow-xs cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Career Signals</span>
                </button>

                <button
                  type="button"
                  onClick={onStartNewAudit}
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#64748b] hover:text-[#0b111d] transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>New Assessment</span>
                </button>
              </div>
            </div>

            {/* Score Radial Card */}
            <div className="flex flex-col items-center justify-center p-6 bg-[#f8fafc] rounded-xl border border-[#e2e8f0]">
              <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider mb-2">
                Readiness Score
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-mono font-extrabold text-[#0b111d]">
                  {score}
                </span>
                <span className="text-base font-bold text-[#94a3b8]">/100</span>
              </div>
              <span
                className={`mt-2 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  score >= 75
                    ? 'bg-emerald-100 text-emerald-800'
                    : score >= 55
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {score >= 75 ? 'Placement Ready' : score >= 55 ? 'Moderate Readiness' : 'Foundation Needed'}
              </span>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Empty / Not Audited Hero */
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-xl border border-[#e2e8f0] p-6 sm:p-10 shadow-xs text-center relative overflow-hidden"
        >
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-xl bg-[#0b111d] text-white flex items-center justify-center mx-auto shadow-xs">
              <Mic className="w-7 h-7 text-orange-400" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0b111d] tracking-tight">
              Understand Your Career Direction & Readiness
            </h2>

            <p className="text-xs sm:text-sm text-[#64748b] leading-relaxed max-w-xl mx-auto">
              Have an interactive voice conversation with CareerVoice AI. Explore role recommendations, demonstrate your skills through evidence, and uncover your exact readiness signals.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={onStartNewAudit}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#ea580c] text-white font-bold text-sm hover:bg-[#c2410c] active:scale-[0.98] transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start CareerVoice Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Feature Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="p-5 rounded-xl bg-white border border-[#e2e8f0] shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#ea580c] flex items-center justify-center">
            <Mic className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#0b111d]">Adaptive Voice Interview</h3>
          <p className="text-xs text-[#64748b] leading-relaxed">
            CareerVoice AI probes your technical thinking dynamically with speech dialogue and real-time reasoning.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#e2e8f0] shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#0b111d]">Evidence-Backed Scoring</h3>
          <p className="text-xs text-[#64748b] leading-relaxed">
            Claims are verified against concrete GitHub code snippets and practical architecture explanations.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#e2e8f0] shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1f3861] flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-[#0b111d]">Career Signals Report</h3>
          <p className="text-xs text-[#64748b] leading-relaxed">
            Uncover your strengths, benchmark distance, and specific evidence gaps for target engineering roles.
          </p>
        </div>
      </div>
    </div>
  );
};
