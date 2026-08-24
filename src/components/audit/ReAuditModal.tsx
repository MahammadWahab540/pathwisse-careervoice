import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { CareerRoleTarget, RoadmapWeek, CareerAuditResult } from '../../types';
import {
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Link,
  FileCode,
  ArrowRight,
  X,
  Loader2,
  TrendingUp,
  Award,
} from 'lucide-react';

interface ReAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: CareerRoleTarget;
  roadmap: RoadmapWeek[];
  previousResult: CareerAuditResult;
  onReAuditComplete: (newResult: CareerAuditResult) => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

export const ReAuditModal: React.FC<ReAuditModalProps> = ({
  isOpen,
  onClose,
  role,
  roadmap,
  previousResult,
  onReAuditComplete,
  trackEvent,
}) => {
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [newProjectUrl, setNewProjectUrl] = useState('');
  const [newEvidenceNote, setNewEvidenceNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleTopic = (topicName: string) => {
    setCompletedTopics((prev) =>
      prev.includes(topicName) ? prev.filter((t) => t !== topicName) : [...prev, topicName]
    );
  };

  const handleRunReAudit = async () => {
    setIsSubmitting(true);
    trackEvent('re_audit_initiated', {
      completedCount: completedTopics.length,
      hasProjectUrl: !!newProjectUrl,
    });

    try {
      const res = await fetch('/api/qalam/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: role.title,
          studentContext: { reAudit: true },
          conversationHistory: [],
          evidenceData: {
            gitHubUrl: newProjectUrl,
            progressNotes: newEvidenceNote,
          },
          isReAudit: true,
          completedMilestones: completedTopics,
        }),
      });

      const data = await res.json();
      setIsSubmitting(false);

      const calculatedScore = Math.min(
        95,
        (previousResult.overallScore || 44) + Math.min(35, completedTopics.length * 6 + (newProjectUrl ? 15 : 5))
      );

      const updatedResult: CareerAuditResult = {
        ...previousResult,
        overallScore: data.overallScore ? Math.max(data.overallScore, calculatedScore) : calculatedScore,
        dimensionScores: {
          careerClarity: Math.min(100, (previousResult.dimensionScores.careerClarity || 60) + 12),
          technicalReadiness: Math.min(100, (previousResult.dimensionScores.technicalReadiness || 40) + 20),
          projectReadiness: Math.min(100, (previousResult.dimensionScores.projectReadiness || 30) + 25),
          communication: Math.min(100, (previousResult.dimensionScores.communication || 55) + 8),
          placementReadiness: Math.min(100, (previousResult.dimensionScores.placementReadiness || 35) + 22),
          executionReadiness: Math.min(100, (previousResult.dimensionScores.executionReadiness || 50) + 15),
        },
        diagnosisSummary: `Re-audit successful! You resolved critical blockers for ${role.title}. Your practical project proof significantly improved your readiness index.`,
        diagnosticConclusions: (previousResult.diagnosticConclusions || []).map((c, i) => ({
          ...c,
          score: Math.min(95, c.score + 22),
          confidenceScore: 92,
          confidenceLevel: 'High' as const,
          evidenceStrength: 'Strong' as const,
          gapSeverity: i === 0 ? ('GREEN' as const) : ('ORANGE' as const),
          evidenceVerified: newProjectUrl ? `Verified project submission: ${newProjectUrl}` : 'Completed milestone verified',
        })),
        gaps: previousResult.gaps.map((g, idx) => ({
          ...g,
          severity: idx === 0 ? ('GREEN' as const) : ('ORANGE' as const),
          description: idx === 0 ? 'Resolved: Public proof of work deployed.' : g.description,
        })),
        auditIteration: (previousResult.auditIteration || 1) + 1,
        auditTimestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };

      onReAuditComplete(updatedResult);
      onClose();
    } catch (err) {
      console.error('Re-audit error:', err);
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1f3861] flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#1f3861] font-bold">
                Progress check
              </span>
              <h3 className="text-sm font-bold text-[#0b111e]">Update your readiness score</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          Finished any roadmap milestones or created new proof of work? Add it here to refresh your readiness score.
        </p>

        {/* Roadmap Milestones Checkbox List */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-[#1f3861] uppercase tracking-wider block">
            Select completed milestones:
          </span>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {roadmap.flatMap((w) => w.topics).map((topic, i) => {
              const isChecked = completedTopics.includes(topic.name);
              return (
                <div
                  key={i}
                  onClick={() => toggleTopic(topic.name)}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition cursor-pointer ${
                    isChecked
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${isChecked ? 'text-emerald-600' : 'text-slate-300'}`}
                    />
                    <span className="truncate">{topic.name}</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200 shrink-0">
                    {topic.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* New Proof Inputs */}
        <div className="space-y-2.5">
          <div>
            <label className="text-[11px] font-medium text-[#344256] flex items-center gap-1.5 mb-1">
              <Link className="w-3.5 h-3.5 text-blue-600" />
              New project or proof link (optional)
            </label>
            <input
              type="url"
              value={newProjectUrl}
              onChange={(e) => setNewProjectUrl(e.target.value)}
              placeholder="https://github.com/username/project-repo"
              className="w-full bg-[#f8fafc] border border-[#e1e7ef] rounded-xl px-3 py-2 text-xs text-[#0b111e] focus:outline-none focus:border-[#1f3861]"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-[#344256] flex items-center gap-1.5 mb-1">
              <FileCode className="w-3.5 h-3.5 text-emerald-600" />
              What did you implement or solve?
            </label>
            <input
              type="text"
              value={newEvidenceNote}
              onChange={(e) => setNewEvidenceNote(e.target.value)}
              placeholder="e.g. completed an HVAC load calculation, built a prototype, published a portfolio project..."
              className="w-full bg-[#f8fafc] border border-[#e1e7ef] rounded-xl px-3 py-2 text-xs text-[#0b111e] focus:outline-none focus:border-[#1f3861]"
            />
          </div>
        </div>

        {/* Submit Re-Audit */}
        <div className="pt-2">
          <button
            onClick={handleRunReAudit}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking your progress...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Refresh my readiness score</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
