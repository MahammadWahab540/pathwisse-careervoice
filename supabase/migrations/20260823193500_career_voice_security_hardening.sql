-- Applied to CareerVoice Supabase on 2026-08-23.

drop policy if exists "Allow public read-write for profiles" on public.student_profiles;
drop policy if exists "Allow public read-write for audits" on public.career_audits;
drop policy if exists "Allow public read access on career_roles" on public.career_roles;
drop policy if exists "Allow public read access on career_streams" on public.career_streams;

do $$
declare t text;
begin
  foreach t in array array['student_profiles','career_audits','career_voice_audit_messages','career_voice_audit_sessions','career_voice_legacy_contract_registry','career_voice_pathwisse_mappings','pricing_plans','role_competencies','skill_signals']
  loop
    execute format('drop policy if exists %I on public.%I', t||'_server_only', t);
    execute format('create policy %I on public.%I for all to anon, authenticated using (false) with check (false)', t||'_server_only', t);
  end loop;
end $$;

alter view public.career_voice_mapping_coverage set (security_invoker = true);
alter function public.assert_published_role_has_competency() set search_path = pg_catalog, public;
revoke execute on function public.assert_published_role_has_competency() from public, anon, authenticated;
grant execute on function public.assert_published_role_has_competency() to service_role;

revoke all on public.student_profiles from anon, authenticated;
revoke all on public.career_audits from anon, authenticated;
revoke all on public.career_voice_audit_messages from anon, authenticated;
revoke all on public.career_voice_audit_sessions from anon, authenticated;
revoke all on public.career_voice_legacy_contract_registry from anon, authenticated;
revoke all on public.skill_signals from anon, authenticated;
revoke all on public.pricing_plans from anon, authenticated;
revoke all on public.role_competencies from anon, authenticated;
revoke all on public.career_voice_pathwisse_mappings from anon, authenticated;

grant select on public.engineering_branches to anon,authenticated;
grant select on public.career_streams,public.career_roles,public.career_role_skills,public.colleges,public.audit_question_configs to anon,authenticated;
grant select,insert,update on public.profiles,public.career_discovery_sessions to authenticated;
grant select,insert on public.career_discovery_answers to authenticated;
grant select on public.career_role_recommendations,public.audit_reports,public.audit_skill_signals,public.roadmap_handoffs to authenticated;
grant select,insert,update on public.audit_sessions to authenticated;
grant select,insert on public.audit_messages to authenticated;

create index if not exists career_role_recommendations_user_discovery_idx on public.career_role_recommendations(user_id,discovery_session_id);
create index if not exists roadmap_handoffs_audit_user_idx on public.roadmap_handoffs(audit_id,user_id);
