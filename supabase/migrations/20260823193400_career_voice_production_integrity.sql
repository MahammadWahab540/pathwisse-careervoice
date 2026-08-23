-- Applied to CareerVoice Supabase on 2026-08-23.
-- Canonical discovery -> recommendation -> audit lineage, evidence integrity,
-- one-time CareerVoice access, OTP delivery audit log, and branch catalog.

create table if not exists public.engineering_branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  discipline_group text not null default 'engineering',
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.engineering_branches enable row level security;
drop policy if exists engineering_branches_read on public.engineering_branches;
create policy engineering_branches_read on public.engineering_branches for select to anon, authenticated using (active = true);
drop trigger if exists engineering_branches_set_updated_at on public.engineering_branches;
create trigger engineering_branches_set_updated_at before update on public.engineering_branches for each row execute function private.set_updated_at();

insert into public.engineering_branches (code,name,sort_order) values
 ('CSE','Computer Science & Engineering',10),('IT','Information Technology',20),('ME','Mechanical Engineering',30),
 ('CE','Civil Engineering',40),('ECE','Electronics & Communication Engineering',50),('EEE','Electrical & Electronics Engineering',60),
 ('CHE','Chemical Engineering',70),('AE','Aerospace Engineering',80),('AUTO','Automobile Engineering',90),
 ('BME','Biomedical Engineering',100),('ICE','Instrumentation & Control Engineering',110),('OTHER','Other Engineering',999)
on conflict (code) do update set name=excluded.name, sort_order=excluded.sort_order, active=true;

alter table public.profiles add column if not exists branch_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='profiles_branch_id_fkey') then
    alter table public.profiles add constraint profiles_branch_id_fkey foreign key (branch_id) references public.engineering_branches(id) on delete set null;
  end if;
end $$;
create index if not exists profiles_branch_id_idx on public.profiles(branch_id);

create table if not exists public.career_discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  branch_id uuid references public.engineering_branches(id) on delete set null,
  status text not null default 'created' check (status in ('created','in_progress','completed','cancelled','failed')),
  career_intent text,
  context jsonb not null default '{}'::jsonb,
  idempotency_key text,
  started_at timestamptz not null default now(), completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint career_discovery_sessions_id_user_unique unique(id,user_id)
);
create index if not exists career_discovery_sessions_user_idx on public.career_discovery_sessions(user_id, created_at desc);
create unique index if not exists career_discovery_sessions_user_idempotency_uidx on public.career_discovery_sessions(user_id,idempotency_key) where idempotency_key is not null;
create unique index if not exists career_discovery_sessions_one_active_uidx on public.career_discovery_sessions(user_id) where status in ('created','in_progress');
alter table public.career_discovery_sessions enable row level security;
drop policy if exists career_discovery_sessions_select_own on public.career_discovery_sessions;
create policy career_discovery_sessions_select_own on public.career_discovery_sessions for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists career_discovery_sessions_insert_own on public.career_discovery_sessions;
create policy career_discovery_sessions_insert_own on public.career_discovery_sessions for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists career_discovery_sessions_update_own on public.career_discovery_sessions;
create policy career_discovery_sessions_update_own on public.career_discovery_sessions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop trigger if exists career_discovery_sessions_set_updated_at on public.career_discovery_sessions;
create trigger career_discovery_sessions_set_updated_at before update on public.career_discovery_sessions for each row execute function private.set_updated_at();

