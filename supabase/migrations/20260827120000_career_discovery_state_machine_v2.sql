begin;

alter table public.profiles
  add column if not exists career_discovery_profile jsonb not null default '{}'::jsonb,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists whatsapp_opt_in boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.career_discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'in_progress',
  current_question_key text,
  current_step integer not null default 0,
  state_version integer not null default 1,
  branch text,
  academic_year integer,
  career_intent text,
  state_machine_version text not null default 'v2',
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.career_discovery_sessions
  add column if not exists current_question_key text,
  add column if not exists current_step integer not null default 0,
  add column if not exists state_version integer not null default 1,
  add column if not exists branch text,
  add column if not exists academic_year integer,
  add column if not exists state_machine_version text not null default 'v2',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'career_discovery_sessions_step_chk') then
    alter table public.career_discovery_sessions
      add constraint career_discovery_sessions_step_chk check (current_step >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'career_discovery_sessions_state_version_chk') then
    alter table public.career_discovery_sessions
      add constraint career_discovery_sessions_state_version_chk check (state_version >= 1);
  end if;
end $$;

create index if not exists career_discovery_sessions_user_idx
  on public.career_discovery_sessions(user_id);

create index if not exists career_discovery_sessions_status_updated_idx
  on public.career_discovery_sessions(status, updated_at desc);

create index if not exists career_discovery_sessions_user_status_updated_idx
  on public.career_discovery_sessions(user_id, status, updated_at desc);

create unique index if not exists career_discovery_sessions_one_active_user_uq
  on public.career_discovery_sessions(user_id)
  where status = 'in_progress';

create table if not exists public.career_discovery_answers (
  id uuid primary key default gen_random_uuid(),
  discovery_session_id uuid not null references public.career_discovery_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key text not null,
  answer_text text,
  answer_data jsonb not null default '{}'::jsonb,
  answer_json jsonb not null default '{}'::jsonb,
  input_mode text not null default 'text',
  sequence_no integer not null,
  client_answer_id text,
  client_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

alter table public.career_discovery_answers
  add column if not exists answer_data jsonb not null default '{}'::jsonb,
  add column if not exists answer_json jsonb not null default '{}'::jsonb,
  add column if not exists client_message_id text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'career_discovery_answers_text_chk') then
    alter table public.career_discovery_answers
      add constraint career_discovery_answers_text_chk
      check (nullif(btrim(answer_text), '') is not null or answer_data <> '{}'::jsonb or answer_json <> '{}'::jsonb);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'career_discovery_answers_sequence_chk') then
    alter table public.career_discovery_answers
      add constraint career_discovery_answers_sequence_chk check (sequence_no >= 1);
  end if;
end $$;

create unique index if not exists career_discovery_answers_client_message_uq
  on public.career_discovery_answers(discovery_session_id, client_message_id)
  where client_message_id is not null;

create unique index if not exists career_discovery_answers_question_uq
  on public.career_discovery_answers(discovery_session_id, question_key);

create index if not exists career_discovery_answers_user_created_idx
  on public.career_discovery_answers(user_id, created_at desc);

create index if not exists career_voice_transcript_logs_discovery_session_idx
  on public.career_voice_transcript_logs(discovery_session_id, sequence_no)
  where discovery_session_id is not null;

create unique index if not exists career_voice_transcript_logs_discovery_client_uq
  on public.career_voice_transcript_logs(discovery_session_id, client_message_id, event_type)
  where discovery_session_id is not null and client_message_id is not null and flow = 'discovery';

alter table public.career_discovery_sessions enable row level security;
alter table public.career_discovery_answers enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'career_discovery_sessions' and policyname = 'career_discovery_sessions_select_own') then
    create policy career_discovery_sessions_select_own
      on public.career_discovery_sessions
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'career_discovery_answers' and policyname = 'career_discovery_answers_select_own') then
    create policy career_discovery_answers_select_own
      on public.career_discovery_answers
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

commit;
