import crypto from 'crypto';
import type { Request, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isAccountRole, normalizeDepartment, shareLinkIsUsable } from '../domain/institutionOnboarding';

type InstitutionRole = 'placement_team' | 'college_management';
type AuthedRequest = Request & { careerVoiceUserId?: string };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function bearer(req: Request): string | null {
  const value = req.header('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : null;
}

function normalizeExpiry(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error('INVALID_EXPIRY');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) throw new Error('INVALID_EXPIRY');
  return parsed.toISOString();
}

export async function authenticateInstitutionRequest(req: AuthedRequest, res: Response, supabase: SupabaseClient): Promise<string | null> {
  const token = bearer(req);
  if (!token) {
    res.status(401).json({ code: 'AUTH_SESSION_MISSING', message: 'Authentication required' });
    return null;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ code: 'AUTH_SESSION_INVALID', message: 'Invalid or expired session' });
    return null;
  }
  req.careerVoiceUserId = data.user.id;
  return data.user.id;
}

async function membershipForUser(supabase: SupabaseClient, userId: string) {
  const result = await supabase.from('college_memberships').select('id,college_id,department,role').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

function scopedDepartment(requested: unknown, membershipDepartment: string | null | undefined): string | null {
  const normalized = normalizeDepartment(requested);
  if (membershipDepartment && normalized && normalized !== membershipDepartment) throw new Error('DEPARTMENT_SCOPE_VIOLATION');
  return membershipDepartment || normalized;
}

export function registerInstitutionRoutes(app: any, supabase: SupabaseClient) {
  app.post('/api/onboarding/role', async (req: AuthedRequest, res: Response) => {
    try {
      const userId = await authenticateInstitutionRequest(req, res, supabase); if (!userId) return;
      const role = req.body?.accountRole;
      if (!isAccountRole(role)) return res.status(400).json({ code: 'INVALID_ROLE', message: 'Unsupported account role' });
      const result = await supabase.from('profiles').upsert({ user_id: userId, account_role: role, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (result.error) throw result.error;
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ code: 'ROLE_SAVE_FAILED', message: error.message }); }
  });

  app.post('/api/onboarding/institution', async (req: AuthedRequest, res: Response) => {
    try {
      const userId = await authenticateInstitutionRequest(req, res, supabase); if (!userId) return;
      const collegeId = typeof req.body?.collegeId === 'string' ? req.body.collegeId.trim() : '';
      const role = req.body?.role as InstitutionRole;
      if (!UUID_RE.test(collegeId) || !['placement_team','college_management'].includes(role)) return res.status(400).json({ code: 'INVALID_MEMBERSHIP', message: 'Valid collegeId and institution role are required' });
      const department = normalizeDepartment(req.body?.department);
      const result = await supabase.from('college_memberships').upsert({ user_id: userId, college_id: collegeId, department, role }, { onConflict: 'user_id,college_id' }).select('id,college_id,department,role').single();
      if (result.error) throw result.error;
      res.json({ success: true, membership: { id: result.data.id, collegeId: result.data.college_id, department: result.data.department, role: result.data.role } });
    } catch (error: any) { res.status(500).json({ code: 'MEMBERSHIP_SAVE_FAILED', message: error.message }); }
  });

  app.get('/api/college/share-links', async (req: AuthedRequest, res: Response) => {
    try {
      const userId = await authenticateInstitutionRequest(req, res, supabase); if (!userId) return;
      const membership = await membershipForUser(supabase, userId); if (!membership) return res.status(403).json({ code: 'COLLEGE_MEMBERSHIP_REQUIRED' });
      let query = supabase.from('career_voice_share_links').select('id,token,college_id,department,campaign,status,expires_at,usage_count').eq('college_id', membership.college_id);
      if (membership.department) query = query.eq('department', membership.department);
      const result = await query.order('created_at', { ascending: false });
      if (result.error) throw result.error;
      res.json({ links: (result.data || []).map((x:any) => ({ id:x.id, token:x.token, collegeId:x.college_id, department:x.department, campaign:x.campaign, status:x.status, expiresAt:x.expires_at, usageCount:x.usage_count })) });
    } catch (error:any) { res.status(500).json({ code:'SHARE_LINK_LIST_FAILED', message:error.message }); }
  });

  app.post('/api/college/share-links', async (req: AuthedRequest, res: Response) => {
    try {
      const userId = await authenticateInstitutionRequest(req, res, supabase); if (!userId) return;
      const membership = await membershipForUser(supabase, userId); if (!membership) return res.status(403).json({ code:'COLLEGE_MEMBERSHIP_REQUIRED' });
      const department = scopedDepartment(req.body?.department, membership.department);
      const token = crypto.randomBytes(24).toString('base64url');
      const expiresAt = normalizeExpiry(req.body?.expiresAt);
      const row = { token, college_id: membership.college_id, department, campaign: typeof req.body?.campaign === 'string' ? req.body.campaign.trim().slice(0,120) : null, expires_at: expiresAt, created_by: userId, status:'active' };
      const result = await supabase.from('career_voice_share_links').insert(row).select('id,token,college_id,department,campaign,status,expires_at,usage_count').single();
      if (result.error) throw result.error;
      const x:any=result.data; res.status(201).json({ link:{ id:x.id, token:x.token, collegeId:x.college_id, department:x.department, campaign:x.campaign, status:x.status, expiresAt:x.expires_at, usageCount:x.usage_count } });
    } catch(error:any) {
      if (error.message === 'DEPARTMENT_SCOPE_VIOLATION') return res.status(403).json({ code:'DEPARTMENT_SCOPE_VIOLATION' });
      if (error.message === 'INVALID_EXPIRY') return res.status(400).json({ code:'INVALID_EXPIRY', message:'expiresAt must be a future ISO date' });
      res.status(500).json({ code:'SHARE_LINK_CREATE_FAILED', message:error.message });
    }
  });

  app.post('/api/college/share-links/:id/revoke', async (req: AuthedRequest, res: Response) => {
    try {
      const userId = await authenticateInstitutionRequest(req,res,supabase); if(!userId)return;
      const membership=await membershipForUser(supabase,userId); if(!membership)return res.status(403).json({code:'COLLEGE_MEMBERSHIP_REQUIRED'});
      let query=supabase.from('career_voice_share_links').update({status:'revoked',revoked_at:new Date().toISOString()}).eq('id',req.params.id).eq('college_id',membership.college_id);
      if (membership.department) query=query.eq('department',membership.department);
      const result=await query.select('id').maybeSingle();
      if(result.error)throw result.error; if(!result.data)return res.status(404).json({code:'SHARE_LINK_NOT_FOUND'}); res.json({success:true});
    } catch(error:any){res.status(500).json({code:'SHARE_LINK_REVOKE_FAILED',message:error.message});}
  });

  app.get('/api/share/:token', async (req: Request,res:Response) => {
    try {
      const result=await supabase.from('career_voice_share_links').select('id,token,college_id,department,campaign,status,expires_at,usage_count').eq('token',req.params.token).maybeSingle();
      if(result.error)throw result.error; const x:any=result.data;
      if(!x || !shareLinkIsUsable(x)) return res.status(404).json({code:'SHARE_LINK_INVALID'});
      const usageCount = Number(x.usage_count || 0) + 1;
      const usageResult = await supabase.from('career_voice_share_links').update({ usage_count: usageCount, last_used_at: new Date().toISOString() }).eq('id', x.id);
      if (usageResult.error) console.warn('share_link_usage_tracking_notice', usageResult.error.message);
      res.json({link:{id:x.id,token:x.token,collegeId:x.college_id,department:x.department,campaign:x.campaign,status:'active',expiresAt:x.expires_at,usageCount}});
    } catch(error:any){res.status(500).json({code:'SHARE_LINK_RESOLVE_FAILED',message:error.message});}
  });

  app.get('/api/college/analytics', async (req: AuthedRequest,res:Response) => {
    try {
      const userId=await authenticateInstitutionRequest(req,res,supabase); if(!userId)return;
      const membership=await membershipForUser(supabase,userId); if(!membership)return res.status(403).json({code:'COLLEGE_MEMBERSHIP_REQUIRED'});
      let query=supabase.from('audit_sessions').select('id,status,readiness_level,created_at,updated_at').eq('college_id',membership.college_id);
      if (membership.department) query=query.eq('department',membership.department);
      const result=await query.order('created_at',{ascending:false}).limit(250);
      if(result.error)throw result.error; const sessions:any[]=result.data||[]; const completed=sessions.filter(x=>x.status==='completed'); const readinessDistribution:Record<string,number>={};
      for(const item of completed){const key=item.readiness_level||'unknown'; readinessDistribution[key]=(readinessDistribution[key]||0)+1;}
      res.json({totalSessions:sessions.length,completedSessions:completed.length,completionRate:sessions.length?completed.length/sessions.length:0,readinessDistribution,recentSessions:sessions.slice(0,20)});
    } catch(error:any){res.status(500).json({code:'COLLEGE_ANALYTICS_FAILED',message:error.message});}
  });
}
