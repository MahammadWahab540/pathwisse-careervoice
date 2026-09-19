import {
  SEED_CAREER_STREAMS,
  SEED_CAREER_ROLES,
  SEED_ROLE_COMPETENCIES,
  SEED_PRICING_PLANS,
} from './lib/seedData';

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  OPENROUTER_API_KEY?: string;
  APP_URL?: string;
}

const DEFAULT_COLLEGES = [
  { id: 'bits_pilani', name: 'BITS Pilani (Pilani & Hyderabad Campuses)', tier: 'Tier 1 • Deemed University' },
  { id: 'iit_madras', name: 'IIT Madras (Indian Institute of Technology)', tier: 'Tier 1 • Institute of National Importance' },
  { id: 'nit_trichy', name: 'NIT Tiruchirappalli', tier: 'Tier 1 • National Institute of Technology' },
  { id: 'iiit_hyderabad', name: 'IIIT Hyderabad', tier: 'Tier 1 • Research University' },
  { id: 'jntu_hyderabad', name: 'JNTU College of Engineering, Hyderabad', tier: 'Tier 2 • State University' },
  { id: 'vit_vellore', name: 'Vellore Institute of Technology (VIT Vellore)', tier: 'Tier 2 • Deemed University' },
  { id: 'rvce_bangalore', name: 'RV College of Engineering, Bengaluru', tier: 'Tier 2 • Autonomous' },
  { id: 'srm_chennai', name: 'SRM Institute of Science and Technology, Chennai', tier: 'Tier 2 • Deemed University' },
  { id: 'cbit_hyderabad', name: 'Chaitanya Bharathi Institute of Technology (CBIT)', tier: 'Tier 2 • Autonomous' },
  { id: 'coep_pune', name: 'COEP Technological University, Pune', tier: 'Tier 1 • State University' },
];

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight for all endpoints
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Only route /api/ paths to the worker API router
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, url, env, ctx);
    }

    // Pass all static asset & SPA navigation requests to Cloudflare Static Assets
    return env.ASSETS.fetch(request);
  },
};

