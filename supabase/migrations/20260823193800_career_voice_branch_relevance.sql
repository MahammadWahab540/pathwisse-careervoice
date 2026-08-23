-- Applied to CareerVoice Supabase on 2026-08-23.
create table if not exists public.engineering_branch_streams (
  branch_id uuid not null references public.engineering_branches(id) on delete cascade,
  stream_id uuid not null references public.career_streams(id) on delete cascade,
  affinity_score smallint not null check (affinity_score between 0 and 100),
  route_type text not null check (route_type in ('primary','adjacent','cross_track')),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(branch_id,stream_id)
);
create index if not exists engineering_branch_streams_stream_idx on public.engineering_branch_streams(stream_id,affinity_score desc);
alter table public.engineering_branch_streams enable row level security;
drop policy if exists engineering_branch_streams_read on public.engineering_branch_streams;
create policy engineering_branch_streams_read on public.engineering_branch_streams for select to anon,authenticated using(active=true);
grant select on public.engineering_branch_streams to anon,authenticated;
drop trigger if exists engineering_branch_streams_set_updated_at on public.engineering_branch_streams;
create trigger engineering_branch_streams_set_updated_at before update on public.engineering_branch_streams for each row execute function private.set_updated_at();

insert into public.engineering_branch_streams(branch_id,stream_id,affinity_score,route_type)
select b.id,s.id,v.affinity,v.route_type
from (values
 ('CSE','cs_eng',100,'primary'),('CSE','ece_eng',35,'cross_track'),
 ('IT','cs_eng',100,'primary'),
 ('ME','mech_eng',100,'primary'),('ME','robotics_eng',70,'adjacent'),('ME','industrial_eng',65,'adjacent'),('ME','aero_eng',50,'cross_track'),
 ('CE','civil_eng',100,'primary'),('CE','enviro_eng',65,'adjacent'),
 ('ECE','ece_eng',100,'primary'),('ECE','robotics_eng',75,'adjacent'),('ECE','cs_eng',60,'cross_track'),('ECE','ee_eng',55,'adjacent'),
 ('EEE','ee_eng',100,'primary'),('EEE','robotics_eng',75,'adjacent'),('EEE','ece_eng',65,'adjacent'),('EEE','cs_eng',45,'cross_track'),
 ('CHE','chem_eng',100,'primary'),('CHE','enviro_eng',75,'adjacent'),('CHE','materials_eng',55,'adjacent'),
 ('AE','aero_eng',100,'primary'),('AE','mech_eng',75,'adjacent'),('AE','robotics_eng',55,'adjacent'),
 ('AUTO','mech_eng',90,'primary'),('AUTO','robotics_eng',70,'adjacent'),('AUTO','industrial_eng',60,'adjacent'),
 ('BME','biomed_eng',100,'primary'),('BME','ece_eng',55,'adjacent'),('BME','cs_eng',40,'cross_track'),
 ('ICE','robotics_eng',90,'primary'),('ICE','ee_eng',80,'adjacent'),('ICE','ece_eng',70,'adjacent'),('ICE','cs_eng',45,'cross_track')
) as v(branch_code,stream_code,affinity,route_type)
join public.engineering_branches b on b.code=v.branch_code
join public.career_streams s on s.code=v.stream_code
on conflict(branch_id,stream_id) do update set affinity_score=excluded.affinity_score,route_type=excluded.route_type,active=true,updated_at=now();

update public.audit_question_configs
set prompt='Which specific tools, methods, standards, software, instruments, frameworks, or systems did you use in that work? What was the hardest technical problem you personally solved?',
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('branch_aware',true,'avoid_software_bias',true),
    updated_at=now()
where question_key='q_libraries_stack';

insert into public.audit_question_configs(question_key,stage,prompt,input_mode,sort_order,required,active,metadata)
values
 ('d_interests','career_discovery','What kinds of problems or work do you genuinely enjoy solving? Include interests from your own branch and any other field you are seriously considering.','voice',10,true,true,jsonb_build_object('branch_aware',true,'purpose','interests')),
 ('d_technical_exposure','career_discovery','What technical tools, methods, machines, software, labs, standards, programming languages, or engineering systems have you actually used? Tell me what you did with them.','voice',20,true,true,jsonb_build_object('branch_aware',true,'purpose','technical_exposure')),
 ('d_projects','career_discovery','Tell me about one project, lab, internship, competition, or practical task you are proud of. What did you personally own, what problem did you solve, and what was the result?','voice',30,true,true,jsonb_build_object('branch_aware',true,'purpose','project_evidence')),
 ('d_strengths','career_discovery','Outside pure technical knowledge, what are you strongest at: analysis, design, troubleshooting, communication, planning, field work, teamwork, leadership, or something else? Give one example.','voice',40,true,true,jsonb_build_object('branch_aware',true,'purpose','strengths')),
 ('d_career_openness','career_discovery','Do you want to stay close to your engineering branch, explore adjacent roles, consider IT/software roles, or compare all realistic options?','voice',50,true,true,jsonb_build_object('branch_aware',true,'purpose','career_openness','do_not_default_to_software',true))
on conflict(question_key) do update set stage=excluded.stage,prompt=excluded.prompt,input_mode=excluded.input_mode,sort_order=excluded.sort_order,required=excluded.required,active=excluded.active,metadata=excluded.metadata,updated_at=now();
