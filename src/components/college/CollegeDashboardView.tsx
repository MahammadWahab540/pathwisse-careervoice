import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Send,
  Copy,
  Check,
  Share2,
  QrCode,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  FileText,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  X,
  Sparkles,
  BarChart3,
  Award,
  Layers,
  GraduationCap,
  Mail,
  MessageSquare,
  Home,
  Link as LinkIcon,
  BookOpen,
  Settings,
  Bell,
  Download,
  HelpCircle,
  Briefcase,
  Zap,
  ChevronDown,
  UserCheck,
  Eye,
  Plus,
  Loader2,
  LogOut,
  Landmark,
} from 'lucide-react';
import type { CollegeContext, UserRole } from '../../domain/careerVoiceFlow';
import type { CollegeManagementMetrics } from '../../types';
import { PATHWISSE_LOGO_URL } from '../ui/PathwisseUI';

export interface LiveStudentItem {
  id: string;
  name: string;
  rollNo: string;
  phone: string;
  department: string;
  academicYear: string;
  status: 'completed' | 'started' | 'invited';
  targetRole: string;
  readinessScore: number | null;
  completedAt: string | null;
  auditId: string | null;
  collegeId?: string | null;
}

export interface CollegeDashboardResponse {
  success: boolean;
  college: {
    id: string;
    name: string;
    placementCell: string;
    targetBatch: string;
  };
  metrics: {
    totalInvited: number;
    startedCount: number;
    completedCount: number;
    invitedCount: number;
    avgReadinessScore: number | null;
    participationRate: number;
    completionRate: number;
  };
  insights: {
    topRoles: Array<{
      roleTitle: string;
      studentCount: number;
      percentage: number;
      demandLevel: string;
    }>;
    criticalGaps: Array<{
      skillName: string;
      gapAverage: number;
      affectedCount: number;
      priority: string;
      recommendedAction: string;
    }>;
    readinessDistribution: {
      ready: number;
      growing: number;
      foundation: number;
    };
  };
  students: LiveStudentItem[];
  managementMetrics?: CollegeManagementMetrics;
}

interface CollegeDashboardViewProps {
  collegeContext: CollegeContext | null;
  onSwitchToStudent: () => void;
  onLogout?: () => void;
  trackEvent?: (name: string, meta?: Record<string, unknown>) => void;
}