async function handleApi(request: Request, url: URL, env: Env, _ctx: ExecutionContext): Promise<Response> {
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const supabaseUrl = env.SUPABASE_URL || 'https://pfzjbazocmgflcogjjrg.supabase.co';
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || 'sb_publishable_5IxIvt5Ba8m-AFbAnwZXDQ_8jyx9qPX';

  // 1. Health check
  if (path === '/api/health') {
    return json({
      status: 'ok',
      runtime: 'cloudflare-worker',
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Voice: Text to speech
  if (path === '/api/voice/speak' && method === 'POST') {
    try {
      const body = await request.json().catch(() => ({})) as Record<string, unknown>;
      const text = typeof body?.text === 'string' ? body.text.trim() : '';
      const voice = typeof body?.voice === 'string' ? body.voice : 'alloy';

      if (env.OPENROUTER_API_KEY && text) {
        try {
          const ttsRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'fish-audio/s2.1-pro',
              input: text,
              voice,
            }),
          });
          if (ttsRes.ok) {
            const buf = await ttsRes.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            return json({
              success: true,
              audioBase64: btoa(binary),
              contentType: 'audio/mp3',
            });
          }
        } catch {
          // Fall through to browser speech fallback
        }
      }

      // Safe 200 fallback to browser speech synthesis
      return json({
        success: false,
        mode: 'browser-speech',
        message: 'OpenRouter TTS not active; using browser speech synthesis.',
      });
    } catch (err) {
      return json({
        success: false,
        mode: 'browser-speech',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 3. Voice: Status
  if (path === '/api/voice/status' && method === 'GET') {
    return json({
      success: true,
      ready: true,
      provider: env.OPENROUTER_API_KEY ? 'openrouter' : 'browser-speech',
      engine: env.OPENROUTER_API_KEY ? 'openrouter-turn-based' : 'browser-speech',
      models: {
        openrouterTts: 'fish-audio/s2.1-pro',
        openrouterStt: 'openai/gpt-4o-mini-transcribe',
      },
    });
  }

  // 4. Voice: Transcribe
  if (path === '/api/voice/transcribe' && method === 'POST') {
    if (env.OPENROUTER_API_KEY) {
      try {
        const transcribeRes = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          },
          body: request.body,
        });
        const data = await transcribeRes.json().catch(() => ({}));
        return json(data, transcribeRes.status);
      } catch {
        return json({ success: false, error: 'Voice transcription failed.' }, 502);
      }
    }
    return json({ success: false, error: 'Voice transcription not configured.' }, 503);
  }

  // 5. Colleges list
  if (path === '/api/colleges' && method === 'GET') {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/colleges?active=eq.true&select=id,slug,name,city,state,country,metadata&order=name.asc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      if (res.ok) {
        const data = (await res.json()) as Array<Record<string, unknown>>;
        if (Array.isArray(data) && data.length > 0) {
          const colleges = data.map((c) => {
            const meta = (c.metadata && typeof c.metadata === 'object' ? c.metadata : {}) as Record<string, unknown>;
            const location = [c.city, c.state].filter(Boolean).join(', ');
            return {
              id: (c.slug as string) || (c.id as string),
              databaseId: c.id as string,
              name: c.name as string,
              tier: typeof meta.tier === 'string' ? meta.tier : location || 'Accredited Institution',
            };
          });
          return json({ colleges });
        }
      }
    } catch {
      // Fallback
    }
    return json({ colleges: DEFAULT_COLLEGES });
  }

  // 6. Career Streams
  if (path === '/api/streams' && method === 'GET') {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/career_streams?status=eq.published&select=id,code,title,description,icon_name,sort_order&order=sort_order.asc`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );
      if (res.ok) {
        const data = (await res.json()) as Array<Record<string, unknown>>;
        if (Array.isArray(data) && data.length > 0) {
          return json(
            data.map((s) => ({
              id: (s.code as string) || (s.id as string),
              databaseId: s.id as string,
              title: (s.title as string) || (s.code as string),
              description: s.description as string,
              iconName: s.icon_name as string,
            }))
          );
        }
      }
    } catch {}
    return json(
      SEED_CAREER_STREAMS.map((s) => ({
        id: s.id,
        databaseId: s.id,
        title: s.title,
        description: s.description,
        iconName: s.icon_name,
      }))
    );
  }

  // 7. Career Roles
  if (path === '/api/roles' && method === 'GET') {
    const streamId = url.searchParams.get('streamId');
    try {
      let query = `${supabaseUrl}/rest/v1/career_roles?status=eq.published&select=id,stream_id,title,category,description,demand_level,key_skills,match_type,fit_reason,status`;
      if (streamId) query += `&stream_id=eq.${encodeURIComponent(streamId)}`;
      const res = await fetch(query, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      if (res.ok) {
        const data = (await res.json()) as Array<Record<string, unknown>>;
        if (Array.isArray(data) && data.length > 0) {
          return json(
            data.map((r) => ({
              id: r.id,
              streamId: r.stream_id,
              title: r.title,
              category: r.category,
              description: r.description,
              demandLevel: r.demand_level,
              keySkills: Array.isArray(r.key_skills) ? r.key_skills : [],
              matchType: r.match_type,
              fitReason: r.fit_reason,
              status: r.status,
            }))
          );
        }
      }
    } catch {}
    const filtered = streamId ? SEED_CAREER_ROLES.filter((r) => r.stream_id === streamId) : SEED_CAREER_ROLES;
    return json(
      filtered.map((r) => ({
        id: r.id,
        streamId: r.stream_id,
        title: r.title,
        category: r.category,
        description: r.description,
        demandLevel: r.demand_level,
        keySkills: r.key_skills,
        matchType: r.match_type,
        fitReason: r.fit_reason,
        status: r.status,
      }))
    );
  }

  // 8. Competency catalog
  if (path.startsWith('/api/catalog/competency/') && method === 'GET') {
    const roleId = path.replace('/api/catalog/competency/', '');
    const seed = SEED_ROLE_COMPETENCIES.find((c) => c.role_id === roleId) || SEED_ROLE_COMPETENCIES[0];
    return json({
      roleId: seed.role_id,
      minimumReadinessBenchmark: seed.minimum_readiness_benchmark,
      evaluationCriteria: {
        clarityWeight: seed.clarity_weight,
        technicalWeight: seed.technical_weight,
        projectWeight: seed.project_weight,
        communicationWeight: seed.communication_weight,
        placementWeight: 10,
        executionWeight: seed.execution_weight,
      },
      coreCompetencies: seed.core_competencies,
    });
  }

  // 9. Campaigns: List (GET)
  if (path === '/api/campaigns' && method === 'GET') {
    const createdBy = url.searchParams.get('createdBy');
    const collegeId = url.searchParams.get('collegeId');
    try {
      let queryUrl = `${supabaseUrl}/rest/v1/campaigns?select=*&order=created_at.desc&limit=50`;
      if (createdBy && UUID_RE.test(createdBy)) {
        queryUrl += `&created_by=eq.${encodeURIComponent(createdBy)}`;
      } else if (collegeId && collegeId !== 'all') {
        queryUrl += `&institution=ilike.*${encodeURIComponent(collegeId)}*`;
      }
      const res = await fetch(queryUrl, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      if (res.ok) {
        const data = (await res.json()) as Array<Record<string, unknown>>;
        const campaigns = (Array.isArray(data) ? data : []).map((c) => ({
          campaignId: c.id,
          id: c.id,
          name: c.name,
          institution: c.institution,
          department: c.department,
          batch: c.batch,
          graduationYear: c.graduation_year,
          inviteToken: c.invite_token,
          inviteUrl: c.invite_url || `${url.origin}/invite/${c.invite_token}`,
          status: c.status,
          expiresAt: c.expires_at,
          createdAt: c.created_at,
        }));
        return json({ success: true, campaigns });
      }
    } catch {}
    return json({ success: true, campaigns: [] });
  }

  // 9b. Campaign by ID or Token: Get (GET)
  if (path.startsWith('/api/campaigns/') && method === 'GET') {
    const rawId = path.replace('/api/campaigns/', '').trim();
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/campaigns?or=(id.eq.${encodeURIComponent(rawId)},invite_token.eq.${encodeURIComponent(rawId)})&limit=1`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      );
      if (res.ok) {
        const list = (await res.json()) as Array<Record<string, unknown>>;
        if (Array.isArray(list) && list.length > 0) {
          const c = list[0];
          return json({
            success: true,
            campaign: {
              id: c.id,
              campaignId: c.id,
              name: c.name,
              institution: c.institution,
              department: c.department,
              batch: c.batch,
              graduationYear: c.graduation_year,
              inviteToken: c.invite_token,
              token: c.invite_token,
              inviteUrl: c.invite_url || `${url.origin}/invite/${c.invite_token}`,
              status: c.status,
              expiresAt: c.expires_at,
              createdAt: c.created_at,
              stats: {
                invited: 0,
                started: 0,
                completed: 0,
                completionRate: 0,
              },
            },
          });
        }
      }
    } catch {}
    return json({ success: false, error: 'Campaign not found' }, 404);
  }

  // 10. Campaigns: Create (POST)
  if (path === '/api/campaigns' && method === 'POST') {
    try {
      const body = await request.json().catch(() => ({})) as Record<string, unknown>;
      const name = typeof body?.name === 'string' ? body.name.trim() : 'Campus Drive 2026';
      const institution = (typeof body?.institution === 'string' && body.institution.trim()) || 'CareerVoice Partner Institution';
      const department = (typeof body?.department === 'string' && body.department.trim()) || 'All Departments';
      const batch = (typeof body?.batch === 'string' && body.batch.trim()) || '2026';
      const graduationYear = Number(body?.graduationYear) || 2026;
      const expiryDays = Number(body?.expiryDays) || 30;
      const createdBy = typeof body?.createdBy === 'string' ? body.createdBy : undefined;
      const validCreatedBy = createdBy && UUID_RE.test(createdBy) ? createdBy : null;

      const inviteToken = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const baseUrl = url.origin;
      const inviteUrl = `${baseUrl}/invite/${inviteToken}`;
      const campaignId = `cmp_${inviteToken}`;
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
      const createdAt = new Date().toISOString();

      try {
        await fetch(`${supabaseUrl}/rest/v1/campaigns`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            id: campaignId,
            name,
            institution,
            department,
            batch,
            graduation_year: graduationYear,
            invite_token: inviteToken,
            invite_url: inviteUrl,
            expires_at: expiresAt,
            status: 'active',
            created_by: validCreatedBy,
            created_at: createdAt,
          }),
        });
      } catch (dbErr) {
        console.warn('Worker campaign insert notice:', dbErr);
      }

      return json({
        success: true,
        campaignId,
        id: campaignId,
        inviteToken,
        inviteUrl,
        name,
        institution,
        department,
        batch,
        graduationYear,
        expiresAt,
        status: 'active',
      }, 201);
    } catch (err) {
      return json({ success: false, error: err instanceof Error ? err.message : String(err) }, 400);
    }
  }

  // 11. Invite token resolution
  if (path.startsWith('/api/invite/') && method === 'GET') {
    const token = path.replace('/api/invite/', '');
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/campaigns?invite_token=eq.${encodeURIComponent(token)}&select=*`,
        {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        }
      );
      if (res.ok) {
        const data = (await res.json()) as Array<Record<string, unknown>>;
        if (Array.isArray(data) && data.length > 0) {
          const c = data[0];
          if (c.expires_at && new Date(c.expires_at as string) < new Date()) {
            return json({ success: false, expired: true, error: 'This invite link has expired.' }, 410);
          }
          if (c.status !== 'active') {
            return json({ success: false, error: 'This campaign is no longer active.' }, 403);
          }
          return json({
            success: true,
            campaignId: c.id,
            id: c.id,
            name: c.name,
            institution: c.institution,
            department: c.department,
            batch: c.batch,
            graduationYear: c.graduation_year,
            status: c.status,
            expiresAt: c.expires_at,
          });
        }
      }
    } catch {}
    return json({ success: false, error: 'Invite link not found or has expired.' }, 404);
  }

  // 12. College invite-link
  if (path === '/api/college/invite-link' && method === 'POST') {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const collegeId = (typeof body?.collegeId === 'string' && body.collegeId) || 'bits_h';
    const department = (typeof body?.department === 'string' && body.department) || 'all';
    const batch = (typeof body?.batch === 'string' && body.batch) || '2026';
    const params = new URLSearchParams();
    params.set('college', collegeId);
    if (department !== 'all') params.set('dept', department);
    params.set('batch', batch);
    params.set('role', 'student');

    return json({
      success: true,
      inviteUrl: `${url.origin}/?${params.toString()}`,
      collegeId,
      department,
      batch,
    });
  }

  // 12b. Student Audit Dossier (GET)
  if (path.startsWith('/api/college/students/') && path.endsWith('/audit') && method === 'GET') {
    const rawStudentId = path.replace('/api/college/students/', '').replace('/audit', '').trim();
    try {
      const [profRes, repRes, sessRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/profiles?or=(id.eq.${encodeURIComponent(rawStudentId)},user_id.eq.${encodeURIComponent(rawStudentId)})&limit=1`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        }),
        fetch(`${supabaseUrl}/rest/v1/audit_reports?user_id=eq.${encodeURIComponent(rawStudentId)}&order=created_at.desc&limit=1`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        }),
        fetch(`${supabaseUrl}/rest/v1/audit_sessions?user_id=eq.${encodeURIComponent(rawStudentId)}&order=created_at.desc&limit=1`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        }),
      ]);

      const profData = profRes.ok ? await profRes.json() : [];
      const repData = repRes.ok ? await repRes.json() : [];
      const sessData = sessRes.ok ? await sessRes.json() : [];

      const profile = Array.isArray(profData) && profData.length > 0 ? (profData[0] as Record<string, unknown>) : null;
      const report = Array.isArray(repData) && repData.length > 0 ? (repData[0] as Record<string, unknown>) : null;
      const session = Array.isArray(sessData) && sessData.length > 0 ? (sessData[0] as Record<string, unknown>) : null;

      if (!profile && !report && !session) {
        return json({ success: false, error: 'Student record not found' }, 404);
      }

      const name = (profile?.full_name as string) || (profile?.first_name as string) || `Candidate ${rawStudentId.slice(0, 8)}`;
      const department = (profile?.department as string) || (profile?.branch as string) || 'Computer Science';
      const academicYear = profile?.academic_year ? `${profile.academic_year}th Year` : undefined;
      const rollNo = (profile?.roll_no as string) || undefined;
      const phone = (profile?.phone as string) || undefined;
      const email = (profile?.email as string) || undefined;

      let readinessScore: number | null = null;
      let benchmark = 75;
      let status: 'Ready' | 'Attention Required' | 'Developing' | 'Pending' = 'Pending';
      let strengths: string[] = [];
      let gaps: string[] = [];
      let evidenceCount = 0;
      let lastAssessedAt: string | null = null;
      let targetRole: string | undefined = undefined;

      if (report) {
        readinessScore = report.overall_score !== null && report.overall_score !== undefined ? Number(report.overall_score) : null;
        benchmark = Number(report.hiring_benchmark) || 75;
        if (readinessScore !== null) {
          status = readinessScore >= benchmark ? 'Ready' : readinessScore >= 55 ? 'Developing' : 'Attention Required';
        }
        if (Array.isArray(report.strengths)) {
          strengths = report.strengths.map((s: unknown) =>
            typeof s === 'string' ? s : (s as Record<string, unknown>)?.skillName ? String((s as Record<string, unknown>).skillName) : (s as Record<string, unknown>)?.evidence ? String((s as Record<string, unknown>).evidence) : String(s)
          );
        }
        if (Array.isArray(report.gaps)) {
          gaps = report.gaps.map((g: unknown) =>
            typeof g === 'string' ? g : (g as Record<string, unknown>)?.title ? String((g as Record<string, unknown>).title) : (g as Record<string, unknown>)?.description ? String((g as Record<string, unknown>).description) : String(g)
          );
        }
        if (Array.isArray(report.evidence_ledger)) {
          evidenceCount = report.evidence_ledger.length;
        }
        lastAssessedAt = typeof report.created_at === 'string' ? report.created_at : null;
        targetRole = (report.target_role as string) || (report.target_role_id as string) || undefined;
      } else if (session) {
        status = 'Developing';
      }

      return json({
        success: true,
        student: {
          id: rawStudentId,
          studentId: rawStudentId,
          name,
          email,
          phone,
          department,
          year: academicYear,
          rollNo,
          targetRole,
          readinessScore,
          benchmark,
          status,
          strengths,
          gaps,
          evidenceCount,
          lastAssessedAt,
        },
      });
    } catch (err) {
      return json({ success: false, error: err instanceof Error ? err.message : String(err) }, 500);
    }
  }

  // 13. College Dashboard Overview
  if (path === '/api/college/dashboard' && method === 'GET') {
    const collegeId = url.searchParams.get('collegeId') || 'custom_college';
    const batchFilter = url.searchParams.get('batch') || '2026';
    const deptFilter = url.searchParams.get('department');

    try {
      const [profsRes, sessRes, reportsRes, rolesRes, colRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/profiles?select=*&limit=200`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }),
        fetch(`${supabaseUrl}/rest/v1/audit_sessions?select=*&limit=200`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }),
        fetch(`${supabaseUrl}/rest/v1/audit_reports?select=*&limit=200`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }),
        fetch(`${supabaseUrl}/rest/v1/career_roles?select=id,title,demand_level&limit=50`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }),
        fetch(`${supabaseUrl}/rest/v1/colleges?select=id,slug,name&limit=100`, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }),
      ]);

      const profs = (profsRes.ok ? await profsRes.json() : []) as Array<Record<string, unknown>>;
      const sessions = (sessRes.ok ? await sessRes.json() : []) as Array<Record<string, unknown>>;
      const reports = (reportsRes.ok ? await reportsRes.json() : []) as Array<Record<string, unknown>>;
      const roles = (rolesRes.ok ? await rolesRes.json() : []) as Array<Record<string, unknown>>;
      const colleges = (colRes.ok ? await colRes.json() : []) as Array<Record<string, unknown>>;

      // Match college name
      let collegeName = 'Placement Portal';
      const matchedCol = colleges.find(
        (c) => c.slug === collegeId || c.id === collegeId || String(c.name || '').toLowerCase().includes(collegeId.toLowerCase())
      );
      if (matchedCol?.name) {
        collegeName = String(matchedCol.name);
      }

      // Filter profs that belong to this college and are students
      const studentProfs = profs.filter((p) => {
        if (p.account_role === 'placement_team' || p.account_role === 'college') return false;
        if (matchedCol?.id && p.college_id === matchedCol.id) return true;
        if (collegeId && collegeId !== 'custom_college' && p.college_id === collegeId) return true;
        return false;
      });

      // Map sessions and reports by user_id
      const sessionUserMap = new Map(sessions.map((s) => [String(s.user_id), s]));
      const reportSessionMap = new Map(reports.map((r) => [String(r.session_id), r]));
      const reportUserMap = new Map(reports.map((r) => [String(r.user_id), r]));
      const roleMap = new Map(roles.map((r) => [String(r.id), r]));

      const students = studentProfs.map((p, idx) => {
        const userId = String(p.user_id || p.id);
        const session = sessionUserMap.get(userId);
        const report = reportUserMap.get(userId) || (session ? reportSessionMap.get(String(session.id)) : null);

        let status: 'completed' | 'started' | 'invited' = 'invited';
        let readinessScore: number | null = null;
        let completedAt: string | null = null;

        if (report) {
          status = 'completed';
          readinessScore = report.overall_score !== null && report.overall_score !== undefined ? Number(report.overall_score) : null;
          completedAt = typeof report.created_at === 'string' ? report.created_at : null;
        } else if (session && (session.status === 'in_progress' || session.status === 'processing' || session.status === 'started')) {
          status = 'started';
        }

        const dept = (p.department as string) || (p.branch as string) || 'Engineering';
        const targetRoleObj = p.target_role_id ? roleMap.get(String(p.target_role_id)) : null;
        const targetRole = targetRoleObj?.title ? String(targetRoleObj.title) : undefined;

        return {
          id: userId,
          name: (p.full_name as string) || (p.first_name as string) || `Candidate ${idx + 1}`,
          rollNo: (p.roll_no as string) || undefined,
          phone: (p.phone as string) || undefined,
          department: dept,
          academicYear: p.academic_year ? `${p.academic_year}th Year (${batchFilter} Batch)` : undefined,
          status,
          targetRole,
          readinessScore,
          completedAt,
          auditId: session?.id ? String(session.id) : null,
        };
      });

      // Filter by department if requested
      const filteredStudents = deptFilter && deptFilter !== 'all'
        ? students.filter((s) => (s.department || '').toLowerCase().includes(deptFilter.toLowerCase()))
        : students;

      const totalStudents = filteredStudents.length;
      const completedStudents = filteredStudents.filter((s) => s.status === 'completed');
      const startedStudents = filteredStudents.filter((s) => s.status === 'started');
      const invitedStudents = filteredStudents.filter((s) => s.status === 'invited');

      const completedCount = completedStudents.length;
      const startedCount = startedStudents.length;
      const invitedCount = invitedStudents.length;

      const validScores = completedStudents
        .map((s) => s.readinessScore)
        .filter((s): s is number => typeof s === 'number' && !isNaN(s) && s > 0);

      const avgScore = validScores.length > 0
        ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
        : null;

      // Real top roles dynamically aggregated
      const roleCounts = new Map<string, number>();
      filteredStudents.forEach((s) => {
        if (s.targetRole) {
          roleCounts.set(s.targetRole, (roleCounts.get(s.targetRole) || 0) + 1);
        }
      });
      const topRoles = Array.from(roleCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([roleTitle, studentCount]) => ({
          roleTitle,
          studentCount,
          percentage: totalStudents > 0 ? Math.round((studentCount / totalStudents) * 100) : 0,
          demandLevel: 'High',
        }));

      return json({
        success: true,
        college: {
          id: collegeId,
          name: collegeName,
          placementCell: 'Department of Training & Placement',
          targetBatch: `${batchFilter} Passing Out Batch`,
        },
        metrics: {
          totalInvited: totalStudents,
          startedCount,
          completedCount,
          invitedCount,
          avgReadinessScore: avgScore,
          participationRate: totalStudents > 0 ? Math.round(((startedCount + completedCount) / totalStudents) * 100) : 0,
          completionRate: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0,
        },
        insights: {
          topRoles,
          criticalGaps: [],
          readinessDistribution: {
            ready: validScores.filter((s) => s >= 75).length,
            growing: validScores.filter((s) => s >= 55 && s < 75).length,
            foundation: validScores.filter((s) => s < 55).length,
          },
        },
        managementMetrics: {
          totalDepartments: new Set(filteredStudents.map((s) => s.department).filter(Boolean)).size,
          overallInstitutionalReadiness: avgScore,
          nirfEmployabilityScore: avgScore ? Math.min(100, Math.round(avgScore * 1.15)) : null,
          naacBenchmarkTier: avgScore ? (avgScore >= 70 ? 'Tier A+ Benchmark' : 'Tier A Benchmark') : null,
          branches: [],
        },
        students: filteredStudents,
      });
    } catch {
      return json({
        success: true,
        college: { id: collegeId, name: 'Placement Portal', targetBatch: `${batchFilter} Batch` },
        metrics: { totalInvited: 0, startedCount: 0, completedCount: 0, invitedCount: 0, avgReadinessScore: null, participationRate: 0, completionRate: 0 },
        insights: { topRoles: [], criticalGaps: [], readinessDistribution: { ready: 0, growing: 0, foundation: 0 } },
        students: [],
      });
    }
  }

  // 14. Placement Preferences (Welcome banner dismissal persistence)
  if (path === '/api/placement/preferences') {
    if (method === 'GET') {
      const userId = url.searchParams.get('userId');
      if (userId && UUID_RE.test(userId) && supabaseUrl && supabaseKey) {
        try {
          const pRes = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=career_discovery_profile`, {
            headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          });
          if (pRes.ok) {
            const list = (await pRes.json()) as Array<Record<string, unknown>>;
            const disc = (list?.[0]?.career_discovery_profile as Record<string, unknown>) || {};
            const placementPrefs = (disc?.placement_preferences as Record<string, unknown>) || {};
            return json({
              success: true,
              preferences: {
                welcomeBannerDismissed: Boolean(placementPrefs.welcomeBannerDismissed),
              },
            });
          }
        } catch {}
      }
      return json({ success: true, preferences: { welcomeBannerDismissed: false } });
    }

    if (method === 'POST') {
      try {
        const body = await request.json().catch(() => ({})) as Record<string, unknown>;
        const userId = typeof body?.userId === 'string' ? body.userId : '';
        const welcomeBannerDismissed = Boolean(body?.welcomeBannerDismissed);

        if (userId && UUID_RE.test(userId) && supabaseUrl && supabaseKey) {
          const pRes = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=career_discovery_profile`, {
            headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          });
          let disc: Record<string, unknown> = {};
          if (pRes.ok) {
            const list = (await pRes.json()) as Array<Record<string, unknown>>;
            if (list?.[0]?.career_discovery_profile && typeof list[0].career_discovery_profile === 'object') {
              disc = list[0].career_discovery_profile as Record<string, unknown>;
            }
          }
          const updatedDisc = {
            ...disc,
            placement_preferences: {
              ...((disc.placement_preferences as Record<string, unknown>) || {}),
              welcomeBannerDismissed,
              updatedAt: new Date().toISOString(),
            },
          };

          await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
            method: 'PATCH',
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              career_discovery_profile: updatedDisc,
              updated_at: new Date().toISOString(),
            }),
          });
        }

        return json({
          success: true,
          preferences: { welcomeBannerDismissed },
        });
      } catch (err) {
        return json({ success: false, error: String(err) }, 400);
      }
    }
  }

  // 14. Pricing
  if (path === '/api/pricing' && method === 'GET') {
    return json(SEED_PRICING_PLANS);
  }

  // 15. Analytics tracking
  if (path === '/api/analytics/track' && method === 'POST') {
    return json({ success: true });
  }

  // 16. Auth config
  if (path === '/api/auth/config' && method === 'GET') {
    return json({
      supabaseUrl,
      supabaseAnonKey: env.SUPABASE_ANON_KEY || supabaseKey,
    });
  }

  // 17. Supabase status
  if (path === '/api/supabase/status' && method === 'GET') {
    return json({
      configured: true,
      connected: true,
      message: 'Cloudflare Edge Worker connected to Supabase.',
    });
  }

  // 18. Default 404 for any unmatched /api/* in JSON format (never HTML)
  return json({
    success: false,
    error: `API route ${method} ${path} not found on edge worker.`,
  }, 404);
}
