import React from 'react';
import { X, CheckCircle2, Zap, Shield, Award, Sparkles, ArrowRight } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  trackEvent,
}) => {
  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    trackEvent('upgrade_clicked', { plan: 'Pathwisse Pro' });
    alert('Thank you! Pathwisse Pro registration confirmed. A career mentor will contact you via WhatsApp.');
    onClose();
  };

  const PRO_FEATURES = [
    '6-Week Guided Milestone Curriculum & Code Labs',
    '1-on-1 Qalam AI Career Audit Deep Dive',
    'Live Resume & System Design Reviews with Senior Engineers',
    'Direct Referral Pipeline to Top Tech Companies',
    '24/7 Dedicated WhatsApp Mentor Support',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200/80 rounded-3xl max-w-sm w-full p-6 space-y-4 text-left shadow-[0_20px_50px_rgb(0,0,0,0.15)] relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2 rounded-full bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-[11px] font-bold text-[#1f3861]">
          <Zap className="w-3.5 h-3.5 text-[#1f3861] fill-[#1f3861]" />
          <span>Pathwisse Pro Accelerator</span>
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#0b111e]">Systematically Close Your Gaps</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
            Turn your diagnostic scores into proven production code and verified resume credentials.
          </p>
        </div>

        <div className="space-y-2 py-1">
          {PRO_FEATURES.map((feat) => (
            <div key={feat} className="flex items-start gap-2.5 text-xs text-[#0b111e] font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block font-mono font-bold">Audit Scholar Grant</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-[#0b111e]">₹1,499</span>
              <span className="text-[10px] text-slate-400 line-through font-medium">₹4,999</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpgradeClick}
            className="py-2.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
          >
            <span>Unlock Pro</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        <p className="text-[10px] text-slate-400 text-center font-medium">
          Guaranteed placement support & full satisfaction guarantee
        </p>
      </div>
    </div>
  );
};

