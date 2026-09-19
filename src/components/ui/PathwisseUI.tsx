import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, LogOut } from 'lucide-react';

export const PATHWISSE_LOGO_URL =
  'https://kwjoyovcstrkvpcildfu.supabase.co/storage/v1/object/public/avatars/223246dc-a793-48fb-8a7a-a5aac93b315a/1767343055146.png';

export const journeySteps = [
  { id: 'UNDERSTAND', label: 'Understand' },
  { id: 'GUIDE', label: 'Guide' },
  { id: 'COMPARE', label: 'Compare' },
  { id: 'CHOOSE', label: 'Choose' },
  { id: 'AUDIT', label: 'Audit' },
  { id: 'DIAGNOSE', label: 'Diagnose' },
  { id: 'REPORT', label: 'Report' },
] as const;

interface PathwisseFrameProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  activeStep?: number;
  studentName?: string;
  onRestart?: () => void;
  onLogout?: () => void;
  auditLabel?: string | null;
  flowError?: string | null;
  layoutMode?: 'audit' | 'wide' | 'dashboard';
  userRole?: string;
  onRoleToggle?: () => void;
  showJourney?: boolean;
}

export function studentFacingError(message?: string | null) {
  if (!message) return null;
  if (/expired|not found|dev_audit|uuid|invalid input syntax/i.test(message)) {
    return 'This session is no longer available. Start a new audit to continue.';
  }
  if (/gemini|supabase|database|api|rpc|schema|service role|permission|backend/i.test(message)) {
    return 'We could not complete this step right now. Please retry in a moment.';
  }
  return message.replace(/\bSupabase\b|\bGemini\b|\bAPI\b|\bdatabase\b|\bRPC\b/gi, 'service');
}

export const PathwisseFrame: React.FC<PathwisseFrameProps> = ({
  children,
  title = 'CareerVoice',
  subtitle = 'Find your direction. Prove your readiness. Know the next action.',
  activeStep = 0,
  studentName,
  onRestart,
  onLogout,
  auditLabel,
  flowError,
  layoutMode = 'audit',
  userRole,
  onRoleToggle,
  showJourney = true,
}) => {
  const friendlyError = studentFacingError(flowError);
  const isWide = layoutMode === 'wide';

  if (layoutMode === 'dashboard') {
    return (
      <div className="min-h-dvh bg-[#f8fafc] text-[#0b111d]">
        {friendlyError ? (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs font-semibold">
            {friendlyError}
          </div>
        ) : null}
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#f8fafc] text-[#0b111d] selection:bg-[#1f3861] selection:text-white">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#1f3861] focus:shadow-lg">
        Skip to content
      </a>
      <header className="sticky top-0 z-50 border-b border-[#e2e8f0] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button type="button" onClick={onRestart} className="group flex min-w-0 items-center gap-3 rounded-xl text-left transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-xs">
              <img src={PATHWISSE_LOGO_URL} alt="Pathwisse" className="h-7 w-7 object-contain" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold tracking-[-0.02em] text-[#0b111d]">Pathwisse</span>
              <span className="block truncate text-[11px] font-medium text-[#64748b]">{studentName ? `${studentName}'s audit` : userRole === 'college' ? 'Placement Cell Portal' : 'CareerVoice assessment'}</span>
            </span>
          </button>

          {!isWide && showJourney ? (
            <nav aria-label="CareerVoice journey" className="hidden flex-1 justify-center md:flex">
              <ol className="flex items-center gap-1 rounded-xl bg-[#f8fafc] p-1 ring-1 ring-[#e2e8f0]">
                {journeySteps.map((step, index) => {
                  const complete = index < activeStep;
                  const active = index === activeStep;
                  return (
                    <li key={step.id}>
                      <span className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${active ? 'bg-white text-[#1f3861] shadow-xs border border-[#e2e8f0]' : complete ? 'text-emerald-700' : 'text-[#64748b]'}`}>
                        {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              {userRole && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${userRole === 'college' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-[#eef3f9] text-[#1f3861] border border-[#d6e2ee]'}`}>
                  {userRole === 'college' ? 'Institutional Mode (Placement)' : 'Student Mode'}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            {onRoleToggle && (
              <button
                type="button"
                onClick={onRoleToggle}
                className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#334155] hover:border-[#1f3861] hover:text-[#0b111d] transition-all"
              >
                {userRole === 'college' ? 'Switch to Student' : 'Switch to Placement'}
              </button>
            )}

            {auditLabel ? (
              <span className="hidden rounded-full bg-[#f8fafc] px-3 py-1 text-[11px] font-semibold text-[#64748b] ring-1 ring-[#e2e8f0] sm:inline-flex">
                {auditLabel}
              </span>
            ) : null}

            <button type="button" onClick={onRestart} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#1f3861] transition-all hover:border-[#1f3861] hover:bg-[#f8fafc] active:scale-[0.98]">
              <ArrowLeft className="h-3.5 w-3.5" />
              {isWide ? 'Exit' : 'Restart'}
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-all"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-600" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {isWide ? (
        <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          {friendlyError ? (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium leading-6 text-rose-900">
              {friendlyError}
            </div>
          ) : null}
          {children}
        </main>
      ) : (
        <main id="main-content" className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(390px,480px)_minmax(0,0.9fr)] lg:py-10">
          <aside className="hidden pt-8 lg:block">
            <div className="sticky top-28 space-y-4">
              <p className="max-w-xs text-3xl font-extrabold leading-tight tracking-[-0.035em] text-[#0b111d] text-balance">{title}</p>
              <p className="max-w-xs text-sm leading-6 text-[#64748b]">{subtitle}</p>
            </div>
          </aside>

          <motion.section
            initial={{ opacity: 0, transform: 'translateY(16px) scale(0.98)' }}
            animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="min-h-[720px] overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm"
          >
            {friendlyError ? (
              <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium leading-6 text-rose-900">
                {friendlyError}
              </div>
            ) : null}
            {children}
          </motion.section>

          <aside className="hidden pt-8 lg:block">
            <div className="sticky top-28 rounded-2xl bg-[#0b111d] p-6 text-white shadow-md border border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Current promise</p>
              <p className="mt-3 text-xl font-bold leading-7 tracking-[-0.02em]">Understand where you are. See where to go next.</p>
              <div className="mt-6 space-y-3 text-sm text-white/75">
                <p>Every answer narrows the path.</p>
                <p>Every score points to evidence.</p>
                <p>Every gap becomes an action.</p>
              </div>
            </div>
          </aside>
        </main>
      )}
    </div>
  );
};

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({ children, className = '' }) => (
  <div className={`rounded-xl bg-white p-5 shadow-xs border border-[#e2e8f0] ${className}`}>
    {children}
  </div>
);
