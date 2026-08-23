-- Applied to CareerVoice Supabase on 2026-08-23.
create index if not exists audit_sessions_discovery_user_idx on public.audit_sessions(discovery_session_id,user_id);
create index if not exists audit_sessions_recommendation_user_role_idx on public.audit_sessions(recommended_role_id,user_id,target_role_id);
create index if not exists career_discovery_answers_session_user_idx on public.career_discovery_answers(discovery_session_id,user_id);
create index if not exists career_discovery_sessions_branch_id_idx on public.career_discovery_sessions(branch_id);
create index if not exists career_discovery_sessions_profile_id_idx on public.career_discovery_sessions(profile_id);
create index if not exists career_role_recommendations_discovery_user_cover_idx on public.career_role_recommendations(discovery_session_id,user_id);
create index if not exists roadmap_handoffs_role_id_idx on public.roadmap_handoffs(role_id);
