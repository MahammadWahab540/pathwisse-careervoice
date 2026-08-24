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
    <div className="flex min-h-[760px] flex-col items-center justify-between px-6 py-7 text-center selection:bg-[#1f3861] selection:text-white">
      <div className="w-full space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-3xl border border-[#e1e7ef] bg-white shadow-[rgba(15,23,41,0.12)_0px_18px_30px_-18px]">
          <img src={PATHWISSE_LOGO_URL} alt="Pathwisse" className="h-10 w-10 object-contain" />
        </div>

        <div className="space-y-3">
          <h1 className="text-[32px] font-extrabold leading-[1.04] tracking-[-0.04em] text-[#0b111e] text-balance">
            Know your direction before you start preparing.
          </h1>
          <p className="mx-auto max-w-[32ch] text-sm font-medium leading-6 text-[#344256]">
            Qalam turns your branch, interests, projects, and answers into a role choice, readiness report, and next action.
          </p>
        </div>
      </div>

      {/* Central Living Mascot Qalam */}
      <div className="my-3 cursor-pointer transition-[transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]" onClick={handleStartAudit}>
        <QalamCharacter
          state={isSpeaking ? 'SPEAKING' : 'WELCOME'}
          audioAmplitude={amplitude}
          subtitles={subtitleText}
          onSpeak={() => speakText(subtitleText)}
        />
      </div>

      <div className="my-2 grid w-full grid-cols-3 gap-2 text-left">
        <div className="rounded-3xl bg-[#f8fafc] p-3 ring-1 ring-[#e1e7ef]">
          <Radio className="mb-2 h-4 w-4 text-[#1f3861]" />
          <div>
            <div className="text-[11px] font-bold leading-tight text-[#0b111e]">Answer</div>
            <div className="mt-0.5 text-[9px] font-medium text-[#344256]">Voice or type</div>
          </div>
        </div>

        <div className="rounded-3xl bg-[#f8fafc] p-3 ring-1 ring-[#e1e7ef]">
          <BarChart3 className="mb-2 h-4 w-4 text-[#1f3861]" />
          <div>
            <div className="text-[11px] font-bold leading-tight text-[#0b111e]">Prove</div>
            <div className="mt-0.5 text-[9px] font-medium text-[#344256]">Evidence audit</div>
          </div>
        </div>

        <div className="rounded-3xl bg-[#f8fafc] p-3 ring-1 ring-[#e1e7ef]">
          <Compass className="mb-2 h-4 w-4 text-[#1f3861]" />
          <div>
            <div className="text-[11px] font-bold leading-tight text-[#0b111e]">Improve</div>
            <div className="mt-0.5 text-[9px] font-medium text-[#344256]">Next action</div>
          </div>
        </div>
      </div>

      <div className="mt-2 w-full space-y-3">
        <button
          onClick={handleStartAudit}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1f3861] px-6 py-3.5 text-sm font-bold text-white shadow-[rgba(15,23,41,0.12)_0px_25px_30px_-5px] transition-[background,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#0b111e] active:scale-[0.98]"
        >
          <span>Start my CareerVoice audit</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-[#344256]">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Free to test. Your answers stay tied to your audit.</span>
        </div>
        <div className="mx-auto flex max-w-[270px] items-start gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-left text-[11px] font-semibold leading-4 text-emerald-900 ring-1 ring-emerald-200">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
          <span>You will always know the current step and what to do next.</span>
        </div>
      </div>
    </div>
  );
};


