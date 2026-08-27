create table if not exists public.career_voice_transcript_logs (
  id uuid primary key default gen_random_uuid(),
  flow text not null check (flow in ('discovery', 'audit')),
  event_type text not null,
  user_id uuid null,
  external_user_id text null,
  phone text null,
  audit_session_id uuid null references public.audit_sessions(id) on delete set null,
  audit_session_ref text null,
  discovery_session_id uuid null references public.career_discovery_sessions(id) on delete set null,
  discovery_session_ref text null,
  target_role_id uuid null references public.career_roles(id) on delete set null,
  question_key text null,
  actor text not null check (actor in ('user', 'assistant', 'system')),
  content text not null,
  input_mode text null,
  sequence_no integer null,
  client_message_id text null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint career_voice_transcript_logs_identity_chk check (user_id is not null or external_user_id is not null or phone is not null)
);

create index if not exists career_voice_transcript_logs_phone_idx
  on public.career_voice_transcript_logs (phone, occurred_at desc)
  where phone is not null;

create index if not exists career_voice_transcript_logs_external_user_idx
  on public.career_voice_transcript_logs (external_user_id, occurred_at desc)
  where external_user_id is not null;

create index if not exists career_voice_transcript_logs_audit_ref_idx
  on public.career_voice_transcript_logs (audit_session_ref, occurred_at desc)
  where audit_session_ref is not null;

create index if not exists career_voice_transcript_logs_user_flow_idx
  on public.career_voice_transcript_logs (user_id, flow, occurred_at desc)
  where user_id is not null;
