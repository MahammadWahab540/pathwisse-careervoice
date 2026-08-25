begin;

alter table public.career_roles
  add column if not exists status text not null default 'published';

create table if not exists public.career_role_genomes (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.career_roles(id) on delete cascade,
  domains jsonb not null default '[]'::jsonb,
  preferred_interests jsonb not null default '[]'::jsonb,
  problem_types jsonb not null default '[]'::jsonb,
  work_styles jsonb not null default '[]'::jsonb,
  environments jsonb not null default '[]'::jsonb,
  preferred_evidence jsonb not null default '[]'::jsonb,
  prerequisites jsonb not null default '[]'::jsonb,
  anti_signals jsonb not null default '[]'::jsonb,
  adjacent_role_ids jsonb not null default '[]'::jsonb,
  transition_difficulty integer not null default 5 check (transition_difficulty between 1 and 10),
  market_demand_score integer check (market_demand_score is null or market_demand_score between 0 and 100),
  version integer not null default 1,
  status text not null default 'published' check (status = any (array['draft','published','archived'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, version)
);

create index if not exists career_role_genomes_role_id_idx on public.career_role_genomes(role_id);
create index if not exists career_role_genomes_status_idx on public.career_role_genomes(status);

create table if not exists public.career_discovery_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  discovery_session_id uuid,
  signal_type text not null check (signal_type = any (array[
    'INTEREST',
    'SKILL',
    'PROJECT',
    'STRENGTH',
    'WORK_PREFERENCE',
    'DISLIKE',
    'PROBLEM_STYLE',
    'ENVIRONMENT',
    'CAREER_INTENT',
    'CONSTRAINT'
  ])),
  signal_name text not null,
  confidence numeric not null check (confidence between 0 and 100),
  evidence_level text not null check (evidence_level = any (array['INTEREST','CLAIMED','DEMONSTRATED','VERIFIED'])),
  source_text text not null,
  source_type text not null,
  created_at timestamptz not null default now()
);

create index if not exists career_discovery_signals_user_created_idx on public.career_discovery_signals(user_id, created_at desc);
create index if not exists career_discovery_signals_session_idx on public.career_discovery_signals(discovery_session_id);

create table if not exists public.career_recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  discovery_session_id uuid,
  engine_version text not null,
  candidate_role_ids jsonb not null default '[]'::jsonb,
  input_signal_snapshot jsonb not null default '{}'::jsonb,
  result_snapshot jsonb not null default '[]'::jsonb,
  processing_time_ms integer not null check (processing_time_ms >= 0),
  top_role_id uuid references public.career_roles(id) on delete set null,
  recommendation_confidence numeric not null check (recommendation_confidence between 0 and 100),
  needs_more_discovery boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists career_recommendation_runs_user_created_idx on public.career_recommendation_runs(user_id, created_at desc);
create index if not exists career_recommendation_runs_session_idx on public.career_recommendation_runs(discovery_session_id);

create table if not exists public.career_recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  recommendation_run_id uuid not null references public.career_recommendation_runs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role_id uuid references public.career_roles(id) on delete set null,
  feedback_type text not null check (feedback_type = any (array['INTERESTED','NOT_INTERESTED','SURPRISED','SELECTED','REJECTED'])),
  feedback_score integer check (feedback_score is null or feedback_score between 0 and 10),
  feedback_text text,
  created_at timestamptz not null default now()
);

create index if not exists career_recommendation_feedback_run_idx on public.career_recommendation_feedback(recommendation_run_id);
create index if not exists career_recommendation_feedback_user_created_idx on public.career_recommendation_feedback(user_id, created_at desc);

insert into public.career_role_genomes (
  role_id,
  domains,
  preferred_interests,
  problem_types,
  work_styles,
  environments,
  preferred_evidence,
  prerequisites,
  anti_signals,
  adjacent_role_ids,
  transition_difficulty,
  market_demand_score,
  version,
  status,
  updated_at
)
select
  r.id,
  to_jsonb(array_remove(array[r.category, s.title], null)),
  to_jsonb(array_remove(array[r.title, r.category], null)),
  to_jsonb(array_remove(array[
    case when r.title ~* 'design|cad|bim|pcb|vlsi' then 'design and modelling' end,
    case when r.title ~* 'data|analyst|ml|ai' then 'analysis and pattern discovery' end,
    case when r.title ~* 'embedded|firmware|robotics|devops|software|frontend|backend|full stack' then 'building and debugging systems' end,
    case when r.title ~* 'manufacturing|quality|site|civil|hvac' then 'field execution and process improvement' end
  ], null)),
  to_jsonb(array_remove(array[
    case when r.title ~* 'design|cad|bim|pcb|vlsi' then 'design office work' end,
    case when r.title ~* 'data|analyst|ml|ai' then 'analytical desk work' end,
    case when r.title ~* 'software|frontend|backend|full stack|devops|embedded|firmware' then 'product engineering' end,
    case when r.title ~* 'manufacturing|quality|site|civil|hvac' then 'operations and coordination' end
  ], null)),
  to_jsonb(array_remove(array[
    case when r.title ~* 'site|manufacturing|quality|hvac' then 'field or plant environment' end,
    case when r.title ~* 'software|data|ml|ai|devops' then 'software team environment' end,
    case when r.title ~* 'embedded|firmware|pcb|vlsi|robotics' then 'lab and engineering environment' end,
    case when r.title ~* 'design|cad|bim' then 'design studio environment' end
  ], null)),
  to_jsonb(array_remove(array[
    'project portfolio',
    'internship proof',
    case when r.title ~* 'software|data|ml|ai|devops|frontend|backend|full stack' then 'deployed code or repository' end,
    case when r.title ~* 'design|cad|bim|mechanical|civil' then 'drawings, models, calculations, or simulation files' end,
    case when r.title ~* 'embedded|firmware|pcb|robotics' then 'working prototype, circuit, firmware, or lab debugging evidence' end
  ], null)),
  coalesce(jsonb_agg(distinct crs.skill_name) filter (where crs.skill_name is not null), '[]'::jsonb),
  '[]'::jsonb,
  '[]'::jsonb,
  case
    when r.title ~* 'software|data|ml|ai|devops' and s.title !~* 'computer|software' then 7
    when r.demand_level = 'Extremely High' then 5
    else 4
  end,
  case r.demand_level
    when 'Extremely High' then 90
    when 'High' then 78
    else 60
  end,
  1,
  'published',
  now()
from public.career_roles r
left join public.career_streams s on s.id = r.stream_id
left join public.career_role_skills crs on crs.role_id = r.id
where r.status = 'published'
group by r.id, r.title, r.category, r.demand_level, s.title
on conflict (role_id, version) do update
set domains = excluded.domains,
    preferred_interests = excluded.preferred_interests,
    problem_types = excluded.problem_types,
    work_styles = excluded.work_styles,
    environments = excluded.environments,
    preferred_evidence = excluded.preferred_evidence,
    prerequisites = excluded.prerequisites,
    transition_difficulty = excluded.transition_difficulty,
    market_demand_score = excluded.market_demand_score,
    status = excluded.status,
    updated_at = now();

alter table public.career_role_genomes enable row level security;
alter table public.career_discovery_signals enable row level security;
alter table public.career_recommendation_runs enable row level security;
alter table public.career_recommendation_feedback enable row level security;

commit;
