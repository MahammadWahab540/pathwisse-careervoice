import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { serverConfig } from '../server/config';

let supabaseClient: SupabaseClient | null = null;

/**
 * Server-only privileged Supabase client.
 *
 * The service-role key is intentionally read only from process environment and
 * this module must never be imported by browser bundles.
 */
export function getSupabase(): SupabaseClient | null {
  if (!serverConfig.supabaseUrl || !serverConfig.supabaseServiceRoleKey) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(serverConfig.supabaseUrl, serverConfig.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

export function requireSupabase(): SupabaseClient {
  const client = getSupabase();
  if (!client) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
  return client;
}

export interface SupabaseUserProfile {
  id?: string;
  phone: string;
  first_name: string;
  college_tier?: string;
  college_name?: string;
  branch?: string;
  grad_year?: string;
  career_intent?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseAuditRecord {
  id?: string;
  audit_id: string;
  phone: string;
  target_role_id?: string;
  target_role_title: string;
  overall_score: number;
  dimension_scores: Record<string, number>;
  diagnosis_summary: string;
  diagnostic_conclusions: unknown[];
  gaps: unknown[];
  roadmap: unknown;
  evidence_data?: unknown;
  status?: string;
  error_message?: string;
  iteration?: number;
  created_at?: string;
}
