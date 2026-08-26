-- Canonical server-owned audit state and attempt lineage.
-- Additive only: existing audit sessions/reports remain intact.

alter table public.audit_sessions
  add column if not exists attempt_id uuid default gen_random_uuid(),
  add column if not exists discovery_session_id uuid,
  add column if not exists current_stage text,
  add column if not exists current_competency_id text,
  add column if not exists current_question_id text,
  add column if not exists follow_up_count integer not null default 0,
  add column if not exists progress jsonb not null default '{"completed":0,"total":0,"percentage":0}'::jsonb,
  add column if not exists state_version integer not null default 0,
  add column if not exists completed_at timestamptz,
  add column if not exists last_activity_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'audit_sessions_follow_up_count_check') then
    alter table public.audit_sessions
      add constraint audit_sessions_follow_up_count_check check (follow_up_count >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'audit_sessions_state_version_check') then
    alter table public.audit_sessions
      add constraint audit_sessions_state_version_check check (state_version >= 0);
  end if;
end $$;

update public.audit_sessions
set attempt_id = coalesce(attempt_id, gen_random_uuid()),
    last_activity_at = coalesce(last_activity_at, updated_at, created_at, now())
where attempt_id is null
   or last_activity_at is null;

create unique index if not exists audit_sessions_attempt_id_uq
  on public.audit_sessions(attempt_id);

create index if not exists audit_sessions_user_role_status_idx
  on public.audit_sessions(user_id, target_role_id, status);

create index if not exists audit_sessions_discovery_session_idx
  on public.audit_sessions(discovery_session_id)
  where discovery_session_id is not null;

create index if not exists audit_sessions_state_lookup_idx
  on public.audit_sessions(id, state_version, status);

create index if not exists audit_sessions_last_activity_idx
  on public.audit_sessions(last_activity_at desc);
