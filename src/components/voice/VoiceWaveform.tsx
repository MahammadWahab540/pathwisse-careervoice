import React from 'react';
import { motion } from 'framer-motion';

interface VoiceWaveformProps {
  amplitude: number; // 0.0 to 1.0
  isListening: boolean;
  isSpeaking: boolean;
  className?: string;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  amplitude,
  isListening,
  isSpeaking,
  className = '',
}) => {
  const bars = [0.25, 0.5, 0.85, 1.0, 0.75, 0.9, 0.45, 0.8, 0.6, 0.3];

  return (
    <div className={`flex items-center justify-center gap-1.5 h-10 px-4 ${className}`}>
      {bars.map((baseHeight, i) => {
        const hMultiplier = isListening || isSpeaking ? 0.35 + amplitude * 1.5 : 0.15;
        const barH = Math.min(36, Math.max(5, baseHeight * 32 * hMultiplier));

        return (
          <motion.div
            key={i}
            animate={{
              height: barH,
              backgroundColor: isListening
                ? '#e11d48' // Apple Rose Red when user listening
                : isSpeaking
                ? '#1f3861' // Deep Navy when Qalam speaking
                : '#cbd5e1',
            }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
            className="w-1 rounded-full transition-colors duration-200"
          />
        );
      })}
    </div>
  );
};

