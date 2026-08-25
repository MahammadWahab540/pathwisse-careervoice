import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Zap, Shield, Award, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

interface PricingPlan {
  id: string;
  planName: string;
  priceInr: number;
  originalPriceInr?: number;
  badge?: string;
  highlight: string;
  features: string[];
  ctaText: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  trackEvent,
}) => {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/pricing')
      .then((res) => res.json())
      .then((data: PricingPlan[]) => {
        setPlans(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Notice: Loading default pricing plan:', err);
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPlan = plans[0] || {
    id: 'pathwisse_pro',
    planName: 'Pathwisse Pro Accelerator',
    priceInr: 1499,
    originalPriceInr: 4999,
    badge: 'Audit Scholar Grant',
    highlight: 'Turn your diagnostic scores into proven production code and verified credentials.',
    features: [
      '6-Week Guided Milestone Curriculum & Code Labs',
      '1-on-1 Qalam career audit deep dive',
      'Live Resume & System Design Reviews with Senior Engineers',
      'Direct Referral Pipeline to Top Tech Companies',
      '24/7 Dedicated WhatsApp Mentor Support',
    ],
    ctaText: 'Unlock Pro',
  };

  const handleUpgradeClick = () => {
    trackEvent('upgrade_clicked', { plan: currentPlan.planName, price: currentPlan.priceInr });
    alert(`Thank you! ${currentPlan.planName} registration confirmed. A career mentor will contact you via WhatsApp.`);
    onClose();
  };

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
          <span>{currentPlan.planName}</span>
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#0b111e]">Close your readiness gaps</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
            {currentPlan.highlight}
          </p>
        </div>

        <div className="space-y-2 py-1">
          {currentPlan.features.map((feat) => (
            <div key={feat} className="flex items-start gap-2.5 text-xs text-[#0b111e] font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block font-mono font-bold">
              {currentPlan.badge || 'Audit Scholar Grant'}
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-black text-[#0b111e]">₹{currentPlan.priceInr.toLocaleString('en-IN')}</span>
              {currentPlan.originalPriceInr && (
                <span className="text-[10px] text-slate-400 line-through font-medium">
                  ₹{currentPlan.originalPriceInr.toLocaleString('en-IN')}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpgradeClick}
            className="py-2.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
          >
            <span>{currentPlan.ctaText || 'Unlock Pro'}</span>
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
