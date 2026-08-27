import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { Check, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface ProcessingSequenceStepProps {
  onFinished: () => void;
  trackEvent: (eventName: string, metadata?: any) => void;
  error?: string | null;
  onRetry?: () => void;
  isEvaluating?: boolean;
}

const STEPS = [
  'Understanding your career goal',
  'Checking your existing skills & answers',
  'Reviewing project evidence & links',
  'Mapping critical skill gaps',
  'Comparing against benchmark role requirements',
  'Packaging verified signals & diagnostic assessment',
];

export const ProcessingSequenceStep: React.FC<ProcessingSequenceStepProps> = ({
  onFinished,
  trackEvent,
  error,
  onRetry,
  isEvaluating = true,
}) => {
  const [completedIndex, setCompletedIndex] = useState(0);

  useEffect(() => {
    trackEvent('audit_processing_started');

    if (error) return;

    const interval = setInterval(() => {
      setCompletedIndex((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          return prev;
        }
      });
    }, 250);

    return () => clearInterval(interval);
  }, [error]);

  useEffect(() => {
    if (!error && !isEvaluating && completedIndex >= STEPS.length - 1) {
      const timer = setTimeout(() => {
        onFinished();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [error, isEvaluating, completedIndex, onFinished]);

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-6 max-w-md mx-auto text-center">
      {/* Qalam Mascot */}
      <QalamCharacter
        state={error ? 'SURPRISED' : 'THINKING'}
        subtitles={
          error
            ? 'I encountered an issue computing verified scores from the evaluation engine.'
            : "Give me just a moment. I'm connecting your career signals with our diagnostic benchmarks..."
        }
      />

      {/* Error state if evaluation failed */}
      {error ? (
        <div className="w-full bg-red-50 border border-red-200 rounded-2xl p-5 my-4 text-left space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>We could not finish your report</span>
          </div>

          <p className="text-xs text-red-700 leading-relaxed font-medium">
            {error}
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={onRetry}
              className="w-full py-2.5 px-4 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Career Evaluation</span>
            </button>
          </div>
        </div>
      ) : (
        /* Animated Checklist Card */
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
      )}

      <p className="text-[10px] text-slate-500">
        Your report is built from your answers and selected role benchmark.
      </p>
    </div>
  );
};
