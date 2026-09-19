import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CareerRoleTarget, RoadmapWeek, CareerAuditResult } from '../../types';
import {
  RotateCcw,
  CheckCircle2,
  Link,
  FileCode,
  X,
  LockKeyhole,
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
  roadmap,
}) => {
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [newProjectUrl, setNewProjectUrl] = useState('');
  const [newEvidenceNote, setNewEvidenceNote] = useState('');

  if (!isOpen) return null;

  const toggleTopic = (topicName: string) => {
    setCompletedTopics((prev) =>
      prev.includes(topicName) ? prev.filter((t) => t !== topicName) : [...prev, topicName]
    );
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

        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          Re-audit is temporarily unavailable. Start a new career audit to generate a score from newly persisted evidence.
        </div>

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
            disabled
            className="w-full py-3.5 px-4 rounded-full bg-slate-300 text-slate-600 font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <LockKeyhole className="w-4 h-4" />
            <span>Start a new audit to refresh your score</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
