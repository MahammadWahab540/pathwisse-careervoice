-- CareerVoice production data integrity checks.
-- Any returned row represents a configuration defect that must be fixed before claiming full readiness.

-- Published role must have exactly one non-empty competency model.
select
  r.id as role_id,
  r.slug,
  r.title,
  count(rc.id) as competency_model_count,
  coalesce(max(jsonb_array_length(rc.core_competencies)), 0) as competency_count
from public.career_roles r
left join public.role_competencies rc on rc.role_id = r.id
where r.status = 'published'
group by r.id, r.slug, r.title
having count(rc.id) <> 1
   or coalesce(max(jsonb_array_length(rc.core_competencies)), 0) = 0;

-- CareerVoice skills that still lack a stable Pathwisse skill/stage mapping.
select
  r.slug as role_slug,
  r.title as role_title,
  m.career_voice_skill_slug,
  m.career_voice_skill_name,
  m.mapping_status,
  m.pathwisse_skill_id,
  m.pathwisse_stage_ids
from public.career_voice_pathwisse_mappings m
join public.career_roles r on r.id = m.role_id
where r.status = 'published'
  and (
    m.mapping_status <> 'MAPPED'
    or m.pathwisse_skill_id is null
    or cardinality(m.pathwisse_stage_ids) = 0
  )
order by r.title, m.career_voice_skill_name;

-- Canonical v1 signals must always have evidence.
select s.id, s.session_id, s.skill_name
from public.audit_skill_signals s
left join public.audit_evidence e on e.id = s.evidence_id
where s.contract_version = 'career-audit:v1'
  and e.id is null;

-- Every deterministic gap must resolve to score → signal → evidence.
select g.id as gap_id
from public.audit_skill_gaps g
left join public.audit_skill_scores sc on sc.id = g.score_id
left join public.audit_skill_signals sig on sig.id = sc.primary_signal_id
left join public.audit_evidence ev on ev.id = sc.primary_evidence_id
where sc.id is null or sig.id is null or ev.id is null;

-- Every recommendation must resolve to a gap.
select rec.id as recommendation_id
from public.audit_recommendations rec
left join public.audit_skill_gaps g on g.id = rec.gap_id
where g.id is null;
