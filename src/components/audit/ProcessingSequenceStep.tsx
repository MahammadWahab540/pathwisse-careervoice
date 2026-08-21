import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { Check, Loader2 } from 'lucide-react';

interface ProcessingSequenceStepProps {
  onFinished: () => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

const STEPS = [
  'Understanding your career goal',
  'Checking your existing skills & answers',
  'Reviewing project evidence & links',
  'Mapping critical skill gaps',
  'Comparing against benchmark role requirements',
  'Building your personalised 6-week Pathwisse path',
];

export const ProcessingSequenceStep: React.FC<ProcessingSequenceStepProps> = ({
  onFinished,
  trackEvent,
}) => {
  const [completedIndex, setCompletedIndex] = useState(0);

  useEffect(() => {
    trackEvent('audit_processing_started');

    const interval = setInterval(() => {
      setCompletedIndex((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            onFinished();
          }, 800);
          return prev;
        }
      });
    }, 900);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-6 max-w-md mx-auto text-center">
      {/* Qalam in Thinking State */}
      <QalamCharacter
        state="THINKING"
        subtitles="Give me just a moment. I'm connecting your career signals..."
      />

      {/* Animated Checklist Card */}
      <div className="w-full bg-white border border-[#e1e7ef] rounded-2xl p-5 my-4 shadow-sm text-left space-y-3">
        <h3 className="text-xs font-bold text-[#1f3861] uppercase tracking-wider mb-2">
          Diagnostic Sequence in Progress
        </h3>

        <div className="space-y-2.5">
          {STEPS.map((stepText, idx) => {
            const isDone = idx < completedIndex;
            const isCurrent = idx === completedIndex;

            return (
              <motion.div
                key={stepText}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                  isDone
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : isCurrent
                    ? 'bg-[#e1e7ef]/60 border-[#1f3861] text-[#1f3861]'
                    : 'bg-[#f8fafc] border-[#e1e7ef] text-[#344256]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-[#1f3861] text-white animate-pulse'
                      : 'bg-[#e1e7ef] text-[#344256]'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className="text-xs font-semibold">{stepText}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-slate-500">
        Pathwisse Knowledge Graph matching algorithms running
      </p>
    </div>
  );
};
