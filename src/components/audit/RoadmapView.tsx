import React, { useState, useEffect } from 'react';
import { RoadmapWeek, CareerRoleTarget } from '../../types';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { Calendar, Clock, CheckCircle2, ChevronDown, ChevronUp, Share2, Rocket, PlayCircle, Lock, BookOpen, RotateCcw } from 'lucide-react';

interface RoadmapViewProps {
  roadmap: RoadmapWeek[];
  role: CareerRoleTarget;
  onOpenShare: () => void;
  onOpenUpgrade: () => void;
  onOpenReAudit?: () => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  roadmap,
  role,
  onOpenShare,
  onOpenUpgrade,
  onOpenReAudit,
  trackEvent,
}) => {
  const [expandedWeek, setExpandedWeek] = useState<number>(1);

  useEffect(() => {
    trackEvent('roadmap_preview_viewed', { role: role.id });
  }, [role, trackEvent]);

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white space-y-4">
      {/* Qalam Mascot */}
      <QalamCharacter
        state="CELEBRATING"
        subtitles="Here is your personalized 6-week Pathwisse action plan. Following this step-by-step will systematically eliminate your career gaps."
      />

      {/* Main Roadmap Box */}
      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#1f3861] font-bold">
              Custom Learning Path
            </span>
            <h2 className="text-base font-bold text-[#0b111e] mt-0.5">6-Week Milestone Plan</h2>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1f3861] flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        {/* Weeks Accordion */}
        <div className="space-y-2.5">
          {roadmap.map((week) => {
            const isExpanded = expandedWeek === week.weekNumber;

            return (
              <div
                key={week.weekNumber}
                className={`rounded-2xl border transition overflow-hidden ${
                  isExpanded
                    ? 'bg-white border-[#1f3861] shadow-xs'
                    : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Header */}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedWeek(isExpanded ? 0 : week.weekNumber);
                    trackEvent('roadmap_week_toggled', { weekNumber: week.weekNumber });
                  }}
                  className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-7 h-7 rounded-xl text-xs font-mono font-bold flex items-center justify-center transition ${
                        isExpanded
                          ? 'bg-[#1f3861] text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      W{week.weekNumber}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-[#0b111e]">{week.title}</h4>
                      <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-[#1f3861]" />
                          {week.estimatedHours}h / week
                        </span>
                        <span>•</span>
                        <span className="text-[#1f3861] font-bold">{week.focusArea}</span>
                      </p>
                    </div>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-3.5 pt-0 border-t border-slate-100 space-y-3 mt-1">
                    <div className="space-y-2">
                      {week.topics.map((t, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0b111e]">{t.name}</span>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-[#1f3861] font-bold">
                              {t.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                            {t.description}
                          </p>
                          <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 pt-1 border-t border-slate-200/50">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Proof of Work: {t.learningOutcome}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={onOpenUpgrade}
                      className="w-full py-2.5 px-3 rounded-full bg-blue-50 border border-blue-200/80 text-[#1f3861] hover:bg-blue-100/80 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
                    >
                      <PlayCircle className="w-3.5 h-3.5 text-[#1f3861]" />
                      <span>Start Week {week.weekNumber} Modules & Mentor Lab</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTAs Row */}
        <div className="space-y-2 pt-2">
          {onOpenReAudit && (
            <button
              type="button"
              onClick={onOpenReAudit}
              className="w-full py-3.5 px-4 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-emerald-200" />
              <span>Re-Audit Readiness After Progress</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenUpgrade}
            className="w-full py-3 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
          >
            <Rocket className="w-4 h-4 text-white" />
            <span>Join Pathwisse Pro Accelerator</span>
          </button>

          <button
            type="button"
            onClick={onOpenShare}
            className="w-full py-2.5 px-4 rounded-full bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-[#1f3861]" />
            <span>Share My Verified Career Card</span>
          </button>
        </div>
      </div>
    </div>
  );
};

