import React from 'react';
import { PATHWISSE_LOGO_URL } from '../components/ui/PathwisseUI';
import { LogOut } from 'lucide-react';

interface StudentLayoutProps {
  children: React.ReactNode;
  studentName?: string;
  onLogout: () => void;
  activeStage?: number;
  stageLabel?: string;
}

export function StudentLayout({
  children,
  studentName,
  onLogout,
  stageLabel,
}: StudentLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f8fafc] text-[#0b111d] selection:bg-[#1f3861] selection:text-white">
      {/* Sticky 64px Header */}
      <header className="h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e2e8f0]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center shadow-xs overflow-hidden flex-shrink-0">
            <img src={PATHWISSE_LOGO_URL} alt="CareerVoice by Pathwisse" className="h-7 w-7 object-contain" />
          </div>
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-extrabold text-sm tracking-tight text-[#0b111d]">
              CareerVoice
            </span>
            <span className="text-[11px] font-medium text-[#64748b] hidden sm:inline truncate">
              Diagnostic Assessment
            </span>
          </div>
        </div>

        {stageLabel && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f1f5f9] border border-[#e2e8f0] text-xs font-semibold text-[#1f3861]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c]" />
            <span>{stageLabel}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {studentName && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#f1f5f9] border border-[#e2e8f0]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-[#334155] truncate max-w-[150px]">{studentName}</span>
            </div>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#64748b] hover:text-[#0b111d] hover:bg-[#f1f5f9] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
