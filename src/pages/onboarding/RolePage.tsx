import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleSelectionStep } from '../../components/auth/RoleSelectionStep';
import { useAuth } from '../../context/AuthContext';
import { PATHWISSE_LOGO_URL } from '../../components/ui/PathwisseUI';
import type { UserRole } from '../../domain/careerVoiceFlow';

const PLACEMENT_ROLES = new Set<string>(['placement_team', 'college', 'college_management']);

export function RolePage() {
  const navigate = useNavigate();
  const { userRole, setUserRole } = useAuth();

  const handleSelectRole = (role: UserRole) => {
    setUserRole(role);
    if (PLACEMENT_ROLES.has(role)) {
      navigate('/onboarding/placement', { replace: true });
    } else {
      navigate('/onboarding/student', { replace: true });
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans bg-[#f8fafc] text-[#0b111d] selection:bg-[#ea580c] selection:text-white">
      {/* Top Header Logo */}
      <header className="w-full max-w-[960px] flex items-center justify-between py-3 mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center shadow-xs overflow-hidden flex-shrink-0">
            <img src={PATHWISSE_LOGO_URL} alt="CareerVoice" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base text-[#0b111d] tracking-tight leading-none">
                CareerVoice
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-orange-50 text-[#ea580c] border border-orange-200">
                Pathwisse
              </span>
            </div>
            <span className="text-[11px] text-[#64748b] font-medium mt-0.5">Workspace Selection</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-[960px]">
        <RoleSelectionStep onSelectRole={handleSelectRole} currentRole={userRole ?? undefined} />
      </main>
    </div>
  );
}

