-- CareerVoice 500 hotfix: align live constraints with the input/status values
-- already emitted by the current server while preserving every existing valid value.
-- This is intentionally additive/compatibility-focused and does not delete data.

begin;

alter table public.audit_messages
  drop constraint if exists audit_messages_input_mode_check;
alter table public.audit_messages
  add constraint audit_messages_input_mode_check
  check (input_mode = any (array[
    'voice'::text,
    'text'::text,
    'type'::text,
    'typed'::text,
    'tap'::text,
    'system'::text
  ]));

alter table public.audit_evidence
  drop constraint if exists audit_evidence_status_check;
alter table public.audit_evidence
  add constraint audit_evidence_status_check
  check (status = any (array[
    'pending'::text,
    'uploaded'::text,
    'verified'::text,
    'rejected'::text,
    'deleted'::text,
    'insufficient'::text,
    'confirmed'::text,
    'evaluated'::text
  ]));

alter table public.audit_sessions
  drop constraint if exists audit_sessions_status_check;
alter table public.audit_sessions
  add constraint audit_sessions_status_check
  check (status = any (array[
    'created'::text,
    'in_progress'::text,
    'ready_for_report'::text,
    'processing'::text,
    'completed'::text,
    'failed'::text,
    'cancelled'::text
  ]));

-- server.ts currently performs a nullable primary_signal_id update on audit_evidence.
-- Keep the field nullable and FK-backed so current main no longer fails on that write.
alter table public.audit_evidence
  add column if not exists primary_signal_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_evidence_primary_signal_id_fkey'
  ) then
    alter table public.audit_evidence
      add constraint audit_evidence_primary_signal_id_fkey
      foreign key (primary_signal_id)
      references public.audit_skill_signals(id)
      on delete set null;
  end if;
end $$;

create index if not exists audit_evidence_primary_signal_idx
  on public.audit_evidence(primary_signal_id)
  where primary_signal_id is not null;

commit;
