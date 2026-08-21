import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import type { AdaptiveEvidenceSubmission, QalamToolCall } from '../../ai/qalamTools';
import { CompetencyBenchmarkCard } from './CompetencyBenchmarkCard';
import { EvidenceUploadRequestCard } from './EvidenceUploadRequestCard';
import { GapAnalysisCard } from './GapAnalysisCard';
import { ReadinessScoreCard } from './ReadinessScoreCard';
import { RoadmapCard } from './RoadmapCard';
import { SkillRadarCard } from './SkillRadarCard';

interface AdaptiveToolSurfaceProps {
  calls: QalamToolCall[];
  onDismiss?: (callId: string) => void;
  onSubmitEvidence?: (submission: AdaptiveEvidenceSubmission) => void;
}

function renderTool(call: QalamToolCall, onSubmitEvidence?: (submission: AdaptiveEvidenceSubmission) => void) {
  switch (call.name) {
    case 'render_skill_radar':
      return <SkillRadarCard data={call.args} />;
    case 'show_gap_analysis':
      return <GapAnalysisCard data={call.args} />;
    case 'generate_roadmap':
      return <RoadmapCard data={call.args} />;
    case 'update_readiness_score':
      return <ReadinessScoreCard data={call.args} />;
    case 'show_competency_benchmark':
      return <CompetencyBenchmarkCard data={call.args} />;
    case 'request_evidence_upload':
      return <EvidenceUploadRequestCard data={call.args} onSubmit={onSubmitEvidence} />;
  }
}

const titleByTool: Record<QalamToolCall['name'], string> = {
  render_skill_radar: 'Skill radar',
  show_gap_analysis: 'Gap analysis',
  generate_roadmap: 'Career roadmap',
  update_readiness_score: 'Readiness score',
  show_competency_benchmark: 'Role benchmark',
  request_evidence_upload: 'Evidence request',
};

export const AdaptiveToolSurface: React.FC<AdaptiveToolSurfaceProps> = ({ calls, onDismiss, onSubmitEvidence }) => {
  const [activeIndex, setActiveIndex] = useState(Math.max(0, calls.length - 1));

  useEffect(() => {
    setActiveIndex(Math.max(0, calls.length - 1));
  }, [calls.length, calls[calls.length - 1]?.id]);

  const activeCall = calls[activeIndex];
  const positionLabel = useMemo(() => calls.length > 1 ? `${activeIndex + 1}/${calls.length}` : '', [activeIndex, calls.length]);

  if (!activeCall) return null;

  const move = (direction: -1 | 1) => {
    setActiveIndex((current) => Math.min(calls.length - 1, Math.max(0, current + direction)));
  };

  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 z-30 flex justify-center">
      <AnimatePresence mode="wait">
        <motion.section
          key={activeCall.id}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="pointer-events-auto w-full max-w-[370px] overflow-hidden rounded-[24px] border border-slate-200 bg-white/98 shadow-[0_24px_80px_rgba(15,23,42,0.24)] backdrop-blur-xl"
          aria-live="polite"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#1f3861] text-white"><Sparkles className="h-3.5 w-3.5" /></span>
              <div className="min-w-0 text-left">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Qalam adaptive view</p>
                <p className="truncate text-xs font-black text-[#0b111e]">{titleByTool[activeCall.name]}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {calls.length > 1 && (
                <>
                  <button type="button" onClick={() => move(-1)} disabled={activeIndex === 0} className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-25" aria-label="Previous adaptive view"><ChevronLeft className="h-3.5 w-3.5" /></button>
                  <span className="min-w-7 text-center text-[9px] font-black tabular-nums text-slate-400">{positionLabel}</span>
                  <button type="button" onClick={() => move(1)} disabled={activeIndex === calls.length - 1} className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-25" aria-label="Next adaptive view"><ChevronRight className="h-3.5 w-3.5" /></button>
                </>
              )}
              <button type="button" onClick={() => onDismiss?.(activeCall.id)} className="ml-0.5 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close adaptive view"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="max-h-[430px] overflow-y-auto px-4 py-4">
            {renderTool(activeCall, onSubmitEvidence)}
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
};