create table if not exists public.career_discovery_answers (
  id uuid primary key default gen_random_uuid(),
  discovery_session_id uuid not null references public.career_discovery_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_key text not null,
  sequence_no integer not null check (sequence_no > 0),
  answer_text text,
  answer_json jsonb not null default '{}'::jsonb,
  input_mode text not null default 'voice' check (input_mode in ('voice','text','tap','system')),
  client_answer_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint career_discovery_answers_payload_required check (nullif(btrim(answer_text),'') is not null or answer_json <> '{}'::jsonb),
  constraint career_discovery_answers_session_sequence_unique unique(discovery_session_id,sequence_no),
  constraint career_discovery_answers_session_user_fk foreign key (discovery_session_id,user_id) references public.career_discovery_sessions(id,user_id) on delete cascade
);
create index if not exists career_discovery_answers_user_idx on public.career_discovery_answers(user_id, created_at);
create index if not exists career_discovery_answers_session_idx on public.career_discovery_answers(discovery_session_id, created_at);
create unique index if not exists career_discovery_answers_client_uidx on public.career_discovery_answers(discovery_session_id,client_answer_id) where client_answer_id is not null;
alter table public.career_discovery_answers enable row level security;
drop policy if exists career_discovery_answers_select_own on public.career_discovery_answers;
create policy career_discovery_answers_select_own on public.career_discovery_answers for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists career_discovery_answers_insert_own on public.career_discovery_answers;
create policy career_discovery_answers_insert_own on public.career_discovery_answers for insert to authenticated with check ((select auth.uid())=user_id and exists (select 1 from public.career_discovery_sessions s where s.id=discovery_session_id and s.user_id=(select auth.uid())));

alter table public.career_role_recommendations add column if not exists discovery_session_id uuid;
alter table public.career_role_recommendations add column if not exists selected_at timestamptz;
alter table public.career_role_recommendations alter column session_id drop not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='career_role_recommendations_discovery_session_id_fkey') then
    alter table public.career_role_recommendations add constraint career_role_recommendations_discovery_session_id_fkey foreign key (discovery_session_id) references public.career_discovery_sessions(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='career_role_recommendations_discovery_user_fk') then
    alter table public.career_role_recommendations add constraint career_role_recommendations_discovery_user_fk foreign key (discovery_session_id,user_id) references public.career_discovery_sessions(id,user_id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='career_role_recommendations_source_required') then
    alter table public.career_role_recommendations add constraint career_role_recommendations_source_required check (discovery_session_id is not null or session_id is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname='career_role_recommendations_id_user_role_unique') then
    alter table public.career_role_recommendations add constraint career_role_recommendations_id_user_role_unique unique(id,user_id,role_id);
  end if;
  if not exists (select 1 from pg_constraint where conname='career_role_recommendations_id_user_role_discovery_unique') then
    alter table public.career_role_recommendations add constraint career_role_recommendations_id_user_role_discovery_unique unique(id,user_id,role_id,discovery_session_id);
  end if;
end $$;
create index if not exists career_role_recommendations_discovery_idx on public.career_role_recommendations(discovery_session_id, rank);
create unique index if not exists career_role_recommendations_discovery_role_uidx on public.career_role_recommendations(discovery_session_id,role_id) where discovery_session_id is not null;
create unique index if not exists career_role_recommendations_discovery_rank_uidx on public.career_role_recommendations(discovery_session_id,rank) where discovery_session_id is not null;

alter table public.audit_sessions add column if not exists discovery_session_id uuid;
alter table public.audit_sessions add column if not exists recommended_role_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='audit_sessions_discovery_session_id_fkey') then
    alter table public.audit_sessions add constraint audit_sessions_discovery_session_id_fkey foreign key (discovery_session_id) references public.career_discovery_sessions(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname='audit_sessions_discovery_user_fk') then
    alter table public.audit_sessions add constraint audit_sessions_discovery_user_fk foreign key (discovery_session_id,user_id) references public.career_discovery_sessions(id,user_id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname='audit_sessions_recommended_role_id_fkey') then
    alter table public.audit_sessions add constraint audit_sessions_recommended_role_id_fkey foreign key (recommended_role_id) references public.career_role_recommendations(id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname='audit_sessions_recommendation_user_role_fk') then
    alter table public.audit_sessions add constraint audit_sessions_recommendation_user_role_fk foreign key (recommended_role_id,user_id,target_role_id) references public.career_role_recommendations(id,user_id,role_id) on delete restrict;
  end if;
