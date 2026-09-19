import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlacementLayout } from '../../layouts/PlacementLayout';
import { useAuth } from '../../context/AuthContext';
import {
  Megaphone,
  Copy,
  Check,
  Plus,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Calendar,
  Users,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  inviteUrl: string;
  createdAt: string;
  studentCount?: number;
  completedCount?: number;
  batch?: string;
  department?: string;
}

export function CampaignsPage() {
  const navigate = useNavigate();
  const { identity, collegeContext } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (collegeContext?.collegeId) params.set('collegeId', collegeContext.collegeId);
      if (identity?.uid) params.set('createdBy', identity.uid);
      const qs = params.toString();
      const res = await fetch(`/api/campaigns${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();
      setCampaigns(Array.isArray(json?.campaigns) ? json.campaigns : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }, [collegeContext?.collegeId, identity?.uid]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCopyLink = async (campaign: Campaign) => {
    try {
      await navigator.clipboard.writeText(campaign.inviteUrl);
      setCopiedId(campaign.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard denied
    }
  };

  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const q = searchQuery.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.batch && c.batch.toLowerCase().includes(q)) ||
        (c.department && c.department.toLowerCase().includes(q))
    );
  }, [campaigns, searchQuery]);

  const totalInvited = useMemo(
    () => campaigns.reduce((acc, c) => acc + (c.studentCount ?? 0), 0),
    [campaigns]
  );
  const totalCompleted = useMemo(
    () => campaigns.reduce((acc, c) => acc + (c.completedCount ?? 0), 0),
    [campaigns]
  );

  return (
    <PlacementLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#0b111d]">
                Placement Campaigns
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {campaigns.length} {campaigns.length === 1 ? 'campaign' : 'campaigns'}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Create student invite campaigns, distribute unique assessment links, and track cohort completion.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={fetchCampaigns}
              title="Refresh list"
              className="p-2.5 bg-white hover:bg-slate-50 border border-[#e2e8f0] text-slate-600 rounded-lg shadow-xs transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/placement/campaigns/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#ea580c] hover:bg-[#c2410c] shadow-xs active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
          </div>
        </div>

        {/* Quick Stats Summary */}
        {campaigns.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Campaigns
                </span>
                <Megaphone className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-[#0b111d] mt-2 font-mono">{campaigns.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Active across departments</p>
            </div>
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Students Invited
                </span>
                <Users className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-2xl font-bold text-[#0b111d] mt-2 font-mono">{totalInvited}</p>
              <p className="text-xs text-slate-500 mt-0.5">Distributed invite links</p>
            </div>
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Completed Audits
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-[#0b111d] mt-2 font-mono">{totalCompleted}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {totalInvited > 0 ? `${Math.round((totalCompleted / totalInvited) * 100)}% cohort completion` : 'Awaiting start'}
              </p>
            </div>
          </div>
        )}

        {/* Search filter if campaigns exist */}
        {campaigns.length > 0 && (
          <div className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-lg px-3.5 py-2 shadow-xs">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter campaigns by name, department, or batch…"
              className="w-full text-sm bg-transparent outline-none text-[#0b111d] placeholder:text-slate-400"
            />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#e2e8f0] rounded-xl shadow-xs">
            <Loader2 className="w-7 h-7 animate-spin text-[#ea580c] mb-3" />
            <span className="text-sm font-medium text-slate-600">Loading placement campaigns…</span>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="bg-red-50/70 border border-red-200 rounded-xl p-5 flex items-start gap-3.5 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">Could not load campaigns</h3>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchCampaigns}
                className="mt-3 text-xs font-semibold text-red-700 hover:text-red-900 underline"
              >
                Try reloading
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && campaigns.length === 0 && (
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-12 flex flex-col items-center text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#ea580c] mb-4">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0b111d]">No active campaigns yet</h3>
            <p className="text-sm text-slate-600 max-w-md mt-1.5 mb-6">
              Create your first student drive campaign to generate shareable invite links and start collecting verified career diagnostic signals.
            </p>
            <button
              onClick={() => navigate('/placement/campaigns/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#ea580c] hover:bg-[#c2410c] shadow-xs active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              Create First Campaign
            </button>
          </div>
        )}

        {/* Search has no results */}
        {!loading && !error && campaigns.length > 0 && filteredCampaigns.length === 0 && (
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-8 text-center shadow-xs">
            <Search className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#0b111d]">No campaigns match &ldquo;{searchQuery}&rdquo;</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs font-semibold text-[#ea580c] hover:underline"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Campaign List */}
        {!loading && !error && filteredCampaigns.length > 0 && (
          <div className="space-y-3.5">
            {filteredCampaigns.map((campaign) => {
              const invited = campaign.studentCount ?? 0;
              const completed = campaign.completedCount ?? 0;
              const pct = invited > 0 ? Math.min(100, Math.round((completed / invited) * 100)) : 0;

              return (
                <div
                  key={campaign.id}
                  className="bg-white border border-[#e2e8f0] hover:border-slate-300 rounded-xl p-5 shadow-xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        Active
                      </span>
                      <h3 className="font-bold text-base text-[#0b111d] truncate">
                        {campaign.name}
                      </h3>
                      {campaign.batch && (
                        <span className="text-xs text-slate-500 font-mono">
                          Batch {campaign.batch}
                        </span>
                      )}
                    </div>

                    {/* Monospace invite link box */}
                    <div className="flex items-center gap-2 mt-2 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 max-w-xl">
                      <span className="text-xs font-medium text-slate-500 flex-shrink-0 select-none">
                        Invite URL:
                      </span>
                      <span className="text-xs font-mono text-slate-700 truncate select-all">
                        {campaign.inviteUrl}
                      </span>
                    </div>

                    {/* Progress Bar & Details */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-xs text-slate-600">
                      <div className="flex items-center gap-2 min-w-[180px]">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-[#ea580c] rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono font-semibold text-slate-700">{pct}%</span>
                      </div>

                      <span className="flex items-center gap-1 text-slate-600">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-900">{completed}</span> of{' '}
                        <span className="font-medium text-slate-900">{invited}</span> completed
                      </span>

                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Created {new Date(campaign.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <a
                      href={campaign.inviteUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Open invite link in new tab"
                      className="p-2.5 rounded-lg border border-[#e2e8f0] text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => handleCopyLink(campaign)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                        copiedId === campaign.id
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-white hover:bg-slate-50 text-[#0b111d] border border-[#e2e8f0]'
                      }`}
                    >
                      {copiedId === campaign.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copied Link</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PlacementLayout>
  );
}
