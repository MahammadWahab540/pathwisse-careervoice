import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Edit2, Check, X, Volume2, Mic } from 'lucide-react';

interface CaptionsDisplayProps {
  lastUserText?: string;
  lastQalamText?: string;
  onEditTranscript?: (newText: string) => void;
  isListening?: boolean;
  isSpeaking?: boolean;
}

export const CaptionsDisplay: React.FC<CaptionsDisplayProps> = ({
  lastUserText,
  lastQalamText,
  onEditTranscript,
  isListening,
  isSpeaking,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(lastUserText || '');
  const [visibleUserText, setVisibleUserText] = useState(lastUserText || '');

  useEffect(() => {
    setVisibleUserText('');
    if (!lastUserText) return;

    let index = 0;
    const timer = window.setInterval(() => {
      index += Math.max(1, Math.ceil(lastUserText.length / 36));
      setVisibleUserText(lastUserText.slice(0, index));
      if (index >= lastUserText.length) window.clearInterval(timer);
    }, 22);

    return () => window.clearInterval(timer);
  }, [lastUserText]);

  const handleSaveEdit = () => {
    if (editedText.trim() && onEditTranscript) {
      onEditTranscript(editedText.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-2.5">
      {/* Qalam Live Subtitle Box */}
      <AnimatePresence mode="wait">
      {lastQalamText && (
        <motion.div
          key={lastQalamText}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 text-left shadow-[0_2px_12px_rgb(0,0,0,0.02)]"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#1f3861] uppercase tracking-wider mb-1">
            <Volume2 className="w-3.5 h-3.5 animate-pulse text-[#1f3861]" />
            Qalam AI
          </div>
          <p className="text-xs sm:text-sm text-[#0b111e] font-medium leading-relaxed">
            {lastQalamText}
          </p>
        </motion.div>
      )}
      </AnimatePresence>

      {/* User Live Transcript Box with Edit Option */}
      <AnimatePresence mode="wait">
      {lastUserText && (
        <motion.div
          key={lastUserText}
          initial={{ opacity: 0, x: 16, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="p-4 rounded-3xl bg-blue-50/60 border border-blue-200/70 text-left shadow-[0_2px_12px_rgb(0,0,0,0.02)] relative group"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-[#1f3861] uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-[#1f3861]" />
              Your Response
            </span>
            {!isEditing && onEditTranscript && (
              <button
                onClick={() => {
                  setEditedText(lastUserText);
                  setIsEditing(true);
                }}
                className="text-[10px] text-[#1f3861] hover:text-[#182c4d] flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-blue-200 font-bold transition shadow-2xs cursor-pointer"
              >
                <Edit2 className="w-2.5 h-2.5" />
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2 mt-1.5">
              <input
                type="text"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                className="w-full bg-white border border-[#1f3861] rounded-xl px-3 py-2 text-xs text-[#0b111e] font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3 inline mr-1" /> Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3.5 py-1 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-[10px] text-white flex items-center gap-1 font-bold shadow-2xs cursor-pointer"
                >
                  <Check className="w-3 h-3" /> Save & Continue
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-[#0b111e] leading-relaxed font-medium">
               "{visibleUserText}"
            </p>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

