-- Applied to CareerVoice Supabase on 2026-08-23.
create or replace function public.persist_verified_evidence_signal_internal(
  p_user_id uuid,
  p_session_id uuid,
  p_skill_name text,
  p_extracted_level text,
  p_confidence_score numeric,
  p_evidence_strength text,
  p_raw_answer text,
  p_source text,
  p_source_message_id uuid,
  p_idempotency_key text,
  p_claimed_level text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_session public.audit_sessions%rowtype;
  v_evidence_id uuid;
  v_signal_id uuid;
  v_skill_slug text;
begin
  if p_user_id is null or p_session_id is null then raise exception using errcode='22023', message='user_id and audit_id are required'; end if;
  if nullif(btrim(p_idempotency_key),'') is null then raise exception using errcode='22023', message='idempotency_key is required'; end if;
  if nullif(btrim(p_skill_name),'') is null or nullif(btrim(p_raw_answer),'') is null then raise exception using errcode='22023', message='skill_name and raw_answer are required'; end if;
  if p_evidence_strength not in ('Strong','Moderate') then raise exception using errcode='22023', message='insufficient evidence cannot produce a skill signal'; end if;
  if p_source not in ('voice_probe','typed_probe','resume','project','github','document') then raise exception using errcode='22023', message='invalid evidence source'; end if;
  if p_confidence_score < 0 or p_confidence_score > 100 then raise exception using errcode='22023', message='confidence_score must be 0..100'; end if;

  select * into v_session from public.audit_sessions where id=p_session_id and user_id=p_user_id for update;
  if not found then raise exception using errcode='22023', message='audit session not found for user'; end if;

  select id,evidence_id into v_signal_id,v_evidence_id
  from public.audit_skill_signals
  where session_id=p_session_id and idempotency_key=p_idempotency_key;
  if found then return jsonb_build_object('evidence_id',v_evidence_id,'signal_id',v_signal_id,'idempotent',true); end if;

  insert into public.audit_evidence(session_id,user_id,evidence_type,source_message_id,raw_text,evidence_strength,source,claimed_level,status,metadata,idempotency_key)
  values(p_session_id,p_user_id,'student_answer',p_source_message_id,p_raw_answer,p_evidence_strength,p_source,p_claimed_level,'verified',coalesce(p_metadata,'{}'::jsonb),p_idempotency_key)
  on conflict (session_id,idempotency_key) where idempotency_key is not null
  do update set updated_at=public.audit_evidence.updated_at
  returning id into v_evidence_id;

  v_skill_slug := regexp_replace(lower(btrim(p_skill_name)),'[^a-z0-9]+','_','g');
  v_skill_slug := trim(both '_' from v_skill_slug);

  insert into public.audit_skill_signals(session_id,user_id,role_id,skill_slug,skill_name,level,confidence,source_message_id,idempotency_key,evidence_summary,metadata,evidence_id,claimed_level,extracted_level,confidence_score,evidence_strength,raw_answer_snippet,source,contract_version)
  values(p_session_id,p_user_id,v_session.target_role_id,v_skill_slug,p_skill_name,p_extracted_level,p_confidence_score/100,p_source_message_id,p_idempotency_key,p_raw_answer,coalesce(p_metadata,'{}'::jsonb),v_evidence_id,p_claimed_level,p_extracted_level,p_confidence_score,p_evidence_strength,p_raw_answer,p_source,'career-audit:v1')
  returning id into v_signal_id;

  update public.audit_sessions set status='in_progress',last_activity_at=now(),updated_at=now() where id=p_session_id;
  return jsonb_build_object('evidence_id',v_evidence_id,'signal_id',v_signal_id,'idempotent',false);
end $$;

revoke all on function public.persist_verified_evidence_signal_internal(uuid,uuid,text,text,numeric,text,text,text,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.persist_verified_evidence_signal_internal(uuid,uuid,text,text,numeric,text,text,text,uuid,text,text,jsonb) to service_role;
revoke execute on function public.persist_audit_signal_internal(uuid,uuid,uuid,text,text,text,numeric,numeric,uuid,text,text,jsonb) from service_role;
