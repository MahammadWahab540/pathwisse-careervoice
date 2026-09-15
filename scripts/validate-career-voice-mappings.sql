-- CareerVoice production data integrity checks.
-- Unless a section is explicitly marked INFORMATIONAL, any returned row is a
-- defect that must be fixed before claiming full readiness.

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

-- Every published CareerVoice role skill must have exactly one mapping inventory row.
select
  r.slug as role_slug,
  crs.skill_slug,
  crs.skill_name,
  count(m.id) as mapping_count
from public.career_roles r
join public.career_role_skills crs on crs.role_id = r.id
left join public.career_voice_pathwisse_mappings m
  on m.role_id = crs.role_id
 and m.career_voice_skill_slug = crs.skill_slug
where r.status = 'published'
group by r.slug, crs.skill_slug, crs.skill_name
having count(m.id) <> 1;

-- Mapping rows must either be a complete stable mapping or an explicit safe
-- UNMAPPED record. This catches contradictory partial configuration.
select
  r.slug as role_slug,
  m.career_voice_skill_slug,
  m.mapping_status,
  m.pathwisse_skill_id,
  m.pathwisse_stage_ids
from public.career_voice_pathwisse_mappings m
join public.career_roles r on r.id = m.role_id
where r.status = 'published'
  and (
    (m.mapping_status = 'MAPPED' and (
      nullif(btrim(m.pathwisse_skill_id), '') is null
      or cardinality(m.pathwisse_stage_ids) = 0
      or exists (
        select 1
        from unnest(m.pathwisse_stage_ids) as stage_id
        where nullif(btrim(stage_id), '') is null
      )
      or cardinality(m.pathwisse_stage_ids) <> (
        select count(distinct stage_id)
        from unnest(m.pathwisse_stage_ids) as stage_id
      )
    ))
    or (m.mapping_status = 'UNMAPPED' and (
      m.pathwisse_skill_id is not null
      or cardinality(m.pathwisse_stage_ids) <> 0
    ))
  );

-- Stale mapping rows must not silently survive removal of their role skill.
select
  r.slug as role_slug,
  m.career_voice_skill_slug,
  m.career_voice_skill_name
from public.career_voice_pathwisse_mappings m
join public.career_roles r on r.id = m.role_id
left join public.career_role_skills crs
  on crs.role_id = m.role_id
 and crs.skill_slug = m.career_voice_skill_slug
where r.status = 'published'
  and crs.id is null;

-- INFORMATIONAL: unresolved mappings are safe at runtime and must remain
-- explicit. The productionization spec requires mappingStatus="UNMAPPED" and
-- forbids inventing Pathwisse stages when the authoritative catalog is absent.
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

-- Score lineage must remain within the same audit/user and point to the same
-- evidence selected by its primary signal.
select sc.id as score_id
from public.audit_skill_scores sc
join public.audit_skill_signals sig on sig.id = sc.primary_signal_id
join public.audit_evidence ev on ev.id = sc.primary_evidence_id
where sc.session_id <> sig.session_id
   or sc.user_id <> sig.user_id
   or sc.session_id <> ev.session_id
   or sc.user_id <> ev.user_id
   or sig.evidence_id <> sc.primary_evidence_id;

-- Persisted gap values must match their deterministic source score.
select g.id as gap_id
from public.audit_skill_gaps g
join public.audit_skill_scores sc on sc.id = g.score_id
where g.session_id <> sc.session_id
   or g.user_id <> sc.user_id
   or g.expected_score <> sc.expected_score
   or g.demonstrated_score <> sc.demonstrated_score
   or g.gap_score <> greatest(sc.expected_score - sc.demonstrated_score, 0);

-- Every recommendation must resolve to a gap.
select rec.id as recommendation_id
from public.audit_recommendations rec
left join public.audit_skill_gaps g on g.id = rec.gap_id
where g.id is null;
