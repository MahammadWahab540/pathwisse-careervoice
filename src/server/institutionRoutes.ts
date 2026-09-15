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

export function normalizeExpiry(value: unknown, nowMs = Date.now()): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') throw new Error('INVALID_EXPIRY');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= nowMs) throw new Error('INVALID_EXPIRY');
  return parsed.toISOString();
}

export async function authenticateInstitutionRequest(req: AuthedRequest, res: Response, supabase: SupabaseClient): Promise<string | null> {
  const token = bearer(req);
  if (!token) { res.status(401).json({ code: 'AUTH_SESSION_MISSING', message: 'Authentication required' }); return null; }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) { res.status(401).json({ code: 'AUTH_SESSION_INVALID', message: 'Invalid or expired session' }); return null; }
  req.careerVoiceUserId = data.user.id;
  return data.user.id;
}

async function membershipForUser(supabase: SupabaseClient, userId: string) {
  const result = await supabase.from('college_memberships').select('id,college_id,department,role').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export function scopedDepartment(requested: unknown, membershipDepartment: string | null | undefined): string | null {
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
      if (!UUID_RE.test(collegeId)) return res.status(400).json({ code: 'INVALID_COLLEGE_ID', message: 'collegeId must be a UUID' });
      if (!['placement_team','college_management'].includes(role)) return res.status(400).json({ code: 'INVALID_INSTITUTION_ROLE', message: 'Institution role required' });
      const department = normalizeDepartment(req.body?.department);
      const result = await supabase.from('college_memberships').upsert({ user_id: userId, college_id: collegeId, department, role, updated_at: new Date().toISOString() }, { onConflict: 'user_id,college_id,department' }).select('id,college_id,department,role').single();
      if (result.error) throw result.error;
      res.json({ success: true, membership: result.data });
    } catch (error: any) { res.status(500).json({ code: 'INSTITUTION_SAVE_FAILED', message: error.message }); }
  });

  app.get('/api/college/share-links', async (req: AuthedRequest, res: Response) => {
    try {
      const userId = await authenticateInstitutionRequest(req, res, supabase); if (!userId) return;
      const membership = await membershipForUser(supabase, userId); if (!membership) return res.status(403).json({ code: 'INSTITUTION_MEMBERSHIP_REQUIRED' });
      let query = supabase.from('career_voice_share_links').select('*').eq('college_id', membership.college_id).order('created_at', { ascending: false });
      if (membership.department) query = query.eq('department', membership.department);
      const result = await query; if (result.error) throw result.error;
      res.json({ links: result.data || [] });
    } catch (error: any) { res.status(500).json({ code: 'SHARE_LINK_LIST_FAILED', message: error.message }); }
  });

  app.post('/api/college/share-links', async (req: AuthedRequest, res: Response) => {
    try {
      const userId = await authenticateInstitutionRequest(req, res, supabase); if (!userId) return;
      const membership = await membershipForUser(supabase, userId); if (!membership) return res.status(403).json({ code: 'INSTITUTION_MEMBERSHIP_REQUIRED' });
      let department: string | null;
      try { department = scopedDepartment(req.body?.department, membership.department); }
      catch { return res.status(403).json({ code: 'DEPARTMENT_SCOPE_VIOLATION', message: 'Cannot create a link outside your department' }); }
      let expiresAt: string | null;
      try { expiresAt = normalizeExpiry(req.body?.expiresAt); }
      catch { return res.status(400).json({ code: 'INVALID_EXPIRY', message: 'expiresAt must be a future ISO date' }); }
      const token = crypto.randomBytes(24).toString('base64url');
      const result = await supabase.from('career_voice_share_links').insert({ college_id: membership.college_id, department, campaign_name: req.body?.campaignName || null, token, created_by: userId, expires_at: expiresAt }).select('*').single();
      if (result.error) throw result.error;
      res.status(201).json({ link: result.data });
    } catch (error: any) { res.status(500).json({ code: 'SHARE_LINK_CREATE_FAILED', message: error.message }); }
  });

  app.delete('/api/college/share-links/:id', async (req: AuthedRequest, res: Response) => {
    try {
      const userId = await authenticateInstitutionRequest(req, res, supabase); if (!userId) return;
      const membership = await membershipForUser(supabase, userId); if (!membership) return res.status(403).json({ code: 'INSTITUTION_MEMBERSHIP_REQUIRED' });
      let query = supabase.from('career_voice_share_links').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', req.params.id).eq('college_id', membership.college_id);
      if (membership.department) query = query.eq('department', membership.department);
      const result = await query.select('id').maybeSingle(); if (result.error) throw result.error;
      if (!result.data) return res.status(404).json({ code: 'SHARE_LINK_NOT_FOUND' });
      res.json({ success: true });
    } catch (error: any) { res.status(500).json({ code: 'SHARE_LINK_REVOKE_FAILED', message: error.message }); }
  });

  app.get('/api/share/:token', async (req: Request, res: Response) => {
    try {
      const result = await supabase.from('career_voice_share_links').select('id,college_id,department,campaign_name,status,expires_at,usage_count').eq('token', req.params.token).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data || !shareLinkIsUsable(result.data)) return res.status(404).json({ code: 'SHARE_LINK_INVALID' });
      const nextUsageCount = Number(result.data.usage_count || 0) + 1;
      const usageUpdate = await supabase.from('career_voice_share_links').update({ usage_count: nextUsageCount }).eq('id', result.data.id);
      if (usageUpdate.error) console.warn('share_link_usage_count_notice', usageUpdate.error.message);
      res.json({ context: { ...result.data, usage_count: nextUsageCount } });
    } catch (error: any) { res.status(500).json({ code: 'SHARE_LINK_RESOLVE_FAILED', message: error.message }); }
  });

  app.get('/api/college/analytics', async (req: AuthedRequest, res: Response) => {
    try {
      const userId = await authenticateInstitutionRequest(req, res, supabase); if (!userId) return;
      const membership = await membershipForUser(supabase, userId); if (!membership) return res.status(403).json({ code: 'INSTITUTION_MEMBERSHIP_REQUIRED' });
      let query = supabase.from('audit_sessions').select('id,status,overall_score,created_at,department').eq('college_id', membership.college_id).order('created_at', { ascending: false }).limit(1000);
      if (membership.department) query = query.eq('department', membership.department);
      const result = await query; if (result.error) throw result.error;
      const sessions = result.data || []; const completed = sessions.filter((s:any) => ['completed','ready_for_report'].includes(s.status));
      res.json({ totalSessions: sessions.length, completedSessions: completed.length, completionRate: sessions.length ? Math.round((completed.length/sessions.length)*100) : 0, readinessDistribution: { ready: completed.filter((s:any)=>Number(s.overall_score)>=75).length, developing: completed.filter((s:any)=>Number(s.overall_score)>=50 && Number(s.overall_score)<75).length, needsAttention: completed.filter((s:any)=>Number(s.overall_score)<50).length }, recentSessions: sessions.slice(0,10) });
    } catch (error:any) { res.status(500).json({ code: 'COLLEGE_ANALYTICS_FAILED', message: error.message }); }
  });
}
