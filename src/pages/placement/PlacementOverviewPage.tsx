import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlacementLayout } from '../../layouts/PlacementLayout';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Send,
  ChevronRight,
  Compass,
  Check,
  Share2,
  Sparkles,
  X,
  Layers,
  Inbox,
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  rollNo?: string;
  phone?: string;
  department?: string;
  academicYear?: string;
  status: 'completed' | 'started' | 'invited';
  targetRole?: string;
  readinessScore?: number | null;
  completedAt?: string | null;
  auditId?: string | null;
}

interface TopRole {
  roleTitle: string;
  studentCount: number;
  percentage: number;
  demandLevel: string;
}

interface DashboardMetrics {
  totalInvited: number;
  startedCount: number;
  completedCount: number;
  invitedCount: number;
  avgReadinessScore: number | null;
  participationRate: number;
  completionRate: number;
}

interface DashboardData {
  success: boolean;
  college?: {
    id: string;
    name: string;
    placementCell: string;
    targetBatch: string;
  };
  metrics?: DashboardMetrics;
  students?: Student[];
  insights?: {
    topRoles?: TopRole[];
  };
}

interface Campaign {
  id: string;
  name: string;
  inviteUrl: string;
  createdAt: string;
  studentCount?: number;
  completedCount?: number;
  status?: string;
  department?: string;
}

interface ActivityEvent {
  id: string;
  type: 'completed' | 'started' | 'created' | 'reminder';
  title: string;
  detail: string;
  timeAgo: string;
}

const WELCOME_BANNER_KEY = 'careervoice_welcome_banner_dismissed';