end $$;
create index if not exists audit_sessions_discovery_session_id_idx on public.audit_sessions(discovery_session_id);
create index if not exists audit_sessions_recommended_role_id_idx on public.audit_sessions(recommended_role_id);
create unique index if not exists audit_sessions_recommendation_once_uidx on public.audit_sessions(recommended_role_id) where recommended_role_id is not null;
create index if not exists audit_sessions_current_competency_skill_id_idx on public.audit_sessions(current_competency_skill_id);

alter table public.audit_evidence add column if not exists idempotency_key text;
create unique index if not exists audit_evidence_session_idempotency_uidx on public.audit_evidence(session_id,idempotency_key) where idempotency_key is not null;
alter table public.audit_skill_signals drop constraint if exists audit_skill_signals_v1_strength_sufficient;
alter table public.audit_skill_signals add constraint audit_skill_signals_v1_strength_sufficient check (contract_version <> 'career-audit:v1' or evidence_strength in ('Strong','Moderate'));

create or replace function private.enforce_career_audit_signal_evidence()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
declare e record;
begin
  if new.contract_version = 'career-audit:v1' then
    select session_id,user_id,evidence_strength into e from public.audit_evidence where id=new.evidence_id;
    if not found then raise exception using errcode='23503', message='Signal requires existing evidence'; end if;
    if e.session_id <> new.session_id or e.user_id <> new.user_id then raise exception using errcode='23514', message='Signal evidence must belong to the same audit and user'; end if;
    if e.evidence_strength not in ('Strong','Moderate') then raise exception using errcode='23514', message='Insufficient evidence cannot produce a demonstrated skill signal'; end if;
  end if;
  return new;
end $$;
drop trigger if exists audit_skill_signals_require_sufficient_evidence on public.audit_skill_signals;
create trigger audit_skill_signals_require_sufficient_evidence before insert or update of evidence_id,evidence_strength,contract_version,session_id,user_id on public.audit_skill_signals for each row execute function private.enforce_career_audit_signal_evidence();
revoke all on function private.enforce_career_audit_signal_evidence() from public, anon, authenticated;

create table if not exists public.roadmap_handoffs (
  id uuid primary key default gen_random_uuid(), audit_id uuid not null references public.audit_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, report_id uuid not null references public.audit_reports(id) on delete restrict,
  role_id uuid references public.career_roles(id) on delete restrict,
  status text not null default 'ready' check (status in ('ready','sent','accepted','failed','cancelled')),
  pathwisse_roadmap_id text, idempotency_key text, payload jsonb not null default '{}'::jsonb, handed_off_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint roadmap_handoffs_audit_unique unique(audit_id), constraint roadmap_handoffs_report_unique unique(report_id),
  constraint roadmap_handoffs_audit_user_fk foreign key (audit_id,user_id) references public.audit_sessions(id,user_id) on delete cascade
);
create index if not exists roadmap_handoffs_user_idx on public.roadmap_handoffs(user_id,created_at desc);
create unique index if not exists roadmap_handoffs_user_idempotency_uidx on public.roadmap_handoffs(user_id,idempotency_key) where idempotency_key is not null;
alter table public.roadmap_handoffs enable row level security;
drop policy if exists roadmap_handoffs_select_own on public.roadmap_handoffs;
create policy roadmap_handoffs_select_own on public.roadmap_handoffs for select to authenticated using ((select auth.uid())=user_id);
drop trigger if exists roadmap_handoffs_set_updated_at on public.roadmap_handoffs;
create trigger roadmap_handoffs_set_updated_at before update on public.roadmap_handoffs for each row execute function private.set_updated_at();