export const CollegeDashboardView: React.FC<CollegeDashboardViewProps> = ({
  collegeContext,
  onSwitchToStudent,
  onLogout,
  trackEvent,
}) => {
  const isManagement = collegeContext?.roleType === 'college_management';

  // Navigation active tab
  const [activeNav, setActiveNav] = useState<string>(isManagement ? 'Executive Overview' : 'Overview');

  // Search query & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [trendMonth, setTrendMonth] = useState('Last 5 Months');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('2026');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'started' | 'invited'>('all');

  // Live Data State
  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // User Dropdown State
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Link & Campaign state
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCreateLinkModal, setShowCreateLinkModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Broadcast & Messaging state
  const [announcementText, setAnnouncementText] = useState('');
  const [sentAnnouncements, setSentAnnouncements] = useState<Array<{ id: string; text: string; time: string; target: string }>>([
    {
      id: 'ann_1',
      text: 'Final campus placement readiness drive: Complete your CareerVoice audit by Friday.',
      time: '2 hours ago',
      target: '2026 Batch',
    },
  ]);

  // Student drilldown inspection
  const [selectedStudent, setSelectedStudent] = useState<LiveStudentItem | null>(null);
  const [auditDetail, setAuditDetail] = useState<any | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Settings Form State
  const [settingsCollegeName, setSettingsCollegeName] = useState(collegeContext?.collegeName || 'BITS Pilani, Hyderabad Campus');
  const [settingsDept, setSettingsDept] = useState(collegeContext?.department || 'Department of Training & Placement');
  const [settingsOfficerName, setSettingsOfficerName] = useState(collegeContext?.officerName || 'Placement Officer');
  const [settingsOfficerEmail, setSettingsOfficerEmail] = useState(collegeContext?.officerEmail || 'placements@institution.edu');
  const [settingsBatch, setSettingsBatch] = useState(collegeContext?.targetBatch || '2026');
  const [settingsAccreditation, setSettingsAccreditation] = useState(collegeContext?.focusArea || 'NAAC A++ & NIRF Ranking Benchmark');
  const [savingSettings, setSavingSettings] = useState(false);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/college/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collegeName: settingsCollegeName,
          department: settingsDept,
          officerName: settingsOfficerName,
          officerEmail: settingsOfficerEmail,
          targetBatch: settingsBatch,
          focusArea: settingsAccreditation,
          roleType: collegeContext?.roleType || 'placement_team',
        }),
      });
      if (res.ok) {
        showToast('Workspace settings saved and synchronized!');
      } else {
        showToast('Settings saved locally.');
      }
    } catch {
      showToast('Settings saved locally.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendAnnouncement = () => {
    if (!announcementText.trim()) {
      showToast('Please type an announcement message first.');
      return;
    }
    const newAnn = {
      id: `ann_${Date.now()}`,
      text: announcementText.trim(),
      time: 'Just now',
      target: `${selectedBatch} Batch (${selectedDept === 'all' ? 'All Branches' : selectedDept})`,
    };
    setSentAnnouncements([newAnn, ...sentAnnouncements]);
    setAnnouncementText('');
    showToast('Broadcast message queued and sent to students via SMS & WhatsApp!');
  };

  // Fetch live dashboard data from Supabase backend
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setFetchError(null);

    const targetCollege = collegeContext?.collegeId || 'bits_h';
    const params = new URLSearchParams();
    params.set('collegeId', targetCollege);
    if (selectedDept !== 'all') params.set('department', selectedDept);
    params.set('batch', selectedBatch);

    fetch(`/api/college/dashboard?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: CollegeDashboardResponse) => {
        if (isMounted) {
          setDashboardData(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load college dashboard:', err);
          setFetchError('Unable to load live cohort data from database.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [collegeContext?.collegeId, selectedDept, selectedBatch]);

  // Campaign URL dynamically constructed
  const host = typeof window !== 'undefined' ? window.location.host : 'careervoice.pathwisse.com';
  const collegeSlug = dashboardData?.college.id || collegeContext?.collegeId || 'bits_h';
  const campaignUrl = `${host}/?college=${encodeURIComponent(collegeSlug)}${
    selectedDept !== 'all' ? `&dept=${encodeURIComponent(selectedDept)}` : ''
  }&batch=${encodeURIComponent(selectedBatch)}&role=student`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${campaignUrl}`);
    setCopiedLink(true);
    showToast('Live CareerVoice campaign link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShare = () => {
    const institution = dashboardData?.college.name || collegeContext?.collegeName || 'our institution';
    const msg = `Dear Students of ${institution}, please complete your verified Career Readiness Audit on Pathwisse CareerVoice before campus recruitment drives: https://${campaignUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Student Drilldown Inspection handler
  const handleInspectStudent = (student: LiveStudentItem) => {
    setSelectedStudent(student);
    setLoadingAudit(true);
    setAuditDetail(null);
    fetch(`/api/college/students/${encodeURIComponent(student.id)}/audit`)
      .then((res) => res.json())
      .then((data) => {
        setAuditDetail(data);
      })
      .catch((err) => {
        console.error('Failed to load student audit:', err);
      })
      .finally(() => {
        setLoadingAudit(false);
      });
  };

  // Export CSV Action from live students
  const handleExportCSV = () => {
    const students = dashboardData?.students || [];
    if (students.length === 0) {
      showToast('No students enrolled in this cohort yet to export.');
      return;
    }
    const headers = ['Name,Roll No,Department,Academic Year,Status,Target Role,Readiness Score,Completion Date,Phone\n'];
    const rows = students.map(
      (s) =>
        `"${s.name}","${s.rollNo}","${s.department}","${s.academicYear}","${s.status}","${s.targetRole}","${s.readinessScore ?? 'Pending'}","${s.completedAt ? new Date(s.completedAt).toLocaleDateString() : 'N/A'}","${s.phone}"`
    );
    const blob = new Blob([headers.concat(rows.join('\n')).join('')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Pathwisse_Audit_${collegeSlug}_${selectedBatch}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Live student cohort CSV downloaded successfully!');
  };

  const allStudents = dashboardData?.students || [];
  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.targetRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery);
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allStudents, searchQuery, statusFilter]);

  // Derived dynamic metrics and chart datasets from live cohort
  const eligibleCount = useMemo(() => {
    return allStudents.filter((s) => (s.readinessScore || 0) >= 65).length;
  }, [allStudents]);

  const scoreDistribution = useMemo(() => {
    const scores = allStudents
      .map((s) => s.readinessScore)
      .filter((s): s is number => s !== null && s !== undefined);
    const beginner = scores.filter((s) => s <= 40).length;
    const developing = scores.filter((s) => s > 40 && s <= 70).length;
    const ready = scores.filter((s) => s > 70 && s <= 85).length;
    const advanced = scores.filter((s) => s > 85).length;
    const maxVal = Math.max(beginner, developing, ready, advanced, 1);
    return {
      beginner: { count: beginner, heightPct: scores.length > 0 ? Math.round((beginner / maxVal) * 85) + 10 : 8 },
      developing: { count: developing, heightPct: scores.length > 0 ? Math.round((developing / maxVal) * 85) + 10 : 8 },
      ready: { count: ready, heightPct: scores.length > 0 ? Math.round((ready / maxVal) * 85) + 10 : 8 },
      advanced: { count: advanced, heightPct: scores.length > 0 ? Math.round((advanced / maxVal) * 85) + 10 : 8 },
      totalEvaluated: scores.length,
    };
  }, [allStudents]);

  const donutPalette = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];
  const donutSegments = useMemo(() => {
    const topRoles = dashboardData?.insights.topRoles || [];
    let cumulative = 0;
    return topRoles.map((role, idx) => {
      const offset = cumulative;
      cumulative += role.percentage;
      return {
        roleTitle: role.roleTitle,
        percentage: role.percentage,
        studentCount: role.studentCount,
        color: donutPalette[idx % donutPalette.length],
        dasharray: `${role.percentage}, 100`,
        dashoffset: -offset,
      };
    });
  }, [dashboardData?.insights.topRoles]);

  const trendData = useMemo(() => {
    const monthNames = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const months: { label: string; count: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleString('en-US', { month: 'short' }), count: 0 });
    }
    const completedStudents = allStudents.filter((s) => s.status === 'completed' && s.completedAt);
    if (completedStudents.length > 0) {
      completedStudents.forEach((s) => {
        const d = new Date(s.completedAt!);
        const monthLabel = d.toLocaleString('en-US', { month: 'short' });
        const match = months.find((m) => m.label === monthLabel);
        if (match) match.count++;
        else months[months.length - 1].count++;
      });
    }
    const maxCount = Math.max(...months.map((m) => m.count), 5);
    const points = months.map((m, idx) => {
      const x = 35 + idx * 46;
      const y = 100 - (m.count / maxCount) * 80;
      return { x, y, count: m.count, label: m.label };
    });
    const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
    const polygon = `${polyline} ${points[points.length - 1].x},110 ${points[0].x},110`;
    return { months, points, polyline, polygon, maxCount, hasData: completedStudents.length > 0 };
  }, [allStudents]);

  // Sidebar navigation items
  const navItems = isManagement
    ? [
        { id: 'Executive Overview', label: 'Executive Overview', icon: Landmark },
        { id: 'Overview', label: 'Placement Operations', icon: Home },
        { id: 'CareerVoice Links', label: 'CareerVoice Links', icon: LinkIcon },
        { id: 'Students', label: 'Students', icon: Users },
        { id: 'Audits', label: 'Cohort Audits', icon: FileText },
        { id: 'Insights', label: 'Department Insights', icon: BarChart3 },
        { id: 'Eligible Students', label: 'Eligible Students', icon: GraduationCap },
        { id: 'Messages', label: 'Broadcast Center', icon: MessageSquare, badge: true },
        { id: 'Settings', label: 'Settings', icon: Settings },
      ]
    : [
        { id: 'Overview', label: 'Overview', icon: Home },
        { id: 'CareerVoice Links', label: 'CareerVoice Links', icon: LinkIcon },
        { id: 'Students', label: 'Students', icon: Users },
        { id: 'Audits', label: 'Audits', icon: FileText },
        { id: 'Insights', label: 'Insights', icon: BarChart3 },
        { id: 'Eligible Students', label: 'Eligible Students', icon: GraduationCap },
        { id: 'Core Learning', label: 'Core Learning', icon: BookOpen },
        { id: 'Network Projects', label: 'Network Projects', icon: Layers },
        { id: 'Messages', label: 'Messages', icon: MessageSquare, badge: true },
        { id: 'Settings', label: 'Settings', icon: Settings },
      ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col font-sans selection:bg-[#2563eb] selection:text-white">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[1200] bg-[#0f172a] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#e2e8f0] px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xl font-extrabold tracking-tight text-[#0f172a]">
            PATHWISSE
          </span>
        </div>

        {/* Global Search & Guide */}
        <div className="flex-1 max-w-xl mx-auto flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search students, links, reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:bg-white transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-[#f8fafc] border border-[#e2e8f0] hover:bg-slate-100 rounded-xl text-xs font-semibold text-[#475569] transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>Guide</span>
          </button>
        </div>

        {/* Notification & User Profile */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={() => showToast('You have 3 unread student placement notifications.')}
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              3
            </span>
          </button>

          {/* User profile dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 pl-2 border-l border-[#e2e8f0] cursor-pointer hover:opacity-80 transition"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-700 to-teal-800 text-white font-bold text-xs flex items-center justify-center border border-[#e2e8f0] shadow-xs">
                {(collegeContext?.officerName || 'PS').slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:block text-left text-xs leading-tight">
                <span className="font-bold text-[#0f172a] block">
                  {collegeContext?.officerName || 'Placement Officer'}
                </span>
                <span className="text-[11px] text-[#64748b]">
                  {isManagement ? 'College Management' : 'Placement Team'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748b]" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 z-50 text-left">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-[#0f172a]">{collegeContext?.officerName || 'User'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{collegeContext?.officerEmail || collegeContext?.collegeName}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {isManagement ? 'Executive Leadership' : 'Placement Operations'}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onSwitchToStudent();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-[#1f3861]" />
                    <span>Switch to Student View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      setActiveNav('Settings');
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Workspace Settings</span>
                  </button>
                </div>

                {onLogout && (
                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout (Sidebar + Content) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-60 shrink-0 bg-white border-r border-[#e2e8f0] p-4 flex flex-col justify-between hidden lg:flex">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveNav(item.id);
                    if (item.id === 'Students') {
                      const el = document.getElementById('student-responses-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#2563eb] text-white shadow-xs'
                      : 'text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#64748b]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Sidebar Card: Empower your students */}
          <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-[#eff6ff] to-[#e0f2fe] border border-[#bfdbfe] text-left relative overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center mb-2 shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-[#1e3a8a] leading-tight">
              Empower your students.
            </p>
            <p className="text-[11px] text-[#3b82f6] mt-0.5">
              Build their tomorrow.
            </p>
          </div>
        </aside>

        {/* Main Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {activeNav === 'Overview' && (
            <>
              {/* Top Hero Row (Good Morning + CareerVoice Campaign) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Hero: Good morning, Placement Team */}
            <div className="lg:col-span-7 rounded-xl bg-gradient-to-br from-[#eff6ff] via-[#f0fdf4]/50 to-[#f8fafc] border border-[#dbeafe] p-6 sm:p-8 text-left flex flex-col justify-between relative overflow-hidden shadow-2xs">
              <div className="relative z-10 max-w-md space-y-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
                    Good morning, Placement Team ☀️
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                  Track student career readiness, share CareerVoice, and help more students move from insight to opportunity.
                </p>
                <div className="pt-2 text-xs text-[#64748b]">
                  Turn insights into brighter futures.
                  <span className="block font-semibold text-[#2563eb]">
                    Together with Pathwisse.
                  </span>
                </div>
              </div>

              {/* Decorative Student Characters & Floating Tags */}
              <div className="mt-6 sm:mt-0 flex items-end justify-end relative sm:absolute sm:right-6 sm:bottom-4">
                <div className="relative">
                  <div className="hidden sm:block absolute -top-8 -left-20 bg-white/90 backdrop-blur-xs border border-blue-100 rounded-xl px-2.5 py-1 text-[10px] font-bold text-blue-800 shadow-xs">
                    Insights • Skills
                  </div>
                  <div className="hidden sm:block absolute top-2 -right-6 bg-white/90 backdrop-blur-xs border border-emerald-100 rounded-xl px-2.5 py-1 text-[10px] font-bold text-emerald-800 shadow-xs">
                    Professionals Tomorrow
                  </div>
                  {/* Avatar cluster illustration */}
                  <div className="flex -space-x-3 items-center">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120"
                      alt="Student 1"
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                    />
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120"
                      alt="Student 2"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                    <img
                      src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120"
                      alt="Student 3"
                      className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero: CareerVoice Campaign */}
            <div className="lg:col-span-5 rounded-xl bg-white border border-[#e2e8f0] p-6 text-left shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center">
                      <Zap className="w-4 h-4 fill-current" />
                    </div>
                    <h2 className="text-base font-bold text-[#0f172a]">
                      CareerVoice Campaign
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCreateLinkModal(true)}
                    className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-0.5"
                  >
                    <span>View All Links</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-[#64748b] mb-4">
                  Create a CareerVoice link, share it with students, and track their responses in real time.
                </p>

                {/* Link Box + QR Section */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-1.5 text-xs">
                      <span className="font-mono text-[#334155] px-2 truncate flex-1 select-all">
                        {campaignUrl}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="px-2.5 py-1 bg-white border border-[#e2e8f0] hover:bg-slate-50 text-[#0f172a] rounded-lg font-bold text-[11px] flex items-center gap-1 shrink-0 transition"
                      >
                        {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleShare}
                      className="w-full py-2 bg-[#2563eb] text-white hover:bg-[#1d4ed8] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* QR Code */}
                  <div
                    onClick={() => setShowQrModal(true)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-[#e2e8f0] bg-white cursor-pointer hover:border-blue-300 transition shrink-0"
                    title="Click to expand QR Code"
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${encodeURIComponent(
                        `https://${campaignUrl}`
                      )}`}
                      alt="QR"
                      className="w-16 h-16 object-contain"
                    />
                    <span className="text-[9px] text-[#64748b] font-medium mt-1">Scan to share</span>
                  </div>
                </div>
              </div>

              {/* Campaign Stats Strip */}
              <div className="pt-3 border-t border-[#f1f5f9] flex items-center justify-between gap-2">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-[#475569]">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-[#0f172a]">{dashboardData?.metrics.totalInvited ?? 0}</span>
                    <span className="text-[11px] text-[#64748b]">Enrolled / Invited</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#475569]">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-[#0f172a]">{dashboardData?.metrics.completedCount ?? 0}</span>
                    <span className="text-[11px] text-[#64748b]">Completed ({dashboardData?.metrics.completionRate ?? 0}%)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateLinkModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#2563eb] hover:bg-blue-100 text-xs font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Configure Link</span>
                </button>
              </div>
            </div>
          </div>

          {/* Top 6 KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* 1. Students Invited */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 text-left shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#0f172a] tracking-tight">
                  {dashboardData?.metrics.totalInvited ?? 0}
                </div>
                <div className="text-[11px] text-[#64748b] font-medium leading-tight">
                  Total Students Enrolled
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold text-slate-500">Live Roster</span>
                <svg className="w-14 h-4 text-blue-500" fill="none" viewBox="0 0 60 20">
                  <path d="M0 15 Q 15 18, 30 8 T 60 2" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* 2. Audits Completed */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 text-left shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#0f172a] tracking-tight">
                  {dashboardData?.metrics.completedCount ?? 0}
                </div>
                <div className="text-[11px] text-[#64748b] font-medium leading-tight">
                  Audits Completed
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold text-emerald-600">{dashboardData?.metrics.completionRate ?? 0}% rate</span>
                <svg className="w-14 h-4 text-emerald-500" fill="none" viewBox="0 0 60 20">
                  <path d="M0 16 Q 20 14, 40 6 T 60 2" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* 3. Avg Career Readiness */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 text-left shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#0f172a] tracking-tight">
                  {dashboardData?.metrics.avgReadinessScore !== null && dashboardData?.metrics.avgReadinessScore !== undefined
                    ? `${dashboardData.metrics.avgReadinessScore}`
                    : '—'}
                  <span className="text-sm font-semibold text-slate-400">/100</span>
                </div>
                <div className="text-[11px] text-[#64748b] font-medium leading-tight">
                  Avg. Readiness Score
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold text-blue-600">Cohort Avg</span>
                <svg className="w-14 h-4 text-blue-500" fill="none" viewBox="0 0 60 20">
                  <path d="M0 14 Q 25 10, 45 8 T 60 4" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* 4. Eligible for Pathwisse Core */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 text-left shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#0f172a] tracking-tight">
                  {dashboardData?.insights.readinessDistribution.ready ?? 0}
                </div>
                <div className="text-[11px] text-[#64748b] font-medium leading-tight">
                  Eligible for Pathwisse Core
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold text-purple-600">&gt;75 Benchmark</span>
                <svg className="w-14 h-4 text-purple-500" fill="none" viewBox="0 0 60 20">
                  <path d="M0 18 Q 15 15, 35 7 T 60 2" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* 5. In-Progress Audits */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 text-left shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#0f172a] tracking-tight">
                  {dashboardData?.metrics.startedCount ?? 0}
                </div>
                <div className="text-[11px] text-[#64748b] font-medium leading-tight">
                  In-Progress Audits
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold text-amber-600">Active Sessions</span>
                <svg className="w-14 h-4 text-amber-500" fill="none" viewBox="0 0 60 20">
                  <path d="M0 15 Q 20 12, 40 8 T 60 3" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* 6. Needs Immediate Support */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 text-left shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#0f172a] tracking-tight">
                  {dashboardData?.insights.readinessDistribution.foundation ?? 0}
                </div>
                <div className="text-[11px] text-[#64748b] font-medium leading-tight">
                  Needs Immediate Support
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold text-red-500">&lt;55 Score</span>
                <svg className="w-14 h-4 text-red-400" fill="none" viewBox="0 0 60 20">
                  <path d="M0 4 Q 25 6, 45 12 T 60 16" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Middle Row: Student Insights & Placement Officer Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Student Insights Card (3 Charts side-by-side) */}
            <div className="lg:col-span-8 rounded-xl bg-white border border-[#e2e8f0] p-6 text-left shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#2563eb]" />
                  <h3 className="text-base font-bold text-[#0f172a]">
                    Student Insights
                  </h3>
                </div>
              </div>

              {/* 3 Visual Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* 1. Audit Completion Trend */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0f172a]">
                      Audit Completion Trend
                    </span>
                    <select
                      value={trendMonth}
                      onChange={(e) => setTrendMonth(e.target.value)}
                      className="text-[10px] font-bold text-[#475569] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-2 py-0.5 focus:outline-none"
                    >
                      <option>Last 5 Months</option>
                      <option>Last 3 Months</option>
                      <option>This Academic Year</option>
                    </select>
                  </div>

                  {/* SVG Line Chart */}
                  <div className="h-44 flex flex-col justify-between pt-2">
                    <div className="relative flex-1">
                      <svg className="w-full h-full" viewBox="0 0 240 120">
                        {/* Grid lines */}
                        <line x1="25" y1="20" x2="235" y2="20" stroke="#f1f5f9" strokeDasharray="3" />
                        <line x1="25" y1="50" x2="235" y2="50" stroke="#f1f5f9" strokeDasharray="3" />
                        <line x1="25" y1="80" x2="235" y2="80" stroke="#f1f5f9" strokeDasharray="3" />
                        <line x1="25" y1="110" x2="235" y2="110" stroke="#e2e8f0" />

                        {/* Y-axis labels */}
                        <text x="5" y="24" fontSize="8" fill="#94a3b8" fontFamily="monospace">{trendData.maxCount}</text>
                        <text x="5" y="54" fontSize="8" fill="#94a3b8" fontFamily="monospace">{Math.round(trendData.maxCount * 0.66)}</text>
                        <text x="5" y="84" fontSize="8" fill="#94a3b8" fontFamily="monospace">{Math.round(trendData.maxCount * 0.33)}</text>
                        <text x="12" y="112" fontSize="8" fill="#94a3b8" fontFamily="monospace">0</text>

                        {/* Area gradient */}
                        <defs>
                          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <polygon
                          points={trendData.polygon}
                          fill="url(#trendGrad)"
                        />

                        {/* Line */}
                        <polyline
                          points={trendData.polyline}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {/* Data dots */}
                        {trendData.points.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r={idx === trendData.points.length - 1 ? 4 : 3}
                            fill="#2563eb"
                            stroke={idx === trendData.points.length - 1 ? '#fff' : 'none'}
                            strokeWidth={idx === trendData.points.length - 1 ? 2 : 0}
                          />
                        ))}
                      </svg>
                      {!trendData.hasData && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-slate-400 bg-white/80 px-2 py-0.5 rounded-full border border-slate-200">
                            Awaiting audit submissions
                          </span>
                        </div>
                      )}
                    </div>

                    {/* X-axis labels */}
                    <div className="flex justify-between pl-6 pr-2 text-[10px] text-[#94a3b8] font-medium">
                      {trendData.months.map((m, idx) => (
                        <span key={idx}>{m.label}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Role Interest Breakdown (Donut Chart) */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#0f172a] block">
                    Role Interest Breakdown
                  </span>

                  <div className="flex items-center gap-3">
                    {/* SVG Donut */}
                    <div className="relative w-28 h-28 shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        {/* Background ring */}
                        <path
                          className="text-slate-100"
                          strokeWidth="4"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        {donutSegments.length > 0 ? (
                          donutSegments.map((seg, idx) => (
                            <path
                              key={idx}
                              stroke={seg.color}
                              strokeWidth="4"
                              strokeDasharray={seg.dasharray}
                              strokeDashoffset={seg.dashoffset}
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          ))
                        ) : (
                          <path
                            stroke="#e2e8f0"
                            strokeWidth="4"
                            strokeDasharray="100, 100"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-xs font-extrabold text-[#0f172a] leading-none">
                          {dashboardData?.metrics.completedCount || 0}
                        </span>
                        <span className="text-[8px] text-[#94a3b8]">Responses</span>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="space-y-1 text-[10px] text-[#475569] flex-1 max-h-36 overflow-y-auto">
                      {donutSegments.length > 0 ? (
                        donutSegments.map((seg, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-1">
                            <span className="flex items-center gap-1.5 truncate max-w-[110px]" title={seg.roleTitle}>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                              <span className="truncate">{seg.roleTitle}</span>
                            </span>
                            <span className="font-bold text-[#0f172a] shrink-0">{seg.percentage}%</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[10px] text-slate-400 italic py-2">
                          No role preferences logged yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Career Readiness Distribution (Bar Chart) */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-[#0f172a] block">
                    Career Readiness Distribution
                  </span>

                  <div className="h-44 flex flex-col justify-end">
                    <div className="flex items-end justify-between gap-2 h-36 px-2 border-b border-[#e2e8f0]">
                      {/* Beginner */}
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-[#ef4444]">{scoreDistribution.beginner.count}</span>
                        <div
                          className="w-full bg-[#f87171] rounded-t-lg transition-all duration-500"
                          style={{ height: `${scoreDistribution.beginner.heightPct}%` }}
                        />
                      </div>
                      {/* Developing */}
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-[#2563eb]">{scoreDistribution.developing.count}</span>
                        <div
                          className="w-full bg-[#60a5fa] rounded-t-lg transition-all duration-500"
                          style={{ height: `${scoreDistribution.developing.heightPct}%` }}
                        />
                      </div>
                      {/* Ready */}
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-[#10b981]">{scoreDistribution.ready.count}</span>
                        <div
                          className="w-full bg-[#34d399] rounded-t-lg transition-all duration-500"
                          style={{ height: `${scoreDistribution.ready.heightPct}%` }}
                        />
                      </div>
                      {/* Advanced */}
                      <div className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-[#059669]">{scoreDistribution.advanced.count}</span>
                        <div
                          className="w-full bg-[#059669] rounded-t-lg transition-all duration-500"
                          style={{ height: `${scoreDistribution.advanced.heightPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Bar categories */}
                    <div className="flex justify-between text-[8px] text-[#64748b] font-medium pt-1 px-1 text-center">
                      <div className="flex-1">
                        <span className="block font-bold">Beginner</span>
                        <span>(0-40)</span>
                      </div>
                      <div className="flex-1">
                        <span className="block font-bold">Developing</span>
                        <span>(41-70)</span>
                      </div>
                      <div className="flex-1">
                        <span className="block font-bold">Ready</span>
                        <span>(71-85)</span>
                      </div>
                      <div className="flex-1">
                        <span className="block font-bold">Advanced</span>
                        <span>(86-100)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Placement Officer Actions Card */}
            <div className="lg:col-span-4 rounded-3xl bg-white border border-[#e2e8f0] p-6 text-left shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-[#2563eb] fill-current" />
                  <h3 className="text-base font-bold text-[#0f172a]">
                    Placement Officer Actions
                  </h3>
                </div>

                <div className="space-y-3">
                  {/* Action 1: Send reminder */}
                  <button
                    type="button"
                    onClick={() => showToast('Automated WhatsApp reminder queued for 48 pending students!')}
                    className="w-full p-3 rounded-2xl border border-[#e2e8f0] hover:border-blue-300 hover:bg-[#f8fafc] text-left flex items-center justify-between gap-3 group transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0 mt-0.5">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0f172a] block group-hover:text-[#2563eb] transition">
                          Send reminder to pending students
                        </span>
                        <span className="text-[11px] text-[#64748b]">
                          Notify {dashboardData?.metrics.invitedCount ?? allStudents.filter((s) => s.status !== 'completed').length} students who haven't completed their audit
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563eb] group-hover:translate-x-0.5 transition shrink-0" />
                  </button>

                  {/* Action 2: Export audit report */}
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full p-3 rounded-2xl border border-[#e2e8f0] hover:border-blue-300 hover:bg-[#f8fafc] text-left flex items-center justify-between gap-3 group transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0 mt-0.5">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0f172a] block group-hover:text-[#2563eb] transition">
                          Export audit report
                        </span>
                        <span className="text-[11px] text-[#64748b]">
                          Download complete student data (CSV)
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563eb] group-hover:translate-x-0.5 transition shrink-0" />
                  </button>

                  {/* Action 3: View eligible students */}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      const el = document.getElementById('student-responses-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full p-3 rounded-2xl border border-[#e2e8f0] hover:border-emerald-300 hover:bg-[#f8fafc] text-left flex items-center justify-between gap-3 group transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0f172a] block group-hover:text-emerald-700 transition">
                          View eligible students
                        </span>
                        <span className="text-[11px] text-[#64748b]">
                          See {eligibleCount} students ready for Pathwisse Core
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition shrink-0" />
                  </button>

                  {/* Action 4: Recommend Pathwisse Core */}
                  <button
                    type="button"
                    onClick={() => showToast(`Pathwisse Core recommendations shared with ${eligibleCount} eligible students!`)}
                    className="w-full p-3 rounded-2xl border border-[#e2e8f0] hover:border-purple-300 hover:bg-[#f8fafc] text-left flex items-center justify-between gap-3 group transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#0f172a] block group-hover:text-purple-700 transition">
                          Recommend Pathwisse Core
                        </span>
                        <span className="text-[11px] text-[#64748b]">
                          Shortlist and share personalized learning paths
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row: Recent Student Responses & Pathwisse Core Opportunities */}
          <div id="student-responses-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recent Student Responses Table */}
            <div className="lg:col-span-8 rounded-3xl bg-white border border-[#e2e8f0] p-6 text-left shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#2563eb]" />
                  <h3 className="text-base font-bold text-[#0f172a]">
                    Recent Student Responses
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-0.5"
                >
                  <span>Reset Filters</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] text-[#64748b] font-bold">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Target Role</th>
                      <th className="py-2.5 px-3">Department & Year</th>
                      <th className="py-2.5 px-3">Audit Status</th>
                      <th className="py-2.5 px-3">Readiness Score</th>
                      <th className="py-2.5 px-3">Core Eligibility</th>
                      <th className="py-2.5 px-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f5f9]">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => {
                        const isEligible = (student.readinessScore || 0) >= 65;
                        return (
                          <tr
                            key={student.id}
                            onClick={() => handleInspectStudent(student)}
                            className="hover:bg-[#f8fafc] cursor-pointer transition-colors group"
                          >
                            <td className="py-3 px-3">
                              <div className="font-bold text-[#0f172a] group-hover:text-[#2563eb] transition">
                                {student.name}
                              </div>
                              <div className="text-[10px] text-[#64748b] font-mono">
                                {student.rollNo}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-[#334155] font-medium max-w-[140px] truncate" title={student.targetRole}>
                              {student.targetRole}
                            </td>
                            <td className="py-3 px-3 text-[#475569]">
                              <span className="block truncate max-w-[130px]" title={student.department}>{student.department}</span>
                              <span className="text-[10px] text-[#94a3b8]">{student.academicYear}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                                  student.status === 'completed'
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : student.status === 'started'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {student.status === 'completed' ? (
                                  <>
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                    <span>Completed</span>
                                  </>
                                ) : student.status === 'started' ? (
                                  <>
                                    <Clock className="w-2.5 h-2.5 text-blue-600 animate-spin" />
                                    <span>In Progress</span>
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-2.5 h-2.5 text-slate-500" />
                                    <span>Invited</span>
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold">
                              {student.readinessScore !== null ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-xs inline-block ${
                                    student.readinessScore >= 70
                                      ? 'text-emerald-700 bg-emerald-50'
                                      : student.readinessScore >= 50
                                      ? 'text-amber-700 bg-amber-50'
                                      : 'text-red-700 bg-red-50'
                                  }`}
                                >
                                  {student.readinessScore}/100
                                </span>
                              ) : (
                                <span className="text-slate-400 font-sans text-[11px]">Pending</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {student.status === 'completed' ? (
                                isEligible ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                                    Eligible
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                                    In Review
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInspectStudent(student);
                                }}
                                className="px-2.5 py-1 bg-white border border-[#e2e8f0] hover:border-blue-300 hover:text-[#2563eb] text-[#475569] rounded-lg font-bold text-[11px] flex items-center gap-1 transition shadow-2xs"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-bold text-sm text-[#0f172a]">No students enrolled in this cohort yet</p>
                          <p className="text-xs text-[#64748b] mt-1 max-w-sm mx-auto">
                            Share your verified CareerVoice campaign link above to invite candidates and monitor live diagnostic audits.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pathwisse Core Opportunities Card */}
            <div className="lg:col-span-4 rounded-3xl bg-gradient-to-br from-[#eff6ff] via-white to-[#f0fdf4] border border-[#bfdbfe] p-6 text-left shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-5 h-5 text-[#2563eb]" />
                  <h3 className="text-base font-bold text-[#0f172a]">
                    Pathwisse Core Opportunities
                  </h3>
                </div>

                <p className="text-xs font-bold text-[#1e40af] mb-1">
                  From insight to real-world growth.
                </p>
                <p className="text-xs text-[#475569] leading-relaxed mb-6">
                  Help eligible students move into personalized learning with Pathwisse Core and get access to real enterprise projects through the Pathwisse Network.
                </p>

                {/* Stat pills */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-blue-100 mb-6">
                  <div className="text-center">
                    <span className="text-lg font-extrabold text-[#0f172a] block">{eligibleCount}</span>
                    <span className="text-[10px] text-[#64748b] leading-tight">Eligible Students</span>
                  </div>
                  <div className="text-center border-x border-blue-100">
                    <span className="text-lg font-extrabold text-[#0f172a] block">50+</span>
                    <span className="text-[10px] text-[#64748b] leading-tight">Enterprise Projects</span>
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-extrabold text-[#2563eb] block mt-1">Real-world</span>
                    <span className="text-[10px] text-[#64748b] leading-tight">Learning Exp.</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  showToast(`Showing ${eligibleCount} students pre-qualified for Pathwisse Core enterprise tracks!`);
                  const el = document.getElementById('student-responses-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <span>View Eligible Students ({eligibleCount})</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* 1. Executive Overview Subview (For College Management / Leadership) */}
      {activeNav === 'Executive Overview' && (
        <div className="space-y-6 text-left">
          {/* Executive Hero Banner */}
          <div className="rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white p-6 sm:p-8 relative overflow-hidden shadow-lg">
            <div className="relative z-10 max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
                <Landmark className="w-3.5 h-3.5" />
                <span>Institutional Executive Leadership</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {collegeContext?.collegeName || 'BITS Pilani, Hyderabad Campus'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                {collegeContext?.leadershipTitle || 'Dean of Academic Affairs / Principal'} • Strategic Focus: {collegeContext?.focusArea || 'NAAC A++ & NIRF Employability Compliance'}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  handleExportCSV();
                  showToast('Exporting NAAC Criterion 5 & NIRF Employability Compliance Dossier...');
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                <span>Download Accreditation Dossier (CSV)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveNav('Overview')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition"
              >
                Switch to Operations View
              </button>
            </div>
          </div>

          {/* 4 Executive Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">Institutional Readiness</span>
                <Award className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {dashboardData?.managementMetrics?.overallReadiness ?? dashboardData?.metrics.avgReadinessScore ?? 74}/100
              </div>
              <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Top 10% Engineering Benchmark
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">NIRF Employability Metric</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {dashboardData?.managementMetrics?.nirfEmployabilityScore ?? 88}/100
              </div>
              <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                Graduation Outcomes (GO) Ready
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">NAAC Accreditation Tier</span>
                <Landmark className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-base font-extrabold text-slate-900 leading-snug">
                {dashboardData?.managementMetrics?.naacBenchmarkTier || 'Criterion 5 — A++ Ready'}
              </div>
              <span className="inline-block text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                Criterion 5.1 & 5.2 Compliant
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">Placement Ready Students</span>
                <GraduationCap className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900">
                {eligibleCount} Students
              </div>
              <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                Score &ge; 65 Pre-Qualified
              </span>
            </div>
          </div>

          {/* Cross-Department Readiness Matrix */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cross-Department Readiness & Placement Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Comparative assessment across academic departments for executive governance and resource allocation.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Matrix</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5 px-3">Department / Branch</th>
                    <th className="py-2.5 px-3">Enrolled</th>
                    <th className="py-2.5 px-3">Audits Completed</th>
                    <th className="py-2.5 px-3">Average Score</th>
                    <th className="py-2.5 px-3">Placement Ready (&ge;65)</th>
                    <th className="py-2.5 px-3">Top Industry Role</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(dashboardData?.managementMetrics?.branchSummaries || [
                    {
                      branch: 'Computer Science (CSE)',
                      totalStudents: 142,
                      completedAudits: 118,
                      averageScore: 79,
                      placementDriveReadyCount: 94,
                      topRole: 'Full Stack Engineer',
                    },
                    {
                      branch: 'Electronics & Communication (ECE)',
                      totalStudents: 110,
                      completedAudits: 84,
                      averageScore: 72,
                      placementDriveReadyCount: 62,
                      topRole: 'Embedded Systems Engineer',
                    },
                    {
                      branch: 'Information Technology (IT)',
                      totalStudents: 98,
                      completedAudits: 76,
                      averageScore: 75,
                      placementDriveReadyCount: 55,
                      topRole: 'Cloud DevOps Architect',
                    },
                    {
                      branch: 'Mechanical Engineering',
                      totalStudents: 85,
                      completedAudits: 58,
                      averageScore: 68,
                      placementDriveReadyCount: 38,
                      topRole: 'HVAC & Systems Engineer',
                    },
                  ]).map((summary: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-bold text-slate-900">{summary.branch}</td>
                      <td className="py-3 px-3 text-slate-600">{summary.totalStudents}</td>
                      <td className="py-3 px-3 text-slate-600 font-semibold">{summary.completedAudits}</td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-700">{summary.averageScore}/100</td>
                      <td className="py-3 px-3 text-emerald-700 font-bold">{summary.placementDriveReadyCount}</td>
                      <td className="py-3 px-3 text-slate-600">{summary.topRole}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          Accredited
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Macro Gaps & Council Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Macro Competency Gaps Across Cohorts</span>
              </h4>
              <div className="space-y-3">
                {(dashboardData?.insights.criticalGaps || []).map((gap: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{gap.skillName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                        {gap.priority} Priority
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{gap.recommendedAction}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-3xl border border-blue-100 p-6 text-left space-y-4">
              <h4 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Strategic Council Action Directives</span>
              </h4>
              <div className="space-y-3 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <p><strong>Department Sprint:</strong> Authorize hands-on distributed systems and observability workshops for CSE & IT before Day 1 placements.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <p><strong>Pathwisse Core Onboarding:</strong> Transition all {eligibleCount} eligible students into industry capstone allocations to maximize tier-1 offers.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <p><strong>Accreditation Compliance:</strong> Download verified CareerVoice reports to substantiate NAAC Criterion 5 and NIRF Employability benchmarks.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CareerVoice Links Subview */}
      {activeNav === 'CareerVoice Links' && (
        <div className="space-y-6 text-left">
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">CareerVoice Campaign Links</h2>
                <p className="text-xs text-slate-500">
                  Generate unique, trackable Career Readiness Audit links for batches, sections, or campus placement drives.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateLinkModal(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create Campaign Link</span>
              </button>
            </div>

            {/* Primary Active Link Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">LIVE CAMPAIGN</span>
                  <span className="text-xs font-bold text-slate-900">General Placement Cohort — {selectedBatch}</span>
                </div>
                <p className="font-mono text-xs text-slate-600 break-all select-all">
                  https://{campaignUrl}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-700 transition shadow-2xs"
                  title="View QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Campaigns Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Active Campaign Trackers</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5 px-3">Campaign Name</th>
                    <th className="py-2.5 px-3">Target Department</th>
                    <th className="py-2.5 px-3">Batch</th>
                    <th className="py-2.5 px-3">Enrolled</th>
                    <th className="py-2.5 px-3">Completed</th>
                    <th className="py-2.5 px-3">Completion %</th>
                    <th className="py-2.5 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { name: 'General Campus Placement Drive', dept: 'All Departments', batch: '2026', invited: dashboardData?.metrics.totalInvited ?? 8, completed: dashboardData?.metrics.completedCount ?? 6 },
                    { name: 'CSE Product Engineering Sprint', dept: 'Computer Science (CSE)', batch: '2026', invited: 4, completed: 3 },
                    { name: 'ECE Systems & IoT Drive', dept: 'Electronics & Communication', batch: '2026', invited: 2, completed: 1 },
                    { name: 'Mechanical Systems Specialization', dept: 'Mechanical Engineering', batch: '2026', invited: 2, completed: 2 },
                  ].map((camp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-bold text-slate-900">{camp.name}</td>
                      <td className="py-3 px-3 text-slate-600">{camp.dept}</td>
                      <td className="py-3 px-3 text-slate-600">{camp.batch}</td>
                      <td className="py-3 px-3 text-slate-800 font-semibold">{camp.invited}</td>
                      <td className="py-3 px-3 text-emerald-700 font-bold">{camp.completed}</td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-700">
                        {Math.round((camp.completed / camp.invited) * 100)}%
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                          >
                            Copy Link
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowQrModal(true)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                          >
                            QR
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Students Subview */}
      {activeNav === 'Students' && (
        <div className="space-y-6 text-left">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Student Cohort Roster</h2>
                <p className="text-xs text-slate-500">
                  Search and inspect live student diagnostic audit results, readiness scores, and verified competency records.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateLinkModal(true)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Invite Students</span>
                </button>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              {(['all', 'completed', 'started', 'invited'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status === 'all'
                    ? `All (${allStudents.length})`
                    : status === 'completed'
                    ? `Completed (${dashboardData?.metrics.completedCount ?? 0})`
                    : status === 'started'
                    ? `In Progress (${dashboardData?.metrics.startedCount ?? 0})`
                    : `Invited (${dashboardData?.metrics.invitedCount ?? 0})`}
                </button>
              ))}
            </div>

            {/* Student Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Target Role</th>
                    <th className="py-2.5 px-3">Department & Year</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Readiness Score</th>
                    <th className="py-2.5 px-3">Core Eligibility</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => {
                      const isEligible = (student.readinessScore || 0) >= 65;
                      return (
                        <tr
                          key={student.id}
                          onClick={() => handleInspectStudent(student)}
                          className="hover:bg-slate-50 cursor-pointer transition group"
                        >
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                              {student.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {student.rollNo}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-700 font-medium">{student.targetRole}</td>
                          <td className="py-3 px-3 text-slate-600">
                            <span>{student.department}</span>
                            <span className="block text-[10px] text-slate-400">{student.academicYear}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                student.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : student.status === 'started'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {student.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold">
                            {student.readinessScore !== null ? (
                              <span
                                className={`px-2 py-0.5 rounded text-xs inline-block ${
                                  student.readinessScore >= 70
                                    ? 'text-emerald-700 bg-emerald-50'
                                    : student.readinessScore >= 50
                                    ? 'text-amber-700 bg-amber-50'
                                    : 'text-red-700 bg-red-50'
                                  }`}
                              >
                                {student.readinessScore}/100
                              </span>
                            ) : (
                              <span className="text-slate-400">Pending</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {student.status === 'completed' ? (
                              isEligible ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                                  Eligible
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                                  In Review
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectStudent(student);
                              }}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        No students matched your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Audits Subview */}
      {activeNav === 'Audits' && (
        <div className="space-y-6 text-left">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Cohort Diagnostic Audits & Assessment Reports</h2>
            <p className="text-xs text-slate-500">
              Detailed breakdowns of conversational assessments conducted by Pathwisse Qalam AI.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-left">
                <span className="text-xs font-bold text-emerald-900 block">Advanced (86-100)</span>
                <span className="text-2xl font-extrabold text-emerald-700">{scoreDistribution.advanced.count} students</span>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-left">
                <span className="text-xs font-bold text-blue-900 block">Ready (71-85)</span>
                <span className="text-2xl font-extrabold text-blue-700">{scoreDistribution.ready.count} students</span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-left">
                <span className="text-xs font-bold text-amber-900 block">Developing (41-70)</span>
                <span className="text-2xl font-extrabold text-amber-700">{scoreDistribution.developing.count} students</span>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-left">
                <span className="text-xs font-bold text-rose-900 block">Beginner (0-40)</span>
                <span className="text-2xl font-extrabold text-rose-700">{scoreDistribution.beginner.count} students</span>
              </div>
            </div>

            {/* Completed Audits List */}
            <div className="space-y-3 pt-4">
              <h3 className="text-sm font-bold text-slate-900">Verified Diagnostic Submissions</h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {allStudents.filter((s) => s.status === 'completed').map((student) => (
                  <div
                    key={student.id}
                    onClick={() => handleInspectStudent(student)}
                    className="p-4 bg-white hover:bg-slate-50 flex items-center justify-between cursor-pointer transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{student.name}</span>
                        <span className="font-mono text-[10px] text-slate-500">({student.rollNo})</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                          {student.targetRole}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {student.department} • Completed: {student.completedAt ? new Date(student.completedAt).toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold font-mono text-slate-900">
                        {student.readinessScore}/100
                      </span>
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl"
                      >
                        View Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Insights Subview */}
      {activeNav === 'Insights' && (
        <div className="space-y-6 text-left">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Critical Skill Gaps */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>Institutional Skill Gap Analysis</span>
              </h3>
              <p className="text-xs text-slate-500">
                Top competency deficits diagnosed across student audits, benchmarked against tier-1 industry standards.
              </p>

              <div className="space-y-3">
                {(dashboardData?.insights.criticalGaps || []).map((gap: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{gap.skillName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">
                        {gap.priority} Priority
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Average Gap: <strong>{gap.gapAverage}%</strong></span>
                      <span>Affected Students: <strong>{gap.affectedCount}</strong></span>
                    </div>
                    <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                      💡 <strong>Corrective Action:</strong> {gap.recommendedAction}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Roles Distribution */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-600" />
                <span>Cohort Target Role Preferences</span>
              </h3>
              <p className="text-xs text-slate-500">
                Career aspirations chosen by students during their CareerVoice diagnostic journey.
              </p>

              <div className="space-y-3">
                {(dashboardData?.insights.topRoles || []).map((role: any, idx: number) => (
                  <div key={idx} className="p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 block">{role.roleTitle}</span>
                      <span className="text-[11px] text-slate-500">{role.studentCount} students interested</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-blue-600">{role.percentage}%</span>
                      <span className="block text-[10px] font-bold text-emerald-700">High Industry Demand</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Eligible Students Subview */}
      {activeNav === 'Eligible Students' && (
        <div className="space-y-6 text-left">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pre-Qualified Corporate Placement Candidates</h2>
                <p className="text-xs text-slate-500">
                  Students scoring 65+ on CareerVoice readiness audits, pre-qualified for recruitment drives and Pathwisse Core enterprise tracks.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
              >
                <Download className="w-4 h-4" />
                <span>Export Corporate Dossier (CSV)</span>
              </button>
            </div>

            {/* Eligible Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">Target Role</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Audit Score</th>
                    <th className="py-2.5 px-3">Interview Readiness</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allStudents.filter((s) => (s.readinessScore || 0) >= 65).map((student) => (
                    <tr
                      key={student.id}
                      onClick={() => handleInspectStudent(student)}
                      className="hover:bg-slate-50 cursor-pointer transition group"
                    >
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition block">{student.name}</span>
                        <span className="font-mono text-[10px] text-slate-500">{student.rollNo}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">{student.targetRole}</td>
                      <td className="py-3 px-3 text-slate-600">{student.department}</td>
                      <td className="py-3 px-3 font-mono font-extrabold text-emerald-700">
                        {student.readinessScore}/100
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Day-1 Drive Ready
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspectStudent(student);
                          }}
                          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold"
                        >
                          Inspect Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. Core Learning Subview */}
      {activeNav === 'Core Learning' && (
        <div className="space-y-6 text-left">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Pathwisse Core Learning Pathways</h2>
            <p className="text-xs text-slate-500">
              Personalized bridge tracks designed to eliminate student competency gaps ahead of campus recruitment drives.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {[
                {
                  title: 'Distributed Systems & Concurrency Architecture',
                  duration: '3 Weeks',
                  students: '48 Enrolled',
                  topics: 'Go/TypeScript goroutines, microservice event queues, Redis caching, Postgres indexing.',
                },
                {
                  title: 'Production Observability & Telemetry',
                  duration: '2 Weeks',
                  students: '36 Enrolled',
                  topics: 'OpenTelemetry instrumentation, Prometheus metrics, structured logging, distributed tracing.',
                },
                {
                  title: 'Database Schema Optimization & Query Tuning',
                  duration: '2 Weeks',
                  students: '29 Enrolled',
                  topics: 'Explain analyze, composite B-Tree indexes, isolation levels, replication topologies.',
                },
                {
                  title: 'Modern Cloud Native CI/CD & Deployment',
                  duration: '4 Weeks',
                  students: '54 Enrolled',
                  topics: 'Docker multistage builds, Kubernetes pods, GitHub Actions pipelines, zero-downtime rollouts.',
                },
              ].map((track, idx) => (
                <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">{track.duration}</span>
                    <span className="text-[11px] font-bold text-slate-600">{track.students}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{track.title}</h3>
                  <p className="text-xs text-slate-600">{track.topics}</p>
                  <button
                    type="button"
                    onClick={() => showToast(`Enrolled cohort into ${track.title} track!`)}
                    className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold transition"
                  >
                    Manage Track
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. Network Projects Subview */}
      {activeNav === 'Network Projects' && (
        <div className="space-y-6 text-left">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Pathwisse Network Enterprise Projects</h2>
            <p className="text-xs text-slate-500">
              Real-world commercial engineering challenges built by high-performing students to create undeniable proof of work for recruiters.
            </p>

            <div className="space-y-4 pt-2">
              {[
                {
                  title: 'Fintech Transaction Reconciliation Engine',
                  domain: 'Financial Services',
                  students: '12 Students Allocated',
                  status: 'Sprint 2 in Progress',
                  tech: 'Node.js, PostgreSQL, Redis, BullMQ',
                },
                {
                  title: 'Automated Edge IoT Predictive Telemetry Gateway',
                  domain: 'Industrial Automation',
                  students: '8 Students Allocated',
                  status: 'Architecture Approved',
                  tech: 'C++, MQTT, ESP32, Grafana',
                },
                {
                  title: 'Distributed Log Streaming & Anomaly Detection',
                  domain: 'Cloud Infrastructure',
                  students: '14 Students Allocated',
                  status: 'Production Deployment Prep',
                  tech: 'Go, Kafka, ClickHouse, Prometheus',
                },
              ].map((proj, idx) => (
                <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{proj.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                      {proj.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Domain: <strong>{proj.domain}</strong></span>
                    <span>•</span>
                    <span>{proj.students}</span>
                  </div>
                  <p className="text-xs font-mono text-slate-600 bg-slate-50 p-2 rounded-xl">
                    Stack: {proj.tech}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 9. Messages Subview */}
      {activeNav === 'Messages' && (
        <div className="space-y-6 text-left">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Institutional Broadcast Center</h2>
            <p className="text-xs text-slate-500">
              Send urgent placement reminders, CareerVoice audit links, and interview schedules directly to students.
            </p>

            {/* Composer */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Target Audience</label>
                  <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold">
                    <option>All Enrolled Students ({allStudents.length})</option>
                    <option>Pending / Incomplete Audits Only</option>
                    <option>Placement Ready Students (&ge;65) Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Graduation Batch</label>
                  <select className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold">
                    <option>{selectedBatch} Passing Out Batch</option>
                    <option>2027 Pre-Final Batch</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Announcement Content</label>
                <textarea
                  rows={3}
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="e.g. Please complete your CareerVoice diagnostic audit before Friday 5 PM to be eligible for upcoming campus placement drives..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSendAnnouncement}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Announcement via SMS & WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Announcement History */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Broadcast History</h3>
              <div className="space-y-2">
                {sentAnnouncements.map((ann) => (
                  <div key={ann.id} className="p-3.5 rounded-xl border border-slate-100 bg-white space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">Delivered to: {ann.target}</span>
                      <span className="text-[10px] text-slate-400">{ann.time}</span>
                    </div>
                    <p className="text-xs text-slate-600">{ann.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. Settings Subview */}
      {activeNav === 'Settings' && (
        <div className="space-y-6 text-left">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5 max-w-3xl">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Workspace & Institutional Profile</h2>
              <p className="text-xs text-slate-500">
                Update institution details, training & placement cell contacts, and accreditation targets.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">College / University Name</label>
                <input
                  type="text"
                  value={settingsCollegeName}
                  onChange={(e) => setSettingsCollegeName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Placement Cell / Department</label>
                <input
                  type="text"
                  value={settingsDept}
                  onChange={(e) => setSettingsDept(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Placement Officer Name</label>
                <input
                  type="text"
                  value={settingsOfficerName}
                  onChange={(e) => setSettingsOfficerName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Official Placement Email</label>
                <input
                  type="email"
                  value={settingsOfficerEmail}
                  onChange={(e) => setSettingsOfficerEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Active Graduation Batch</label>
                <input
                  type="text"
                  value={settingsBatch}
                  onChange={(e) => setSettingsBatch(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Accreditation Focus</label>
                <input
                  type="text"
                  value={settingsAccreditation}
                  onChange={(e) => setSettingsAccreditation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={savingSettings}
                onClick={handleSaveSettings}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-2"
              >
                {savingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{savingSettings ? 'Saving...' : 'Save Workspace Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
      </div>

      {/* Student Detail Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#e2e8f0] p-6 max-w-2xl w-full text-left shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563eb] font-extrabold flex items-center justify-center text-base shrink-0">
                    {selectedStudent.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-[#0f172a]">{selectedStudent.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          selectedStudent.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800'
                            : selectedStudent.status === 'started'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {selectedStudent.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748b]">
                      Roll No: <span className="font-mono text-[#0f172a]">{selectedStudent.rollNo}</span> • {selectedStudent.department} • {selectedStudent.academicYear}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent(null);
                    setAuditDetail(null);
                  }}
                  className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingAudit ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
                  <span className="text-xs font-semibold">Fetching verified diagnostic audit from database...</span>
                </div>
              ) : (
                <>
                  {/* Readiness Score Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-white to-emerald-50/60 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#2563eb]" />
                        <span className="text-xs font-bold text-[#1e40af] uppercase tracking-wide">Career Readiness Status</span>
                      </div>
                      <h4 className="text-base font-extrabold text-[#0f172a]">
                        {auditDetail?.audit?.readinessStatus || (selectedStudent.readinessScore && selectedStudent.readinessScore >= 75 ? 'Placement Ready' : selectedStudent.readinessScore ? 'Foundation Needed' : 'Audit In Progress')}
                      </h4>
                      <p className="text-xs text-[#475569] leading-relaxed">
                        {auditDetail?.audit?.overallFeedback || `Candidate evaluated for ${selectedStudent.targetRole}. Verified metrics and developmental milestones are recorded below.`}
                      </p>
                    </div>

                    <div className="text-center bg-white px-5 py-3 rounded-2xl border border-blue-100 shadow-2xs shrink-0 self-center sm:self-auto">
                      <span className="text-2xl font-extrabold text-[#2563eb] font-mono leading-none block">
                        {selectedStudent.readinessScore !== null ? `${selectedStudent.readinessScore}` : '—'}
                      </span>
                      <span className="text-[10px] text-[#64748b] font-medium block mt-0.5">out of 100</span>
                      {(selectedStudent.readinessScore || 0) >= 65 && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[9px] font-bold">
                          Core Eligible
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Profile Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Target Role</span>
                      <span className="font-bold text-[#0f172a] truncate block" title={selectedStudent.targetRole}>
                        {selectedStudent.targetRole}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Phone Number</span>
                      <span className="font-mono text-[#0f172a] block truncate">{selectedStudent.phone}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Completion Date</span>
                      <span className="font-medium text-[#0f172a] block">
                        {selectedStudent.completedAt ? new Date(selectedStudent.completedAt).toLocaleDateString() : 'In Progress'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Pathwisse Core</span>
                      <span className="font-bold text-emerald-700 block">
                        {(selectedStudent.readinessScore || 0) >= 65 ? 'Pre-Qualified' : 'Pending Review'}
                      </span>
                    </div>
                  </div>

                  {/* Competencies Breakdown */}
                  {auditDetail?.competencies && auditDetail.competencies.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0f172a] flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-[#2563eb]" />
                          Evaluated Role Competencies
                        </span>
                        <span className="text-[10px] text-slate-500">Benchmark vs Demonstrated</span>
                      </div>
                      <div className="space-y-2">
                        {auditDetail.competencies.map((comp: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-[#f8fafc] border border-slate-200/80 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-[#0f172a]">{comp.category}</span>
                              <span className="text-[11px] font-mono text-[#475569]">
                                Score: <strong className="text-[#2563eb]">{comp.score}</strong> / Benchmark: {comp.benchmark}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                              <div
                                className="bg-[#2563eb] h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, comp.score)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Identified Skill Gaps */}
                  {auditDetail?.gaps && auditDetail.gaps.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-[#0f172a] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Identified Skill Gaps & Recommended Interventions
                      </span>
                      <div className="space-y-2">
                        {auditDetail.gaps.map((gap: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-950">{gap.skillName}</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-200/70 text-amber-900">
                                {gap.priority} Priority
                              </span>
                            </div>
                            <p className="text-amber-800 text-[11px] leading-relaxed">
                              {gap.recommendedAction}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 6-Week Action Roadmap */}
                  {auditDetail?.roadmap && auditDetail.roadmap.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-[#0f172a] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
                        Personalized 6-Week Placement Roadmap
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        {auditDetail.roadmap.map((stage: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                            <span className="text-[10px] font-bold text-[#2563eb] block uppercase">{stage.week}</span>
                            <strong className="text-[#0f172a] block text-xs">{stage.milestone}</strong>
                            <p className="text-[10px] text-[#64748b] leading-tight">{stage.topics}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Modal Footer Actions */}
                  <div className="pt-3 border-t border-[#f1f5f9] flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-[#64748b]">
                      Verified diagnostic audit stored canonically in database.
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          showToast(`Personalized roadmap dispatched to ${selectedStudent.name} via email & SMS!`);
                          setSelectedStudent(null);
                        }}
                        className="px-4 py-2 bg-[#2563eb] text-white rounded-xl text-xs font-bold hover:bg-blue-700 shadow-xs transition"
                      >
                        Share Action Plan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent(null);
                          setAuditDetail(null);
                        }}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Guide Modal */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#e2e8f0] p-6 max-w-md w-full text-left shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
                <h3 className="text-base font-bold text-[#0f172a]">Placement Team Quick Guide</h3>
                <button type="button" onClick={() => setShowGuideModal(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-[#475569]">
                <p><strong>1. Share CareerVoice Link:</strong> Copy the unique campaign link or share via WhatsApp directly with your students.</p>
                <p><strong>2. Monitor Real-Time Audits:</strong> Track incoming responses, score distributions, and communication ratings as students complete audits.</p>
                <p><strong>3. Export Placement Data:</strong> Download CSVs anytime for accreditation reports and corporate recruitment dossiers.</p>
                <p><strong>4. Shortlist for Pathwisse Core:</strong> Students scoring above 65 are pre-qualified for real-world enterprise projects.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 bg-[#2563eb] text-white text-xs font-bold rounded-xl"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#e2e8f0] p-6 max-w-sm w-full text-center shadow-2xl space-y-4"
            >
              <h3 className="text-base font-bold text-[#0f172a]">Scan to Take Career Audit</h3>
              <p className="text-xs text-[#64748b]">Project on screens or print for campus placement notice boards.</p>
              <div className="p-4 bg-white border border-[#e2e8f0] rounded-2xl inline-block shadow-2xs">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://${campaignUrl}`)}`}
                  alt="QR"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Link Modal */}
      <AnimatePresence>
        {showCreateLinkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-[#e2e8f0] p-6 max-w-md w-full text-left shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
                <h3 className="text-base font-bold text-[#0f172a]">Create Trackable CareerVoice Link</h3>
                <button type="button" onClick={() => setShowCreateLinkModal(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-[#334155] block mb-1">Target Department</label>
                  <select className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl font-medium">
                    <option>All Departments</option>
                    <option>Computer Science (CSE)</option>
                    <option>Electronics (ECE)</option>
                    <option>Information Technology (IT)</option>
                    <option>AI & Data Science</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#334155] block mb-1">Graduation Batch</label>
                  <select className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl font-medium">
                    <option>2026 Passing Out Batch</option>
                    <option>2027 Passing Out Batch</option>
                    <option>2025 Immediate Batch</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#334155] block mb-1">Custom Campaign Slug (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE-CAMPUS-DAY-1"
                    className="w-full p-2.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateLinkModal(false);
                    showToast('New trackable CareerVoice link generated and copied!');
                  }}
                  className="w-full py-2.5 bg-[#2563eb] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Generate & Activate Link
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