export function PlacementOverviewPage() {
  const navigate = useNavigate();
  const { identity, collegeContext } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState(false);

  // Welcome banner dismissal state (initialized from localStorage, synced with Supabase)
  const [welcomeBannerDismissed, setWelcomeBannerDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(WELCOME_BANNER_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const collegeId = collegeContext?.collegeId;
      const userId = identity?.studentId;
      const [dashRes, campRes] = await Promise.all([
        fetch(`/api/college/dashboard${collegeId ? `?collegeId=${encodeURIComponent(collegeId)}` : ''}`),
        fetch(`/api/campaigns?createdBy=${encodeURIComponent(userId || '')}&collegeId=${encodeURIComponent(collegeId || '')}`),
      ]);

      if (!dashRes.ok) throw new Error(`Dashboard API returned ${dashRes.status}`);
      const dashJson: DashboardData = await dashRes.json();
      setData(dashJson);

      if (campRes.ok) {
        const campJson = await campRes.json();
        setCampaigns(Array.isArray(campJson?.campaigns) ? campJson.campaigns : []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load placement overview.');
    } finally {
      setLoading(false);
    }
  }, [collegeContext?.collegeId]);

  // Sync welcome banner preference with Supabase
  useEffect(() => {
    fetchOverview();

    const userId = identity?.studentId;
    if (userId) {
      fetch(`/api/placement/preferences?userId=${encodeURIComponent(userId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((prefData) => {
          if (prefData?.preferences?.welcomeBannerDismissed) {
            setWelcomeBannerDismissed(true);
            try {
              localStorage.setItem(WELCOME_BANNER_KEY, 'true');
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [fetchOverview, identity?.studentId]);

  const handleDismissWelcomeBanner = async () => {
    setWelcomeBannerDismissed(true);
    try {
      localStorage.setItem(WELCOME_BANNER_KEY, 'true');
    } catch {}

    const userId = identity?.studentId;
    if (userId) {
      try {
        await fetch('/api/placement/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, welcomeBannerDismissed: true }),
        });
      } catch {}
    }
  };

  const handleRemind = (studentId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRemindedIds((prev) => new Set([...prev, studentId]));
    setTimeout(() => {
      setRemindedIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }, 3500);
  };

  const handleCopyInvite = async () => {
    const activeCamp = campaigns[0];
    const link = activeCamp?.inviteUrl || window.location.origin + '/login';
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  // Pure live data from Supabase
  const metrics = data?.metrics;
  const rawStudents = data?.students || [];
  const displayStudents: Student[] = rawStudents;

  const hasCampaigns = campaigns.length > 0;
  const activeCampaign: Campaign | null = hasCampaigns ? campaigns[0] : null;

  // Real live metric counts with zero mock fallbacks
  const totalInvitedCount = metrics?.totalInvited ?? rawStudents.length;
  const startedCount = metrics?.startedCount ?? rawStudents.filter((s) => s.status === 'started' || s.status === 'completed').length;
  const completedCount = metrics?.completedCount ?? rawStudents.filter((s) => s.status === 'completed').length;
  const needsFollowupCount = Math.max(0, totalInvitedCount - completedCount);
  const completionPercentage = totalInvitedCount > 0 ? Math.min(100, Math.round((completedCount / totalInvitedCount) * 100)) : 0;

  // Real direction distribution signals dynamically derived from Supabase topRoles
  const directionSignals = (data?.insights?.topRoles || []).map((tr, idx) => {
    const colors = ['#ea580c', '#0b111d', '#0284c7', '#16a34a', '#8b5cf6'];
    return {
      name: tr.roleTitle,
      percent: tr.percentage,
      count: `${tr.studentCount} student${tr.studentCount === 1 ? '' : 's'}`,
      color: colors[idx % colors.length],
    };
  });

  // Real activity events derived from live student status milestones
  const recentActivities: ActivityEvent[] = [];
  rawStudents.forEach((std) => {
    if (std.status === 'completed') {
      recentActivities.push({
        id: `act_${std.id}_done`,
        type: 'completed',
        title: `${std.name} completed CareerVoice`,
        detail: std.targetRole ? `Verified diagnostic: ${std.targetRole}` : 'Diagnostic evidence report generated',
        timeAgo: std.completedAt ? new Date(std.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recent',
      });
    } else if (std.status === 'started') {
      recentActivities.push({
        id: `act_${std.id}_start`,
        type: 'started',
        title: `${std.name} started assessment`,
        detail: std.department ? `${std.department} candidate` : 'Candidate started diagnostic journey',
        timeAgo: 'In progress',
      });
    }
  });

  if (hasCampaigns && campaigns[0]) {
    recentActivities.unshift({
      id: `act_camp_${campaigns[0].id}`,
      type: 'created',
      title: `Campaign active: ${campaigns[0].name}`,
      detail: `Invite link active for ${campaigns[0].department || 'campus candidates'}`,
      timeAgo: campaigns[0].createdAt ? new Date(campaigns[0].createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Active',
    });
  }

  // Welcome banner: dismissible, stops appearing once they've created a CareerVoice or dismissed it
  const showWelcomeBanner = !welcomeBannerDismissed && !hasCampaigns;

  return (
    <PlacementLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-[#0b111d]">
        {/* Outcome-Led Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-[#ea580c] border border-orange-200 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#ea580c] animate-pulse" />
              Placement Operations Control Room
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0b111d]">
              {hasCampaigns ? 'Your students are moving through CareerVoice.' : 'Welcome to CareerVoice Placement Portal'}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748b] max-w-2xl">
              Track campaign progress, student participation, and the signals that need your attention.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {hasCampaigns && (
              <button
                onClick={handleCopyInvite}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-[#e2e8f0] bg-white text-[#334155] hover:bg-[#f8fafc] hover:border-slate-300 transition-all shadow-xs cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-[#ea580c]" />
                    <span>Invite Students</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => navigate('/placement/campaigns/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#ea580c] hover:bg-[#c2410c] shadow-xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{hasCampaigns ? 'Create Campaign' : 'Create First Campaign'}</span>
            </button>

            <button
              onClick={fetchOverview}
              title="Refresh data"
              className="p-2.5 rounded-xl border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0b111d] hover:bg-[#f8fafc] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Welcome Banner for First-Time Users */}
        {showWelcomeBanner && (
          <div className="rounded-xl p-5 bg-[#0b111d] text-white border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden animate-fadeIn">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#ea580c]/20 border border-[#ea580c]/30 text-[#ea580c] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-sm sm:text-base text-white tracking-tight">
                    Welcome to CareerVoice for Placement Teams
                  </h2>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ea580c] text-white uppercase tracking-wider">
                    New Setup
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  CareerVoice is an AI diagnostic engine that assesses student technical readiness through conversational voice & text challenges. It helps your students pinpoint their strongest career path and gives your placement cell verified skill evidence for top recruiters.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
              <button
                onClick={() => navigate('/placement/campaigns/new')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#ea580c] hover:bg-[#c2410c] shadow-xs active:scale-[0.98] transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create your first CareerVoice</span>
              </button>
              <button
                onClick={handleDismissWelcomeBanner}
                aria-label="Dismiss welcome banner"
                title="Dismiss banner"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#ea580c]" />
            <span className="text-xs font-semibold text-[#64748b]">Syncing live campaign signals...</span>
          </div>
        )}

        {/* Error Alert */}
        {!loading && error && (
          <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900">Unable to refresh dashboard signals</p>
              <p className="text-xs text-amber-800">{error}</p>
              <button
                onClick={fetchOverview}
                className="text-xs font-bold text-[#ea580c] hover:underline pt-1 cursor-pointer"
              >
                Retry sync
              </button>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* 1. First-Time Onboarding Flow OR Active Campaign Hero */}
            {!hasCampaigns ? (
              /* First-Time User Onboarding Guide */
              <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-white via-[#fff7ed]/40 to-[#f8fafc] border border-orange-200 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-[#ea580c] border border-orange-200 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      Get Started with CareerVoice
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#0b111d] tracking-tight">
                      Launch your first CareerVoice diagnostic campaign
                    </h2>
                    <p className="text-xs sm:text-sm text-[#64748b] leading-relaxed">
                      Set up a placement diagnostic drive for your passing out batch in under 2 minutes. Students receive an AI-guided voice & text assessment that maps their verified skills to industry benchmark standards.
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('/placement/campaigns/new')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-[#ea580c] hover:bg-[#c2410c] shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create your first CareerVoice</span>
                  </button>
                </div>

                {/* 3 Step Progression Walkthrough */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-2xs space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#ea580c] font-black text-xs flex items-center justify-center border border-orange-100 font-mono">
                      01
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-[#0b111d]">1. Create Campaign</h3>
                    <p className="text-[11px] text-[#64748b] leading-relaxed">
                      Specify your target batch (e.g. 2026), select eligible departments, and generate a secure campaign invite link.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-2xs space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center border border-blue-100 font-mono">
                      02
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-[#0b111d]">2. Share Invite Link</h3>
                    <p className="text-[11px] text-[#64748b] leading-relaxed">
                      Distribute the link across WhatsApp batches, departmental email groups, or placement notices.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-[#e2e8f0] shadow-2xs space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-black text-xs flex items-center justify-center border border-emerald-100 font-mono">
                      03
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-[#0b111d]">3. Track Live Signals</h3>
                    <p className="text-[11px] text-[#64748b] leading-relaxed">
                      Monitor student participation, verified skill scores, career trajectory signals, and recruiter-ready candidate evidence in real time.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Active Campaign Hero Card */
              <div className="rounded-xl p-6 sm:p-7 shadow-xs relative overflow-hidden border border-[#e2e8f0] bg-white">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-3 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        <span>Active Campaign</span>
                      </span>
                      <span className="text-xs font-medium text-[#64748b]">
                        {collegeContext?.collegeName ?? 'Campus Cohort'} · {collegeContext?.targetBatch ?? '2026'} Batch
                      </span>
                    </div>

                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-[#0b111d] tracking-tight">
                        {activeCampaign.name}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#64748b] mt-1">
                        Students are diagnosing career directions and building verified evidence profiles for upcoming campus recruitment drives.
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-[#0b111d]">Assessment Completion</span>
                        <span className="text-[#ea580c] font-mono">{completionPercentage}% Completed</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 bg-[#ea580c]"
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Hero Stats + CTA */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                    <div className="grid grid-cols-3 gap-5 text-left lg:text-right font-mono">
                      <div>
                        <p className="text-xl sm:text-2xl font-extrabold text-[#0b111d]">{totalInvitedCount}</p>
                        <p className="text-[11px] font-sans font-medium text-[#64748b]">Invited</p>
                      </div>
                      <div>
                        <p className="text-xl sm:text-2xl font-extrabold text-[#ea580c]">{startedCount}</p>
                        <p className="text-[11px] font-sans font-medium text-[#64748b]">Started</p>
                      </div>
                      <div>
                        <p className="text-xl sm:text-2xl font-extrabold text-emerald-600">{completedCount}</p>
                        <p className="text-[11px] font-sans font-medium text-[#64748b]">Done</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <button
                        onClick={() => navigate('/placement/campaigns')}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0b111d] transition-all cursor-pointer"
                      >
                        <span>View Campaign</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Key Signals (4 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Students Invited */}
              <div className="rounded-xl p-5 border border-[#e2e8f0] bg-white flex flex-col justify-between gap-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Students Invited</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-[#0b111d]">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-[#0b111d] font-mono">{totalInvitedCount}</p>
                  <p className="text-xs text-[#64748b] mt-1">Target batch candidates</p>
                </div>
              </div>

              {/* Card 2: Assessments Started */}
              <div className="rounded-xl p-5 border border-[#e2e8f0] bg-white flex flex-col justify-between gap-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Assessments Started</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-50 text-[#ea580c]">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-[#ea580c] font-mono">{startedCount}</p>
                  <p className="text-xs text-[#64748b] mt-1">In progress or completed</p>
                </div>
              </div>

              {/* Card 3: Assessments Completed */}
              <div className="rounded-xl p-5 border border-[#e2e8f0] bg-white flex flex-col justify-between gap-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Completed</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-emerald-600 font-mono">{completedCount}</p>
                  <p className="text-xs text-[#64748b] mt-1">Evidence reports generated</p>
                </div>
              </div>

              {/* Card 4: Needs Follow-up */}
              <div className="rounded-xl p-5 border border-[#e2e8f0] bg-white flex flex-col justify-between gap-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Needs Follow-up</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-extrabold text-red-600 font-mono">{needsFollowupCount}</p>
                  <p className="text-xs text-[#64748b] mt-1">Pending start or final step</p>
                </div>
              </div>
            </div>

            {/* 3 & 4: Two-Column Section: Career Direction Signals + Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left (7 cols): Career Direction Signals */}
              <div className="lg:col-span-7 rounded-xl p-6 border border-[#e2e8f0] bg-white shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-[#ea580c]" />
                      <h3 className="font-bold text-base text-[#0b111d]">
                        Career Direction Signals
                      </h3>
                    </div>
                    {directionSignals.length > 0 && (
                      <button
                        onClick={() => navigate('/placement/insights')}
                        className="text-xs font-bold text-[#ea580c] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Cohort Insights
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#64748b] mb-5 leading-relaxed">
                    Aggregate career stream distribution diagnosed across participating students. Identifies where your cohort aims to deploy skills.
                  </p>

                  {/* Distribution bars or Clean Empty State */}
                  {directionSignals.length > 0 ? (
                    <div className="space-y-4">
                      {directionSignals.map((item) => (
                        <div key={item.name} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-[#0b111d]">{item.name}</span>
                            <span className="text-[#64748b] font-mono">
                              {item.percent}% <span className="opacity-70">({item.count})</span>
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${item.percent}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Layers className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-[#0b111d]">No career direction signals yet</p>
                      <p className="text-[11px] text-[#64748b] max-w-sm">
                        As students complete their assessments, CareerVoice maps aggregate career stream distributions across software, AI, core engineering, and systems.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#64748b]">
                  <span>Based on verified student diagnostic responses</span>
                  <span className="font-semibold text-[#0b111d]">CareerVoice Diagnostic Engine</span>
                </div>
              </div>

              {/* Right (5 cols): Recent Activity Feed */}
              <div className="lg:col-span-5 rounded-xl p-6 border border-[#e2e8f0] bg-white shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base text-[#0b111d]">
                      Recent Activity
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Live Feed
                    </span>
                  </div>

                  {recentActivities.length > 0 ? (
                    <div className="space-y-3.5 mt-2">
                      {recentActivities.map((act) => (
                        <div key={act.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{
                              backgroundColor:
                                act.type === 'completed'
                                  ? '#16a34a'
                                  : act.type === 'started'
                                  ? '#ea580c'
                                  : act.type === 'reminder'
                                  ? '#0284c7'
                                  : '#94a3b8',
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-[#0b111d] truncate">{act.title}</p>
                              <span className="text-[10px] text-[#94a3b8] whitespace-nowrap">{act.timeAgo}</span>
                            </div>
                            <p className="text-[11px] text-[#64748b] mt-0.5 truncate">{act.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-bold text-[#0b111d]">No recent activity yet</p>
                      <p className="text-[11px] text-[#64748b] max-w-xs">
                        Real-time candidate milestones (starts, completions, and evidence signals) will stream into this feed as students engage.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => navigate('/placement/messages')}
                    className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-center bg-[#f8fafc] hover:bg-slate-100 border border-[#e2e8f0] text-[#0b111d] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-[#ea580c]" />
                    <span>Send Batch Reminder Nudge</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Students Requiring Attention */}
            <div className="rounded-xl p-6 border border-[#e2e8f0] bg-white shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-[#0b111d]">
                    Students Requiring Attention
                  </h3>
                  <p className="text-xs text-[#64748b]">
                    Operational cohort list of students who have started, stalled, or completed their assessment.
                  </p>
                </div>

                {displayStudents.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('/placement/students')}
                      className="text-xs font-bold text-[#ea580c] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      View All Students ({totalInvitedCount})
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Table / List or Empty State */}
              {displayStudents.length > 0 ? (
                <div className="overflow-x-auto border border-[#e2e8f0] rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#f8fafc] border-b border-[#e2e8f0] text-[#64748b] font-semibold">
                        <th className="py-2.5 px-3">Student</th>
                        <th className="py-2.5 px-3">Campaign</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Last Activity</th>
                        <th className="py-2.5 px-3">Recommended Action</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {displayStudents.slice(0, 6).map((student) => {
                        const isReminded = remindedIds.has(student.id);
                        let recommendedText = 'Send reminder';
                        let statusBadge = { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Invited' };

                        if (student.status === 'completed') {
                          statusBadge = { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Completed' };
                          recommendedText = 'View report';
                        } else if (student.status === 'started') {
                          statusBadge = { bg: 'bg-orange-50', text: 'text-[#ea580c]', border: 'border-orange-200', label: 'Started' };
                          recommendedText = 'Continue assessment';
                        }

                        return (
                          <tr
                            key={student.id}
                            className="hover:bg-[#f8fafc] transition-colors group cursor-pointer"
                            onClick={() => navigate('/placement/students')}
                          >
                            <td className="py-3 px-3">
                              <p className="font-semibold text-[#0b111d]">{student.name}</p>
                              <p className="text-[11px] text-[#64748b]">
                                {student.rollNo || 'Roll Pending'} · {student.department || 'Engineering'}
                              </p>
                            </td>

                            <td className="py-3 px-3 text-[#334155] font-medium">
                              {activeCampaign ? activeCampaign.name.slice(0, 24) + '...' : 'Campus Drive'}
                            </td>

                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                                {statusBadge.label}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-[#64748b]">
                              {student.completedAt
                                ? new Date(student.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                : student.status === 'started'
                                ? 'Active'
                                : 'Invited'}
                            </td>

                            <td className="py-3 px-3 text-[#334155] font-medium">
                              {recommendedText}
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex items-center gap-1.5 justify-end">
                                {student.status === 'completed' ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate('/placement/reports');
                                    }}
                                    className="px-2.5 py-1 rounded-md text-xs font-bold text-white bg-[#0b111d] hover:bg-slate-800 transition-colors cursor-pointer"
                                  >
                                    View
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => handleRemind(student.id, e)}
                                    disabled={isReminded}
                                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                                      isReminded
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-orange-50 text-[#ea580c] border-orange-200 hover:bg-orange-100'
                                    }`}
                                  >
                                    {isReminded ? 'Reminded âœ“' : 'Remind'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-xs">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#0b111d]">No students registered yet</p>
                    <p className="text-xs text-[#64748b] max-w-md">
                      Once students accept your campaign invite link and start their diagnostic assessment, their real-time progress, readiness bands, and target roles will appear here.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={() => navigate('/placement/campaigns/new')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#ea580c] hover:bg-[#c2410c] shadow-xs active:scale-[0.98] transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Campaign to Invite Students</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PlacementLayout>
  );
}
