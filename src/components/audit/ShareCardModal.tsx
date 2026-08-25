import React, { useState } from 'react';
import { CareerAuditResult, CareerRoleTarget } from '../../types';
import { X, Share2, Copy, Check, MessageSquare, Linkedin, Sparkles } from 'lucide-react';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CareerAuditResult;
  role: CareerRoleTarget;
  trackEvent: (eventName: string, metadata?: any) => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  isOpen,
  onClose,
  result,
  role,
  trackEvent,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareText = `I just checked my career readiness for ${role.title} with Pathwisse Qalam. Score: ${result.overallScore}/100. Start your personalized career gap audit here: ${window.location.origin}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    trackEvent('share_link_copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    trackEvent('shared_via_whatsapp');
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleLinkedInShare = () => {
    trackEvent('shared_via_linkedin');
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        window.location.href
      )}`,
      '_blank'
    );
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

        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#1f3861]" />
          <h3 className="text-sm font-bold text-[#0b111e]">Share Your Career Card</h3>
        </div>

        {/* Visual Shareable Card Preview */}
        <div className="p-5 rounded-2xl bg-[#1f3861] text-white border border-[#1f3861] space-y-3 relative overflow-hidden shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-300 font-bold tracking-wider">
              PATHWISSE CAREER AUDIT
            </span>
            <span className="text-[10px] text-blue-200 font-medium">Verified by Qalam</span>
          </div>

          <div>
            <span className="text-[11px] text-slate-300">Target Role:</span>
            <h4 className="text-sm font-bold text-white mt-0.5">{role.title}</h4>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white">
              {result.overallScore}
            </span>
            <span className="text-xs text-blue-200 font-medium">/ 100 Overall Readiness</span>
          </div>

          <div className="pt-2.5 border-t border-white/20 text-[10px] text-slate-200 leading-relaxed font-medium">
            "{result.diagnosisSummary.substring(0, 90)}..."
          </div>
        </div>

        {/* Sharing Options */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="w-full py-3 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Share on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleLinkedInShare}
            className="w-full py-3 px-4 rounded-full bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Linkedin className="w-4 h-4" />
            <span>Share on LinkedIn</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-3 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98]"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#1f3861]" />}
            <span>{copied ? 'Link Copied!' : 'Copy Shareable Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
