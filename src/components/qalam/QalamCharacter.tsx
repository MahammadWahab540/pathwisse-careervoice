import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QalamState } from '../../types';
import { Volume2 } from 'lucide-react';

interface QalamCharacterProps {
  state: QalamState;
  audioAmplitude?: number; // 0.0 to 1.0 (from Web Audio Analyser)
  subtitles?: string;
  className?: string;
  onClick?: () => void;
  onSpeak?: () => void;
}

export const QalamCharacter: React.FC<QalamCharacterProps> = ({
  state = 'IDLE',
  audioAmplitude = 0,
  subtitles,
  className = '',
  onClick,
  onSpeak,
}) => {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  // Mouse / Touch Pupil Tracking Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 12; // -6 to +6 px
      const y = (e.clientY / innerHeight - 0.5) * 8;  // -4 to +4 px
      setMouseOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Periodic Natural Blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 3500 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  // State-specific eye positions & poses
  const getEyeOffset = () => {
    switch (state) {
      case 'THINKING':
        return { x: 2, y: -7 }; // Looking up thoughtfully
      case 'CURIOUS':
        return { x: 4, y: -2 }; // Inquisitive side glance
      case 'LISTENING':
        return { x: 0, y: 3 };  // Attentive downward/forward focus
      default:
        return mouseOffset;
    }
  };

  const eyeOffset = getEyeOffset();

  // Pen-Tip Glow Intensity based on state & audio
  const getPenGlowRadius = () => {
    if (state === 'LISTENING' || state === 'SPEAKING') {
      return 12 + audioAmplitude * 24;
    }
    if (state === 'THINKING') return 16;
    if (state === 'CELEBRATING') return 22;
    return 8;
  };

  const penGlow = getPenGlowRadius();

  // Floating body Y animation
  const getFloatingY = () => {
    switch (state) {
      case 'WELCOME':
        return [0, -12, 0];
      case 'CELEBRATING':
        return [0, -16, -4, -12, 0];
      case 'THINKING':
        return [0, -4, 0];
      default:
        return [0, -8, 0];
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
    >
      {/* Outer Cyan / Indigo Waveform Aura (Reacts to Audio Amplitude) */}
      <div className="relative flex items-center justify-center">
        {(state === 'LISTENING' || state === 'SPEAKING') && (
          <motion.div
            className="absolute rounded-full border-2 border-cyan-400/40 bg-cyan-500/10"
            animate={{
              scale: [1, 1.1 + audioAmplitude * 0.4, 1],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              width: 280,
              height: 280,
              filter: `blur(${4 + audioAmplitude * 8}px)`,
            }}
          />
        )}

        {/* Orbiting Thinking Particles */}
        {state === 'THINKING' && (
          <div className="absolute w-64 h-64 pointer-events-none">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]"
                animate={{
                  rotate: [i * 120, i * 120 + 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{
                  top: '50%',
                  left: '50%',
                  transformOrigin: `${36 + i * 16}px 0px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Qalam Main SVG Illustration & Animation */}
        <motion.div
          animate={{
            y: getFloatingY(),
            rotate: state === 'CURIOUS' ? [0, -4, 0] : state === 'SURPRISED' ? [0, 3, -3, 0] : 0,
            scaleY: state === 'WELCOME' ? [1, 1.05, 1] : 1,
          }}
          transition={{
            duration: state === 'CELEBRATING' ? 1.2 : 2.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative w-64 h-72 sm:w-72 sm:h-80 drop-shadow-2xl cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 320 380"
            className="w-full h-full"
          >
            <defs>
              {/* Radial Gradients for Robe and Pen-Tip Glow */}
              <radialGradient id="qalamGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#818cf8" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
              </radialGradient>

              <linearGradient id="bodyRobe" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e1b4b" />
                <stop offset="50%" stopColor="#312e81" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              <linearGradient id="scarfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>

              <linearGradient id="penTipGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>

              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Glowing Aura Behind Pen Tip Ornament */}
            <circle
              cx="160"
              cy="45"
              r={24 + penGlow}
              fill="url(#qalamGlow)"
              className="transition-all duration-300"
            />

            {/* Qalam Hood / Crown / Top Pen-Tip Quill Ornament */}
            <g id="penTipQuill">
              <path
                d="M 160 15 L 175 48 L 160 42 L 145 48 Z"
                fill="url(#penTipGold)"
                filter="url(#neonGlow)"
              />
              <circle cx="160" cy="30" r="4" fill="#ffffff" />
            </g>

            {/* Main Head & Hood Structure */}
            <g id="headStructure">
              {/* Hood Outer Shadow */}
              <path
                d="M 80 120 C 80 50, 240 50, 240 120 C 240 180, 220 220, 160 220 C 100 220, 80 180, 80 120 Z"
                fill="url(#bodyRobe)"
                stroke="#4338ca"
                strokeWidth="3"
              />

              {/* Inner Hood Face Cutout */}
              <path
                d="M 98 125 C 98 70, 222 70, 222 125 C 222 170, 205 200, 160 200 C 115 200, 98 170, 98 125 Z"
                fill="#0b0f19"
              />
            </g>

            {/* Eyes & Pupils */}
            <g id="eyes">
              {/* Left Eye Base */}
              <ellipse
                cx="130"
                cy="125"
                rx="18"
                ry={isBlinking ? 2 : state === 'SURPRISED' ? 22 : 18}
                fill="#ffffff"
                className="transition-all duration-150"
              />
              {/* Left Pupil */}
              {!isBlinking && (
                <ellipse
                  cx={130 + eyeOffset.x}
                  cy={125 + eyeOffset.y}
                  rx="9"
                  ry="9"
                  fill="#0284c7"
                >
                  <animate
                    attributeName="fill"
                    values="#0284c7;#0369a1;#0284c7"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </ellipse>
              )}
              {/* Left Pupil Highlight */}
              {!isBlinking && (
                <circle cx={133 + eyeOffset.x} cy={122 + eyeOffset.y} r="3" fill="#ffffff" />
              )}

              {/* Right Eye Base */}
              <ellipse
                cx="190"
                cy="125"
                rx="18"
                ry={isBlinking ? 2 : state === 'SURPRISED' ? 22 : 18}
                fill="#ffffff"
                className="transition-all duration-150"
              />
              {/* Right Pupil */}
              {!isBlinking && (
                <ellipse
                  cx={190 + eyeOffset.x}
                  cy={125 + eyeOffset.y}
                  rx="9"
                  ry="9"
                  fill="#0284c7"
                />
              )}
              {/* Right Pupil Highlight */}
              {!isBlinking && (
                <circle cx={193 + eyeOffset.x} cy={122 + eyeOffset.y} r="3" fill="#ffffff" />
              )}
            </g>

            {/* Mouth Animation */}
            <g id="mouth">
              {state === 'SPEAKING' ? (
                <path
                  d={`M 148 162 Q 160 ${166 + audioAmplitude * 12}, 172 162`}
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                />
              ) : state === 'SURPRISED' ? (
                <circle cx="160" cy="164" r="6" fill="#38bdf8" />
              ) : state === 'CURIOUS' ? (
                <path
                  d="M 152 165 Q 160 160, 168 165"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
              ) : (
                /* Gentle Smile Default */
                <path
                  d="M 148 162 Q 160 169, 172 162"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
              )}
            </g>

            {/* Scarf / Robe Collar */}
            <g id="scarf">
              <path
                d="M 100 190 C 120 220, 200 220, 220 190 C 235 225, 210 250, 160 250 C 110 250, 85 225, 100 190 Z"
                fill="url(#scarfGrad)"
              />
            </g>

            {/* Body & Hands */}
            <g id="body">
              <path
                d="M 90 235 C 70 340, 250 340, 230 235 C 205 270, 115 270, 90 235 Z"
                fill="url(#bodyRobe)"
              />

              {/* Pathwisse Emblem on Chest */}
              <path
                d="M 160 260 L 168 275 L 160 271 L 152 275 Z"
                fill="#38bdf8"
                filter="url(#neonGlow)"
              />
            </g>
          </svg>
        </motion.div>
      </div>

      {/* State Status Badge & Interactive Speaker Control */}
      <div className="mt-2 flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono text-cyan-300 shadow-md">
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'LISTENING'
                ? 'bg-red-400 animate-ping'
                : state === 'SPEAKING'
                ? 'bg-emerald-400 animate-pulse'
                : state === 'THINKING'
                ? 'bg-amber-400 animate-bounce'
                : 'bg-cyan-400'
            }`}
          />
          {state === 'THINKING'
            ? 'Connecting the dots...'
            : state === 'LISTENING'
            ? 'Listening to you...'
            : state === 'SPEAKING'
            ? 'Qalam Speaking'
            : state === 'CURIOUS'
            ? 'Curious to know more...'
            : state === 'ENCOURAGING'
            ? 'I hear you...'
            : state === 'CELEBRATING'
            ? 'Audit Complete!'
            : 'Qalam Career Guide'}
        </span>

        {onSpeak && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSpeak();
            }}
            className={`p-1.5 rounded-full border transition cursor-pointer shadow-xs ${
              state === 'SPEAKING'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 animate-pulse'
                : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500'
            }`}
            title={state === 'SPEAKING' ? 'Qalam is speaking' : 'Listen to Qalam'}
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Subtitle / Caption Display under Qalam */}
      <AnimatePresence mode="wait">
        {subtitles && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-3 max-w-sm text-center px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm"
          >
            <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed italic">
              "{subtitles}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