create table if not exists public.auth_delivery_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
  phone_hash text not null, phone_masked text not null, provider text not null default 'meta_whatsapp' check (provider='meta_whatsapp'),
  provider_message_id text, template text not null, status text not null check (status in ('accepted','failed')), error_code text,
  created_at timestamptz not null default now()
);
create index if not exists auth_delivery_logs_user_idx on public.auth_delivery_logs(user_id,created_at desc);
create index if not exists auth_delivery_logs_status_idx on public.auth_delivery_logs(status,created_at desc);
create unique index if not exists auth_delivery_logs_provider_message_uidx on public.auth_delivery_logs(provider_message_id) where provider_message_id is not null;
alter table public.auth_delivery_logs enable row level security;
drop policy if exists auth_delivery_logs_server_only on public.auth_delivery_logs;
create policy auth_delivery_logs_server_only on public.auth_delivery_logs for all to anon,authenticated using(false) with check(false);
revoke all on public.auth_delivery_logs from anon, authenticated;

alter table public.access_passes add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.access_passes add column if not exists payment_reference text;
alter table public.access_passes add column if not exists amount_paise bigint;
alter table public.access_passes add column if not exists purchased_at timestamptz;
alter table public.access_passes add column if not exists access_status text;
alter table public.access_passes add column if not exists purchase_idempotency_key text;
alter table public.access_passes drop constraint if exists access_passes_pass_type_check;
alter table public.access_passes add constraint access_passes_pass_type_check check (pass_type in ('sponsored','percentage','fixed','college','campaign','career_voice_purchase'));
alter table public.access_passes drop constraint if exists access_pass_discount_shape;
alter table public.access_passes add constraint access_pass_discount_shape check (
 (pass_type in ('sponsored','college','campaign') and coalesce(percentage_off,100) between 1 and 100)
 or (pass_type='percentage' and percentage_off between 1 and 100 and fixed_discount_amount is null)
 or (pass_type='fixed' and fixed_discount_amount is not null and percentage_off is null)
 or (pass_type='career_voice_purchase' and percentage_off is null and fixed_discount_amount is null and user_id is not null and amount_paise=30000 and purchased_at is not null and access_status in ('active','refunded','revoked'))
);
alter table public.access_passes add constraint access_passes_amount_paise_check check (amount_paise is null or amount_paise > 0);
alter table public.access_passes add constraint access_passes_access_status_check check (access_status is null or access_status in ('active','refunded','revoked'));
create index if not exists access_passes_user_id_idx on public.access_passes(user_id);
create unique index if not exists access_passes_payment_reference_uidx on public.access_passes(payment_reference) where payment_reference is not null;
create unique index if not exists access_passes_purchase_idempotency_uidx on public.access_passes(purchase_idempotency_key) where purchase_idempotency_key is not null;
create unique index if not exists access_passes_one_active_purchase_uidx on public.access_passes(user_id) where pass_type='career_voice_purchase' and access_status='active';

create or replace function public.grant_career_voice_access_internal(p_user_id uuid,p_payment_reference text,p_idempotency_key text)
returns public.access_passes language plpgsql security invoker set search_path=pg_catalog as $$
declare r public.access_passes;
begin
  if p_user_id is null or nullif(btrim(p_payment_reference),'') is null or nullif(btrim(p_idempotency_key),'') is null then
    raise exception using errcode='22023', message='user, payment reference and idempotency key are required';
  end if;
  select * into r from public.access_passes where purchase_idempotency_key=p_idempotency_key;
  if found then return r; end if;
  insert into public.access_passes(code,pass_type,user_id,payment_reference,amount_paise,purchased_at,access_status,purchase_idempotency_key,active,metadata)
  values ('purchase_'||replace(gen_random_uuid()::text,'-',''),'career_voice_purchase',p_user_id,p_payment_reference,30000,now(),'active',p_idempotency_key,true,jsonb_build_object('product','careervoice_access','billing_type','one_time'))
  returning * into r;
  return r;
end $$;
revoke all on function public.grant_career_voice_access_internal(uuid,text,text) from public, anon, authenticated;
grant execute on function public.grant_career_voice_access_internal(uuid,text,text) to service_role;

create index if not exists career_roadmaps_role_id_idx on public.career_roadmaps(role_id);
create index if not exists competency_benchmarks_role_id_idx on public.competency_benchmarks(role_id);
