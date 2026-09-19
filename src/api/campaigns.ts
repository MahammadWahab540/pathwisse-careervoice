
export interface Campaign {
  campaignId: string;
  name: string;
  institution: string;
  department: string;
  batch: string;
  graduationYear: number;
  inviteToken: string;
  inviteUrl: string;
  status: 'active' | 'paused' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export interface CreateCampaignInput {
  name: string;
  institution: string;
  department?: string;
  batch?: string;
  graduationYear?: number;
  expiryDays?: number;
  createdBy?: string;
}

export interface CampaignInvite {
  campaignId: string;
  institution: string;
  department: string;
  batch: string;
  graduationYear: number;
  status: string;
  expiresAt: string;
}

export async function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  const res = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Failed to create campaign (${res.status})`);
  }
  return res.json();
}

export async function listCampaigns(createdBy?: string): Promise<Campaign[]> {
  const url = createdBy ? `/api/campaigns?createdBy=${encodeURIComponent(createdBy)}` : '/api/campaigns';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load campaigns');
  const data = await res.json();
  return data.campaigns || [];
}

export async function resolveInviteToken(token: string): Promise<CampaignInvite> {
  const res = await fetch(`/api/invite/${encodeURIComponent(token)}`);
  if (res.status === 404) throw Object.assign(new Error('Invite not found'), { code: 'NOT_FOUND' });
  if (res.status === 410) throw Object.assign(new Error('Invite has expired'), { code: 'EXPIRED' });
  if (!res.ok) throw new Error('Failed to resolve invite');
  return res.json();
}

export async function updateCampaignStatus(campaignId: string, status: 'active' | 'paused' | 'expired'): Promise<void> {
  const res = await fetch(`/api/campaigns/${campaignId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update campaign');
}
