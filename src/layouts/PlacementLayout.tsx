import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { PATHWISSE_LOGO_URL } from '../components/ui/PathwisseUI';
import {
  LayoutDashboard,
  Users,
  Lightbulb,
  LogOut,
  Menu,
  X,
  Megaphone,
  FileText,
  MessageSquare,
  Settings,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PlacementLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { to: '/placement', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/placement/campaigns', label: 'Campaigns', icon: Megaphone, end: false },
  { to: '/placement/students', label: 'Students', icon: Users, end: false },
  { to: '/placement/reports', label: 'Reports', icon: FileText, end: false },
  { to: '/placement/insights', label: 'Insights', icon: Lightbulb, end: false },
  { to: '/placement/messages', label: 'Messages', icon: MessageSquare, end: false },
  { to: '/placement/settings', label: 'Settings', icon: Settings, end: false },
] as const;

export function PlacementLayout({ children }: PlacementLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { collegeContext, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const collegeName = collegeContext?.collegeName ?? 'Placement Portal';
  const officerName = collegeContext?.officerName ?? 'Placement Team';

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-[#0b111d] select-none">
      {/* Header / Brand */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#e2e8f0]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center shadow-xs overflow-hidden flex-shrink-0">
            <img src={PATHWISSE_LOGO_URL} alt="CareerVoice" className="h-7 w-7 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-[#0b111d]">CareerVoice</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-[#ea580c] border border-orange-200 uppercase tracking-wider">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-[#64748b] truncate font-medium">Placement Control Room</p>
          </div>
        </div>

        <button
          className="md:hidden p-1.5 rounded-lg text-[#64748b] hover:text-[#0b111d] hover:bg-[#f1f5f9] transition-colors"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* College Info Card */}
      <div className="mx-3 mt-3 p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
        <div className="flex items-center gap-2 mb-0.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#1f3861] flex-shrink-0" />
          <p className="text-xs font-bold text-[#0b111d] truncate">{collegeName}</p>
        </div>
        <p className="text-[11px] text-[#64748b] truncate pl-5.5">{officerName}</p>
      </div>

      {/* Navigation */}
      <nav aria-label="Placement Rail Navigation" className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#fff7ed] text-[#ea580c] font-bold shadow-xs border-l-[3px] border-l-[#ea580c]'
                  : 'text-[#334155] hover:text-[#0b111d] hover:bg-[#f8fafc]'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer / Links */}
      <div className="p-3 border-t border-[#e2e8f0] space-y-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <a
          href="https://pathwisse.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-[#1f3861] bg-[#f0f4fa] hover:bg-[#e4ecf7] transition-all border border-[#d6e2ee]"
        >
          <span>Pathwisse Core</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-600" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex bg-[#f8fafc] text-[#0b111d]">
      {/* Desktop 260px sidebar rail */}
      <aside
        role="navigation"
        aria-label="Placement Navigation Rail"
        className="hidden md:flex flex-col w-[260px] flex-shrink-0 sticky top-0 h-screen overflow-hidden border-r border-[#e2e8f0] bg-white shadow-xs z-20"
      >
        <SidebarContent />
      </aside>

      {/* Mobile Slide-Over Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-[#0b111d]/50 backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile 280px Slide-Over Drawer Navigation */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
        className={`fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] flex flex-col md:hidden transition-transform duration-200 ease-out shadow-2xl border-r border-[#e2e8f0] bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile sticky top bar */}
        <header className="md:hidden h-14 flex items-center justify-between px-4 sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e2e8f0]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-[#334155] hover:text-[#0b111d] hover:bg-[#f1f5f9] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <img src={PATHWISSE_LOGO_URL} alt="CareerVoice" className="h-6 w-6 rounded-md object-contain" />
              <span className="font-extrabold text-sm text-[#0b111d]">CareerVoice</span>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#64748b] truncate max-w-[150px]">{collegeName}</span>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
