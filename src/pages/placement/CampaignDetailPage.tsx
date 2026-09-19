import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlacementLayout } from '../../layouts/PlacementLayout';
import { Button, Badge, Card, EmptyState, Skeleton } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import {
  Megaphone,
  Copy,
  Check,
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  Share2,
  TrendingUp,
} from 'lucide-react';

interface CampaignDetail {
  id: string;
  name: string;
  token: string;
  inviteUrl: string;
  department?: string;
  batch?: string;
  year?: string;
  createdAt: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'draft';
  stats: {
    invited: number;
    started: number;
    completed: number;
    completionRate: number;
  };
}

export function CampaignDetailPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { collegeContext } = useAuth();

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    // Simulate / fetch campaign detail
    const timer = setTimeout(() => {
      // Mock / fallback campaign detail
      const token = campaignId ? campaignId.slice(0, 12) : 'cv-tok-2026';
      setCampaign({
        id: campaignId || 'camp-default',
        name: 'CSE 2026 Batch Assessment Drive',
        token,
        inviteUrl: `${window.location.origin}/invite/${token}`,
        department: 'Computer Science and Engineering',
        batch: '2026 Batch',
        year: 'Final Year (4th)',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        status: 'active',
        stats: {
          invited: 142,
          started: 118,
          completed: 94,
          completionRate: 66,
        },
      });
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [campaignId]);

  const handleCopyLink = async () => {
    if (!campaign?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(campaign.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <PlacementLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 selection:bg-[#1f3861] selection:text-white">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#64748b]">
          <button
            type="button"
            onClick={() => navigate('/placement/campaigns')}
            className="flex items-center gap-1.5 font-semibold text-[#1f3861] hover:text-[#0b111d] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Campaigns</span>
          </button>
          <span>/</span>
          <span className="text-[#0b111d] font-medium truncate max-w-[200px]">
            {campaign?.name || 'Campaign Detail'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-6">
            <Skeleton variant="text" className="w-64 h-8" />
            <Skeleton variant="rectangular" className="w-full h-32" />
            <Skeleton variant="rectangular" className="w-full h-64" />
          </div>
        ) : !campaign ? (
          <EmptyState
            title="Campaign Not Found"
            description="The requested campaign could not be located or may have been archived."
            primaryAction={{
              label: 'View All Campaigns',
              onClick: () => navigate('/placement/campaigns'),
            }}
          />
        ) : (
          <>
            {/* Header & Meta Card */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={campaign.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {campaign.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-mono text-[#94a3b8] tabular-nums">
                      Token: {campaign.token}
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-[#0b111d] tracking-tight">
                    {campaign.name}
                  </h1>
                  <p className="text-xs text-[#64748b]">
                    {campaign.department} · {campaign.batch} ({campaign.year})
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleCopyLink}
                    leftIcon={copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  >
                    {copied ? 'Link Copied!' : 'Copy Invite Link'}
                  </Button>
                </div>
              </div>

              {/* Share URL Bar */}
              <div className="mt-6 p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Share2 className="w-4 h-4 text-[#64748b] flex-shrink-0" />
                  <span className="font-mono text-xs text-[#334155] truncate select-all">
                    {campaign.inviteUrl}
                  </span>
                </div>
                <a
                  href={campaign.inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1f3861] hover:bg-white hover:shadow-xs transition-all border border-transparent hover:border-[#cbd5e1]"
                >
                  <span>Test Gate</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Funnel Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-xl bg-white border border-[#e2e8f0] shadow-xs">
                <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider block mb-1">
                  Invited
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#0b111d]">
                  {campaign.stats.invited}
                </div>
                <span className="text-[11px] text-[#94a3b8] mt-1 block">Tokens Issued</span>
              </div>

              <div className="p-5 rounded-xl bg-white border border-[#e2e8f0] shadow-xs">
                <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider block mb-1">
                  Started
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#1f3861]">
                  {campaign.stats.started}
                </div>
                <span className="text-[11px] text-[#94a3b8] mt-1 block">Audits Commenced</span>
              </div>

              <div className="p-5 rounded-xl bg-white border border-[#e2e8f0] shadow-xs">
                <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider block mb-1">
                  Completed
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-700">
                  {campaign.stats.completed}
                </div>
                <span className="text-[11px] text-[#94a3b8] mt-1 block">Diagnosis Generated</span>
              </div>

              <div className="p-5 rounded-xl bg-white border border-[#e2e8f0] shadow-xs">
                <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wider block mb-1">
                  Completion Rate
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-[#ea580c]">
                  {campaign.stats.completionRate}%
                </div>
                <span className="text-[11px] text-[#94a3b8] mt-1 block">Funnel Conversion</span>
              </div>
            </div>

            {/* Campaign Funnel Progression Bar */}
            <div className="p-6 rounded-2xl bg-white border border-[#e2e8f0] shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#334155]">
                <span>Participation Funnel</span>
                <span className="font-mono tabular-nums text-[#0b111d]">
                  {campaign.stats.completed} of {campaign.stats.invited} finished ({campaign.stats.completionRate}%)
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-[#f1f5f9] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1f3861] to-[#ea580c] transition-all duration-500"
                  style={{ width: `${campaign.stats.completionRate}%` }}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </PlacementLayout>
  );
}
