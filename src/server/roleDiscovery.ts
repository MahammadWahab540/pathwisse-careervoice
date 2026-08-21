import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateRoleDirection, type StudentCareerProfile } from '../domain/careerAudit';
import {
  getAuditSession,
  loadCareerDiscoveryProfile,
  loadRole,
  loadRoleRecommendations,
  loadRoleSkills,
  replaceRoleRecommendations,
  updateAuditSession,
} from './auditRepository';

interface PublishedRoleRow {
  id: string;
  stream_id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  demand_level: string;
  status: string;
  responsibilities?: unknown[];
  typical_day?: string | null;
  problems_solved?: unknown[];
  tools_used?: unknown[];
  career_progression?: unknown[];
  challenges?: unknown[];
  who_enjoys?: string | null;
  role_content_status?: string;
}

const TYPE_ORDER = {
  'Strong Direction': 0,
  'Worth Exploring': 1,
  'Alternative Path': 2,
} as const;

function mapRole(role: PublishedRoleRow, skills: Array<Record<string, unknown>>) {
  const roleSkills = skills.filter((skill) => String(skill.role_id) === role.id);
  return {
    id: role.id,
    streamId: role.stream_id,
    slug: role.slug,
    title: role.title,
    category: role.category,
    description: role.description,
    demandLevel: role.demand_level,
    keySkills: roleSkills.map((skill) => String(skill.skill_name)),
    skills: roleSkills.map((skill) => ({
      id: String(skill.id),
      slug: String(skill.skill_slug),
      name: String(skill.skill_name),
      requiredLevel: String(skill.required_level),
      expectedReadiness: Number(skill.expected_readiness),
      weight: Number(skill.weight),
      minimumEvidenceThreshold: Number(skill.minimum_evidence_threshold),
      minimumEvidenceStrength: String(skill.minimum_evidence_strength),
      evidenceRequirements: skill.evidence_requirements || {},
      evaluationRubric: skill.evaluation_rubric || {},
      employabilityImportance: Number(skill.employability_importance),
      dependencyWeight: Number(skill.dependency_weight),
      probeGuidance: skill.probe_guidance || {},
    })),
  };
}

export async function getPublishedRoleCatalog(supabase: SupabaseClient, streamId?: string | null) {
  let query = supabase
    .from('career_roles')
    .select('id,stream_id,slug,title,category,description,demand_level,status,responsibilities,typical_day,problems_solved,tools_used,career_progression,challenges,who_enjoys,role_content_status')
    .eq('status', 'published')
    .order('title', { ascending: true });
  if (streamId) query = query.eq('stream_id', streamId);
  const roleResult = await query;
  if (roleResult.error) throw new Error(`Career roles could not be loaded: ${roleResult.error.message}`);
  const roles = (roleResult.data || []) as PublishedRoleRow[];
  const skills = await loadRoleSkills(supabase, roles.map((role) => role.id));
  return roles.map((role) => mapRole(role, skills as Array<Record<string, unknown>>));
}

function profileEvidenceQuality(profile: StudentCareerProfile, keySkills: string[]): number {
  const reported = new Set(profile.technicalSkills.map((skill) => skill.trim().toLowerCase()));
  const skillMatches = keySkills.filter((skill) => reported.has(skill.trim().toLowerCase())).length;
  const contextual = [
    profile.careerAspirations,
    profile.preferredWork,
    profile.enjoyedProblems,
    ...profile.projects,
    ...profile.internships,
    ...profile.workExperience,
  ].filter(Boolean).length;
  return skillMatches * 10 + contextual;
}

export async function recommendRolesForAudit(supabase: SupabaseClient, auditId: string) {
  const session = await getAuditSession(supabase, auditId);
  const profile = await loadCareerDiscoveryProfile(supabase, session.user_id);
  if (!profile) throw new Error('Career discovery must be completed before role recommendations.');
  const roles = await getPublishedRoleCatalog(supabase);
  const ranked = roles
    .map((role) => {
      const direction = calculateRoleDirection(profile, {
        roleId: role.id,
        title: role.title,
        category: role.category,
        keySkills: role.keySkills,
      });
      return {
        ...role,
        ...direction,
        _order: TYPE_ORDER[direction.recommendationType],
        _evidenceQuality: profileEvidenceQuality(profile, role.keySkills),
      };
    })
    .sort((a, b) => a._order - b._order || b._evidenceQuality - a._evidenceQuality || a.title.localeCompare(b.title))
    .slice(0, 5);

  await replaceRoleRecommendations(supabase, {
    auditId,
    studentId: session.user_id,
    recommendations: ranked.map((item, index) => ({
      roleId: item.id,
      rank: index + 1,
      recommendationType: item.recommendationType,
      reason: item.reasons.join(' '),
      supportingEvidence: item.supportingEvidence,
    })),
  });
  await updateAuditSession(supabase, auditId, { application_state: 'ROLE_RECOMMENDATIONS' });

  return ranked.map(({ _order, _evidenceQuality, ...item }) => item);
}

