-- ==============================================================================
-- CareerVoice: Placement Campaigns Table & Policies
-- ==============================================================================

create table if not exists public.campaigns (
    id text primary key,
    name text not null,
    institution text,
    department text,
    batch text,
    graduation_year integer,
    invite_token text unique not null,
    invite_url text,
    status text not null default 'active' check (status in ('active', 'paused', 'expired')),
    expires_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references auth.users(id) on delete set null,
    metadata jsonb not null default '{}'::jsonb
);

-- Performance Indexes
create index if not exists campaigns_invite_token_idx on public.campaigns(invite_token);
create index if not exists campaigns_created_by_idx on public.campaigns(created_by);
create index if not exists campaigns_status_expires_idx on public.campaigns(status, expires_at);

-- Row Level Security
alter table public.campaigns enable row level security;

-- Policy 1: Service role has unrestricted access (used by server.ts backend)
create policy "Service role full access on campaigns"
    on public.campaigns
    for all
    to service_role
    using (true)
    with check (true);

-- Policy 2: Public/Anon can resolve active campaigns via invite token
create policy "Public read active campaigns by token"
    on public.campaigns
    for select
    to anon, authenticated
    using (status = 'active');

-- Policy 3: Authenticated placement officers can manage their own campaigns
create policy "Placement officers can select their campaigns"
    on public.campaigns
    for select
    to authenticated
    using (auth.uid() = created_by);

create policy "Placement officers can create campaigns"
    on public.campaigns
    for insert
    to authenticated
    with check (auth.uid() = created_by or created_by is null);

create policy "Placement officers can update their campaigns"
    on public.campaigns
    for update
    to authenticated
    using (auth.uid() = created_by);
