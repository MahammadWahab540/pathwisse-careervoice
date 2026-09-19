import React, { useEffect } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { ArrowRight, ShieldCheck, Compass, BarChart3, Radio, CheckCircle2 } from 'lucide-react';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { PATHWISSE_LOGO_URL } from '../ui/PathwisseUI';

interface LandingViewProps {
  onStart: () => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onStart, trackEvent }) => {
  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  const subtitleText =
    "I am Qalam. I will help you choose a direction, check what you can prove, and show the next action to improve your readiness.";

  useEffect(() => {
    trackEvent('audit_landing_viewed');
    return () => {
      stopSpeaking();
    };
  }, [trackEvent]);

  const handleStartAudit = () => {
    trackEvent('audit_started');
    onStart();
  };

  return (
    <div className="flex min-h-[720px] flex-col items-center justify-between px-6 py-7 text-center selection:bg-[#ea580c] selection:text-white">
      <div className="w-full space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
          <img src={PATHWISSE_LOGO_URL} alt="Pathwisse" className="h-8 w-8 object-contain" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-[#0b111d] text-balance">
            Know your direction before you start preparing.
          </h1>
          <p className="mx-auto max-w-[34ch] text-xs sm:text-sm font-medium leading-relaxed text-[#64748b]">
            Qalam turns your branch, interests, projects, and voice dialogue into a role choice, readiness report, and next action.
          </p>
        </div>
      </div>

      {/* Central Living Mascot Qalam */}
      <div className="my-2 cursor-pointer transition-transform active:scale-[0.98]" onClick={handleStartAudit}>
        <QalamCharacter
          state={isSpeaking ? 'SPEAKING' : 'WELCOME'}
          audioAmplitude={amplitude}
          subtitles={subtitleText}
          onSpeak={() => speakText(subtitleText)}
        />
      </div>

      <div className="my-2 grid w-full grid-cols-3 gap-2.5 text-left">
        <div className="rounded-xl bg-[#f8fafc] p-3 border border-[#e2e8f0]">
          <Radio className="mb-1.5 h-4 w-4 text-[#ea580c]" />
          <div>
            <div className="text-xs font-bold leading-tight text-[#0b111d]">Answer</div>
            <div className="mt-0.5 text-[10px] font-medium text-[#64748b]">Voice or type</div>
          </div>
        </div>

        <div className="rounded-xl bg-[#f8fafc] p-3 border border-[#e2e8f0]">
          <BarChart3 className="mb-1.5 h-4 w-4 text-[#ea580c]" />
          <div>
            <div className="text-xs font-bold leading-tight text-[#0b111d]">Prove</div>
            <div className="mt-0.5 text-[10px] font-medium text-[#64748b]">Evidence audit</div>
          </div>
        </div>

        <div className="rounded-xl bg-[#f8fafc] p-3 border border-[#e2e8f0]">
          <Compass className="mb-1.5 h-4 w-4 text-[#ea580c]" />
          <div>
            <div className="text-xs font-bold leading-tight text-[#0b111d]">Improve</div>
            <div className="mt-0.5 text-[10px] font-medium text-[#64748b]">Next action</div>
          </div>
        </div>
      </div>

      <div className="mt-2 w-full space-y-3">
        <button
          onClick={handleStartAudit}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ea580c] px-6 py-3 text-sm font-bold text-white shadow-xs transition-all hover:bg-[#c2410c] active:scale-[0.98] cursor-pointer"
        >
          <span>Start my CareerVoice assessment</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-[#64748b]">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Free to test. Your answers stay tied to your audit session.</span>
        </div>
        <div className="mx-auto flex max-w-[280px] items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-left text-[11px] font-semibold leading-4 text-emerald-900 border border-emerald-200">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
          <span>You will always know the current step and what to do next.</span>
        </div>
      </div>
    </div>
  );
};


