import React, { useState } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { PATHWISSE_ROLES } from '../../data/knowledgeGraph';
import { CareerRoleTarget } from '../../types';
import { Mic, Keyboard, CheckCircle2, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';

interface CareerDiscoveryStepProps {
  onConfirmRole: (role: CareerRoleTarget) => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

export const CareerDiscoveryStep: React.FC<CareerDiscoveryStepProps> = ({
  onConfirmRole,
  trackEvent,
}) => {
  const [userInputText, setUserInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CareerRoleTarget>(PATHWISSE_ROLES[0]);
  const [isConfirmedStage, setIsConfirmedStage] = useState(false);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInputText.trim()) return;

    trackEvent('career_intent_submitted', { intent: userInputText });

    // AI Intent Matcher
    const lower = userInputText.toLowerCase();
    let matched = PATHWISSE_ROLES[0]; // Default ML

    if (lower.includes('full stack') || lower.includes('web') || lower.includes('software') || lower.includes('react')) {
      matched = PATHWISSE_ROLES[1];
    } else if (lower.includes('data') || lower.includes('analyst') || lower.includes('sql') || lower.includes('bi')) {
      matched = PATHWISSE_ROLES[2];
    } else if (lower.includes('security') || lower.includes('cyber') || lower.includes('hack')) {
      matched = PATHWISSE_ROLES[3];
    } else if (lower.includes('devops') || lower.includes('cloud') || lower.includes('docker') || lower.includes('aws')) {
      matched = PATHWISSE_ROLES[4];
    }

    setSelectedRole(matched);
    setIsConfirmedStage(true);
  };

  const handleConfirm = () => {
    trackEvent('career_role_selected', { career_role: selectedRole.id, title: selectedRole.title });
    onConfirmRole(selectedRole);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-4 max-w-md mx-auto text-center">
      {/* Qalam Mascot */}
      <QalamCharacter
        state={isConfirmedStage ? 'CURIOUS' : 'WELCOME'}
        subtitles={
          isConfirmedStage
            ? `Based on what you described, it sounds like you're leaning toward becoming an ${selectedRole.title}. Is that accurate?`
            : "When you imagine yourself working two years from now, what kind of work or projects are you doing?"
        }
      />

      {/* Main Interaction Area */}
      <div className="w-full bg-white border border-[#e1e7ef] rounded-2xl p-5 my-4 shadow-sm text-left space-y-4">
        {!isConfirmedStage ? (
          <div className="space-y-4">
            {!isTyping ? (
              <div className="space-y-3">
                <button
                  onClick={() => setIsTyping(true)}
                  className="w-full py-3 px-4 rounded-full bg-[#f8fafc] border border-[#e1e7ef] text-[#0b111e] hover:border-[#1f3861] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition"
                >
                  <Keyboard className="w-4 h-4 text-[#1f3861]" />
                  Type my vision in words
                </button>

                <div className="text-center">
                  <span className="text-[10px] text-[#344256] uppercase tracking-wider font-semibold">or choose target role directly</span>
                </div>

                <div className="space-y-2">
                  {PATHWISSE_ROLES.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => {
                        setSelectedRole(role);
                        setIsConfirmedStage(true);
                      }}
                      className="w-full p-3.5 rounded-xl bg-[#f8fafc] border border-[#e1e7ef] hover:border-[#1f3861] hover:bg-[#e1e7ef]/40 transition text-left group shadow-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs sm:text-sm font-bold text-[#0b111e] group-hover:text-[#1f3861]">
                          {role.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#e1e7ef] text-[#1f3861] font-mono font-semibold">
                          {role.demandLevel}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#344256] line-clamp-1">{role.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleTextSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#0b111e] flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#1f3861]" />
                    Describe your ideal work or tech interest
                  </label>
                  <textarea
                    value={userInputText}
                    onChange={(e) => setUserInputText(e.target.value)}
                    placeholder="e.g. I want to build machine learning models, work with neural networks, or deploy AI APIs for real users..."
                    className="w-full h-24 bg-[#f8fafc] border border-[#e1e7ef] rounded-xl p-3 text-xs sm:text-sm text-[#0b111e] focus:outline-none focus:border-[#1f3861] transition resize-none"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTyping(false)}
                    className="px-4 py-2.5 rounded-full bg-[#f8fafc] border border-[#e1e7ef] text-xs text-[#344256] hover:text-[#0b111e]"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition"
                  >
                    <span>Extract Career Goal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Confirmation Stage */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#e1e7ef]/60 border border-[#1f3861]/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#1f3861] font-bold">Target Role Match</span>
                <CheckCircle2 className="w-4 h-4 text-[#1f3861]" />
              </div>
              <h3 className="text-base font-bold text-[#0b111e]">{selectedRole.title}</h3>
              <p className="text-xs text-[#344256] leading-relaxed">{selectedRole.description}</p>
              
              <div className="pt-2 border-t border-[#e1e7ef]">
                <span className="text-[10px] text-[#344256] font-medium block mb-1">Key Expectation Benchmark:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedRole.keySkills.map((sk) => (
                    <span key={sk} className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#1f3861] border border-[#e1e7ef] font-medium">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleConfirm}
                className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition"
              >
                <span>Yes, audit my {selectedRole.title} readiness</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsConfirmedStage(false)}
                className="w-full py-2 px-3 text-xs text-[#344256] hover:text-[#1f3861] flex items-center justify-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3" />
                Change target role
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
