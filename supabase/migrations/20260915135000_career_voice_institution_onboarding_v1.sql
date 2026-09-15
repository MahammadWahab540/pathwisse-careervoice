-- CV-102..CV-105: role-aware onboarding, institution membership, share links, attribution
alter table public.profiles add column if not exists account_role text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='profiles_account_role_check') then
    alter table public.profiles add constraint profiles_account_role_check
      check (account_role is null or account_role in ('student','placement_team','college_management'));
  end if;
end $$;

create table if not exists public.college_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  department text,
  member_role text not null check (member_role in ('placement_team','college_management')),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,college_id,member_role)
);

create table if not exists public.career_voice_share_links (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid() unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  department text, campaign_key text,
  status text not null default 'active' check (status in ('active','revoked','expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.audit_sessions
  add column if not exists share_link_id uuid references public.career_voice_share_links(id) on delete set null,
  add column if not exists college_id uuid references public.colleges(id) on delete set null,
  add column if not exists department text,
  add column if not exists campaign_key text;

create index if not exists college_memberships_user_idx on public.college_memberships(user_id);
create index if not exists college_memberships_college_idx on public.college_memberships(college_id);
create index if not exists career_voice_share_links_college_idx on public.career_voice_share_links(college_id,status);
create index if not exists audit_sessions_college_idx on public.audit_sessions(college_id,status);

alter table public.college_memberships enable row level security;
alter table public.career_voice_share_links enable row level security;

drop policy if exists college_memberships_select_own on public.college_memberships;
create policy college_memberships_select_own on public.college_memberships for select using (auth.uid()=user_id);
drop policy if exists college_memberships_insert_own on public.college_memberships;
create policy college_memberships_insert_own on public.college_memberships for insert with check (auth.uid()=user_id);
drop policy if exists share_links_select_member on public.career_voice_share_links;
create policy share_links_select_member on public.career_voice_share_links for select using (
  exists (select 1 from public.college_memberships m where m.user_id=auth.uid() and m.college_id=career_voice_share_links.college_id and m.status='active')
);
drop policy if exists share_links_insert_member on public.career_voice_share_links;
create policy share_links_insert_member on public.career_voice_share_links for insert with check (
  created_by=auth.uid() and exists (select 1 from public.college_memberships m where m.user_id=auth.uid() and m.college_id=career_voice_share_links.college_id and m.status='active')
);