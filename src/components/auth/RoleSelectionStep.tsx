import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Building2, ArrowRight, Check, Sparkles } from 'lucide-react';
import type { UserRole } from '../../domain/careerVoiceFlow';

interface RoleSelectionStepProps {
  onSelectRole: (role: UserRole) => void;
  currentRole?: UserRole;
}

export const RoleSelectionStep: React.FC<RoleSelectionStepProps> = ({
  onSelectRole,
  currentRole,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(() => {
    if (currentRole === 'placement_team' || currentRole === 'college') return 'placement_team';
    return 'student';
  });

  const handleContinue = () => {
    onSelectRole(selectedRole);
  };

  return (
    <div className="w-full text-left">
      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-center mb-6 sm:mb-8"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-[#ea580c] mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#ea580c]" />
          <span>Select Workspace</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0b111d]">
          How will you use CareerVoice?
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#64748b] max-w-lg mx-auto">
          Select your dedicated portal to customize assessment workflows and reports.
        </p>
      </motion.div>

      {/* 2-Role Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6" role="radiogroup" aria-label="Role selection">
        {/* 1. Student Card */}
        <div
          role="radio"
          tabIndex={0}
          aria-checked={selectedRole === 'student'}
          onClick={() => setSelectedRole('student')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedRole('student');
            }
          }}
          className={`group relative text-left rounded-xl p-6 sm:p-7 border cursor-pointer flex flex-col justify-between select-none active:scale-[0.99] transition-all duration-150 ${
            selectedRole === 'student'
              ? 'border-[#ea580c] bg-orange-50/20 shadow-xs ring-2 ring-orange-500/20'
              : 'border-[#e2e8f0] bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div>
            {/* Top Bar: Icon + Radio indicator */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div
                className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
                  selectedRole === 'student'
                    ? 'bg-[#ea580c] text-white shadow-xs'
                    : 'bg-[#f1f5f9] text-[#64748b]'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>

              {/* Radio/Check state */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                  selectedRole === 'student'
                    ? 'border-[#ea580c] bg-[#ea580c] text-white shadow-xs scale-100'
                    : 'border-[#cbd5e1] bg-white text-transparent scale-90'
                }`}
                aria-hidden="true"
              >
                <Check className={`w-3 h-3 stroke-[3] transition-transform ${selectedRole === 'student' ? 'scale-100' : 'scale-0'}`} />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="text-lg font-bold text-[#0b111d]">Student Portal</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-[#ea580c] border border-orange-200 uppercase tracking-wider">
                Candidate
              </span>
            </div>

            <p className="text-xs text-[#64748b] leading-relaxed mb-5">
              Discover your career direction, benchmark real capabilities with voice interviews, and receive a verified readiness report.
            </p>

            {/* Feature Bullets */}
            <div className="space-y-2 pt-4 border-t border-[#e2e8f0] text-xs text-[#334155]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] shrink-0" />
                <span>AI-guided career direction discovery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] shrink-0" />
                <span>Voice adaptive competency assessment</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] shrink-0" />
                <span>Actionable gap analysis & learning roadmap</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Placement Team Card */}
        <div
          role="radio"
          tabIndex={0}
          aria-checked={selectedRole === 'placement_team'}
          onClick={() => setSelectedRole('placement_team')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setSelectedRole('placement_team');
            }
          }}
          className={`group relative text-left rounded-xl p-6 sm:p-7 border cursor-pointer flex flex-col justify-between select-none active:scale-[0.99] transition-all duration-150 ${
            selectedRole === 'placement_team'
              ? 'border-[#1f3861] bg-slate-50/70 shadow-xs ring-2 ring-[#1f3861]/15'
              : 'border-[#e2e8f0] bg-white hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div>
            {/* Top Bar: Icon + Radio indicator */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div
                className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
                  selectedRole === 'placement_team'
                    ? 'bg-[#0b111d] text-white shadow-xs'
                    : 'bg-[#f1f5f9] text-[#64748b]'
                }`}
              >
                <Building2 className="w-5 h-5" />
              </div>

              {/* Radio/Check state */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                  selectedRole === 'placement_team'
                    ? 'border-[#1f3861] bg-[#1f3861] text-white shadow-xs scale-100'
                    : 'border-[#cbd5e1] bg-white text-transparent scale-90'
                }`}
                aria-hidden="true"
              >
                <Check className={`w-3 h-3 stroke-[3] transition-transform ${selectedRole === 'placement_team' ? 'scale-100' : 'scale-0'}`} />
              </div>
            </div>

            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="text-lg font-bold text-[#0b111d]">Placement Team</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-[#0b111d] border border-slate-200 uppercase tracking-wider">
                Institutional
              </span>
            </div>

            <p className="text-xs text-[#64748b] leading-relaxed mb-5">
              Create campaigns, invite student batches, monitor participation in real time, and pinpoint cohorts requiring attention.
            </p>

            {/* Feature Bullets */}
            <div className="space-y-2 pt-4 border-t border-[#e2e8f0] text-xs text-[#334155]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1f3861] shrink-0" />
                <span>Multi-campaign batch orchestration</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1f3861] shrink-0" />
                <span>Student readiness signals & follow-up queues</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1f3861] shrink-0" />
                <span>Institutional export & recruiter sharing</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary CTA Button */}
      <div className="mt-8 flex flex-col items-center">
        <button
          type="button"
          onClick={handleContinue}
          className="w-full sm:w-auto min-w-[200px] py-3 px-8 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 bg-[#ea580c] hover:bg-[#c2410c] shadow-xs active:scale-[0.98] transition-all cursor-pointer"
        >
          <span>Continue to Workspace</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="mt-2.5 text-xs text-[#94a3b8]">
          Secure role-based access powered by CareerVoice.
        </p>
      </div>
    </div>
  );
};


