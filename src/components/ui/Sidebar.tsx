import React from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { PATHWISSE_LOGO_URL } from './PathwisseUI';

export interface SidebarNavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  end?: boolean;
}

export interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  navItems: SidebarNavItem[];
  collegeName?: string;
  officerName?: string;
  onLogout?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile = false,
  onCloseMobile,
  navItems,
  collegeName = 'Placement Cell',
  officerName,
  onLogout,
  className = '',
}) => {
  const content = (
    <div className="flex flex-col h-full bg-white border-r border-[#e2e8f0] select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center shadow-xs overflow-hidden flex-shrink-0">
            <img src={PATHWISSE_LOGO_URL} alt="Pathwisse" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-[#0b111d] tracking-tight truncate">CareerVoice</span>
              <span className="text-[10px] font-bold text-[#ea580c] bg-orange-50 border border-orange-200 px-1 rounded uppercase tracking-wider">
                Pro
              </span>
            </div>
            <span className="text-[11px] text-[#64748b] truncate font-medium">{collegeName}</span>
          </div>
        </div>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0b111d]"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Institutional Officer Badge */}
      <div className="px-4 py-2.5 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-3.5 h-3.5 text-[#1f3861] flex-shrink-0" />
          <span className="font-semibold text-[#1f3861] truncate">
            {officerName ? officerName : 'Institutional Portal'}
          </span>
        </div>
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="Live Sync Active" />
      </div>

      {/* Nav List */}
      <nav aria-label="Placement Navigation" className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#fff7ed] text-[#ea580c] font-bold shadow-xs border-l-[3px] border-l-[#ea580c]'
                    : 'text-[#334155] hover:bg-[#f8fafc] hover:text-[#0b111d]'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#f1f5f9] text-[#475569]">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Pathwisse Core External Bridge */}
      <div className="p-3 border-t border-[#e2e8f0]">
        <a
          href="https://pathwisse.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-[#1f3861] bg-[#f0f4fa] hover:bg-[#e4ecf7] transition-all border border-[#d6e2ee]"
        >
          <span className="flex items-center gap-2">
            <span>Pathwisse Core</span>
          </span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>

      {/* Logout / User Footer */}
      {onLogout && (
        <div className="p-3 border-t border-[#e2e8f0]">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Rail */}
      <aside
        role="navigation"
        aria-label="Placement Navigation Rail"
        className={`hidden md:block w-[260px] flex-shrink-0 h-screen sticky top-0 ${className}`}
      >
        {content}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#0b111d]/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Drawer Panel */}
          <div className="relative w-[280px] max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