export async function getRoleExplanationForAudit(
  supabase: SupabaseClient,
  auditId: string,
  roleId: string
) {
  const session = await getAuditSession(supabase, auditId);
  const [role, roleSkills, recommendations] = await Promise.all([
    loadRole(supabase, roleId),
    loadRoleSkills(supabase, [roleId]),
    loadRoleRecommendations(supabase, auditId),
  ]);
  if (!role) throw new Error('Selected role is not published.');
  const recommendation = recommendations.find((item) => String(item.role_id) === roleId);
  const comparisonRows = recommendations.filter((item) => String(item.role_id) !== roleId).slice(0, 4);
  const comparisonRoleIds = comparisonRows.map((item) => String(item.role_id));
  const comparisonRoles = comparisonRoleIds.length > 0
    ? await getPublishedRoleCatalog(supabase).then((rows) => rows.filter((row) => comparisonRoleIds.includes(row.id)))
    : [];

  return {
    id: role.id,
    title: role.title,
    category: role.category,
    description: role.description,
    demandLevel: role.demand_level,
    responsibilities: Array.isArray(role.responsibilities) ? role.responsibilities : [],
    typicalDay: role.typical_day || null,
    problemsSolved: Array.isArray(role.problems_solved) ? role.problems_solved : [],
    toolsUsed: Array.isArray(role.tools_used) ? role.tools_used : [],
    careerProgression: Array.isArray(role.career_progression) ? role.career_progression : [],
    challenges: Array.isArray(role.challenges) ? role.challenges : [],
    whoEnjoys: role.who_enjoys || null,
    contentStatus: role.role_content_status || 'partial',
    skills: roleSkills.map((skill: Record<string, unknown>) => ({
      id: String(skill.id),
      name: String(skill.skill_name),
      requiredLevel: String(skill.required_level),
      expectedReadiness: Number(skill.expected_readiness),
    })),
    whyThisStudent: recommendation
      ? {
          recommendationType: recommendation.recommendation_type,
          reason: recommendation.reason,
          supportingEvidence: recommendation.supporting_evidence || [],
        }
      : null,
    comparison: comparisonRows.map((row) => {
      const comparedRole = comparisonRoles.find((item) => item.id === String(row.role_id));
      return {
        roleId: String(row.role_id),
        role: comparedRole?.title || 'Published role',
        category: comparedRole?.category || '',
        recommendationType: row.recommendation_type,
        reason: row.reason,
        supportingEvidence: row.supporting_evidence || [],
        keySkills: comparedRole?.keySkills || [],
      };
    }),
    sessionState: session.application_state,
  };
}

export async function confirmTargetRole(supabase: SupabaseClient, auditId: string, roleId: string) {
  const session = await getAuditSession(supabase, auditId);
  const role = await loadRole(supabase, roleId);
  if (!role) throw new Error('Target role is not published.');
  const recommendations = await loadRoleRecommendations(supabase, auditId);
  if (!recommendations.some((item) => String(item.role_id) === roleId)) {
    throw new Error('Target role must be selected from the persisted CareerVoice recommendations.');
  }
  const profileUpdate = await supabase
    .from('profiles')
    .update({ target_role_id: roleId, updated_at: new Date().toISOString() })
    .eq('user_id', session.user_id);
  if (profileUpdate.error) throw new Error(`Target role could not be saved: ${profileUpdate.error.message}`);
  await updateAuditSession(supabase, auditId, {
    target_role_id: roleId,
    application_state: 'AUDIT_SETUP',
    current_competency_skill_id: null,
  });
  return { success: true, auditId, targetRoleId: roleId, applicationState: 'AUDIT_SETUP' };
}
