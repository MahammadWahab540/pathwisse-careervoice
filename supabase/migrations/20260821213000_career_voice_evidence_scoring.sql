begin;

-- Extend the existing role benchmark model to cover every readiness dimension.
alter table public.role_competencies
  add column if not exists placement_weight numeric not null default 0.10,
  add column if not exists updated_at timestamptz not null default now();

update public.role_competencies
set technical_weight = 0.30,
    project_weight = 0.20,
    placement_weight = 0.10,
    updated_at = now();

-- Raw interview evidence belongs in the normalized evidence ledger as well as file uploads.
alter table public.audit_evidence
  alter column storage_path drop not null,
  add column if not exists source_message_id uuid references public.audit_messages(id) on delete set null,
  add column if not exists raw_text text,
  add column if not exists evidence_strength text,
  add column if not exists source text,
  add column if not exists claimed_level text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'audit_evidence_payload_required') then
    alter table public.audit_evidence
      add constraint audit_evidence_payload_required
      check (storage_path is not null or nullif(btrim(raw_text), '') is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'audit_evidence_strength_check') then
    alter table public.audit_evidence
      add constraint audit_evidence_strength_check
      check (evidence_strength is null or evidence_strength = any (array['Strong','Moderate','Weak','None']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'audit_evidence_source_check') then
    alter table public.audit_evidence
      add constraint audit_evidence_source_check
      check (source is null or source = any (array['voice_probe','typed_probe','resume','project','github','document']));
  end if;
end $$;

create index if not exists audit_evidence_source_message_idx on public.audit_evidence(source_message_id);
create index if not exists audit_evidence_session_created_idx on public.audit_evidence(session_id, created_at);

-- Canonical v1 skill-signal contract. Legacy columns remain for backward compatibility.
alter table public.audit_skill_signals
  add column if not exists evidence_id uuid references public.audit_evidence(id) on delete restrict,
  add column if not exists claimed_level text,
  add column if not exists extracted_level text,
  add column if not exists confidence_score numeric,
  add column if not exists evidence_strength text,
  add column if not exists raw_answer_snippet text,
  add column if not exists source text,
  add column if not exists contract_version text not null default 'legacy';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'audit_skill_signals_confidence_score_check') then
    alter table public.audit_skill_signals
      add constraint audit_skill_signals_confidence_score_check
      check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'audit_skill_signals_evidence_strength_check') then
    alter table public.audit_skill_signals
      add constraint audit_skill_signals_evidence_strength_check
      check (evidence_strength is null or evidence_strength = any (array['Strong','Moderate','Weak','None']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'audit_skill_signals_source_check') then
    alter table public.audit_skill_signals
      add constraint audit_skill_signals_source_check
      check (source is null or source = any (array['voice_probe','typed_probe','resume','project','github','document']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'audit_skill_signals_v1_evidence_required') then
    alter table public.audit_skill_signals
      add constraint audit_skill_signals_v1_evidence_required
      check (
        contract_version <> 'career-audit:v1'
        or (
          evidence_id is not null
          and nullif(btrim(extracted_level), '') is not null
          and confidence_score is not null
          and evidence_strength is not null
          and nullif(btrim(raw_answer_snippet), '') is not null
          and source is not null
        )
      );
  end if;
end $$;

create unique index if not exists audit_skill_signals_idempotency_key_uq
  on public.audit_skill_signals(idempotency_key)
  where idempotency_key is not null;
create index if not exists audit_skill_signals_evidence_idx on public.audit_skill_signals(evidence_id);

-- Deterministic scoring rows. A score cannot exist without a persisted signal and evidence.
create table if not exists public.audit_skill_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.audit_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.career_roles(id) on delete restrict,
  skill_id text not null,
  skill_name text not null,
  expected_score smallint not null check (expected_score between 0 and 100),
  demonstrated_score smallint not null check (demonstrated_score between 0 and 100),
  primary_signal_id uuid not null references public.audit_skill_signals(id) on delete restrict,
  primary_evidence_id uuid not null references public.audit_evidence(id) on delete restrict,
  confidence_score numeric not null check (confidence_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, skill_id)
);

-- A gap cannot exist without a benchmarked deterministic score.
create table if not exists public.audit_skill_gaps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.audit_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score_id uuid not null unique references public.audit_skill_scores(id) on delete cascade,
  expected_score smallint not null check (expected_score between 0 and 100),
  demonstrated_score smallint not null check (demonstrated_score between 0 and 100),
  gap_score smallint not null check (gap_score between 0 and 100),
  priority_weight numeric not null check (priority_weight >= 0),
  weighted_gap numeric not null check (weighted_gap >= 0),
  priority text not null check (priority = any (array['Critical','High','Medium','Low'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Stable mapping source of truth. No name-only runtime matching is allowed.
create table if not exists public.career_voice_pathwisse_mappings (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.career_roles(id) on delete cascade,
  career_voice_skill_slug text not null,
  career_voice_skill_name text not null,
  pathwisse_skill_id text,
  pathwisse_stage_ids text[] not null default '{}',
  mapping_status text not null default 'UNMAPPED' check (mapping_status = any (array['MAPPED','UNMAPPED'])),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, career_voice_skill_slug),
  constraint career_voice_pathwisse_mapping_integrity check (
    mapping_status = 'UNMAPPED'
    or (nullif(btrim(pathwisse_skill_id), '') is not null and cardinality(pathwisse_stage_ids) > 0)
  )
);

-- A recommendation always points to a concrete persisted gap.
create table if not exists public.audit_recommendations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.audit_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  gap_id uuid not null references public.audit_skill_gaps(id) on delete cascade,
  rank integer not null check (rank > 0),
  recommended_action text not null,
  reason text not null,
  mapping_id uuid references public.career_voice_pathwisse_mappings(id) on delete set null,
  mapping_status text not null check (mapping_status = any (array['MAPPED','UNMAPPED'])),
  pathwisse_skill_id text,
  recommended_stage_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (session_id, gap_id)
);

create index if not exists audit_skill_scores_session_idx on public.audit_skill_scores(session_id);
create index if not exists audit_skill_gaps_session_priority_idx on public.audit_skill_gaps(session_id, priority, weighted_gap desc);
create index if not exists audit_recommendations_session_rank_idx on public.audit_recommendations(session_id, rank);
create index if not exists career_voice_pathwisse_mapping_role_idx on public.career_voice_pathwisse_mappings(role_id);

alter table public.audit_reports
  add column if not exists readiness_status text,
  add column if not exists hiring_benchmark smallint,
  add column if not exists distance_from_benchmark smallint,
  add column if not exists role_fit_reasons jsonb not null default '[]'::jsonb,
  add column if not exists evidence_ledger jsonb not null default '[]'::jsonb,
  add column if not exists report_version text not null default 'career-audit-report:v1';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'audit_reports_readiness_status_check') then
    alter table public.audit_reports
      add constraint audit_reports_readiness_status_check
      check (readiness_status is null or readiness_status = any (array['Ready','Nearly Ready','Developing','Early Stage']));
  end if;
end $$;

-- Keep the legacy table structurally capable of preserving raw evidence while new code moves to audit_skill_signals.
alter table public.skill_signals
  add column if not exists student_id uuid,
  add column if not exists raw_answer_snippet text,
  add column if not exists idempotency_key text;
create unique index if not exists skill_signals_idempotency_key_uq
  on public.skill_signals(idempotency_key)
  where idempotency_key is not null;

-- Build one benchmark model for every published role directly from the canonical role-skill catalog.
insert into public.role_competencies (
  role_id,
  minimum_readiness_benchmark,
  clarity_weight,
  technical_weight,
  project_weight,
  communication_weight,
  execution_weight,
  placement_weight,
  core_competencies,
  roadmap_template,
  updated_at
)
select
  r.id,
  75,
  0.10,
  0.30,
  0.20,
  0.15,
  0.15,
  0.10,
  jsonb_agg(
    jsonb_build_object(
      'skillId', crs.id::text,
      'skillSlug', crs.skill_slug,
      'skillName', crs.skill_name,
      'category', 'Role Competency',
      'requiredLevel', coalesce(crs.required_level, 'Intermediate'),
      'expectedScore', case lower(coalesce(crs.required_level, 'Intermediate'))
        when 'beginner' then 55
        when 'advanced' then 85
        when 'expert' then 95
        else 70
      end,
      'importanceWeight', least(greatest(crs.weight::numeric, 0), 1),
      'dependencyWeight', 0.80,
      'employabilityWeight', 0.90,
      'description', format('Demonstrate evidence of %s at the %s level.', crs.skill_name, coalesce(crs.required_level, 'Intermediate'))
    ) order by crs.sort_order, crs.skill_name
  ),
  '[]'::jsonb,
  now()
from public.career_roles r
join public.career_role_skills crs on crs.role_id = r.id
where r.status = 'published'
group by r.id
on conflict (role_id) do update
set minimum_readiness_benchmark = excluded.minimum_readiness_benchmark,
    clarity_weight = excluded.clarity_weight,
    technical_weight = excluded.technical_weight,
    project_weight = excluded.project_weight,
    communication_weight = excluded.communication_weight,
    execution_weight = excluded.execution_weight,
    placement_weight = excluded.placement_weight,
    core_competencies = excluded.core_competencies,
    updated_at = now();

-- Seed mapping inventory as explicitly UNMAPPED. Stable Pathwisse IDs must be supplied, never invented.
insert into public.career_voice_pathwisse_mappings (
  role_id,
  career_voice_skill_slug,
  career_voice_skill_name,
  mapping_status
)
select crs.role_id, crs.skill_slug, crs.skill_name, 'UNMAPPED'
from public.career_role_skills crs
join public.career_roles r on r.id = crs.role_id and r.status = 'published'
on conflict (role_id, career_voice_skill_slug) do nothing;

-- Server-only tables: service role bypasses RLS, browser clients receive no implicit access.
alter table public.audit_skill_scores enable row level security;
alter table public.audit_skill_gaps enable row level security;
alter table public.audit_recommendations enable row level security;
alter table public.career_voice_pathwisse_mappings enable row level security;

-- Deferred invariant: a role cannot finish a transaction in published state without a non-empty competency model.
create or replace function public.assert_published_role_has_competency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and not exists (
    select 1
    from public.role_competencies rc
    where rc.role_id = new.id
      and jsonb_typeof(rc.core_competencies) = 'array'
      and jsonb_array_length(rc.core_competencies) > 0
  ) then
    raise exception 'Published career role % requires exactly one non-empty competency model', new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists career_roles_require_competency on public.career_roles;
create constraint trigger career_roles_require_competency
after insert or update of status on public.career_roles
deferrable initially deferred
for each row execute function public.assert_published_role_has_competency();

commit;
