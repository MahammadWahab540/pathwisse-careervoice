import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  SEED_CAREER_STREAMS,
  SEED_CAREER_ROLES,
  SEED_ROLE_COMPETENCIES,
  SEED_PRICING_PLANS,
} from './seedData';

// Lazy initialization of Supabase client on backend
let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  // Supabase is accessed only from the server. The service-role key must never
  // be exposed to the browser or replaced with the public anon key here.
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

export function requireSupabase(): SupabaseClient {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase server configuration is missing.');
  }
  return supabase;
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
  dimension_scores: any;
  diagnosis_summary: string;
  diagnostic_conclusions: any;
  gaps: any;
  roadmap: any;
  evidence_data?: any;
  status?: string;
  error_message?: string;
  iteration?: number;
  created_at?: string;
}

/**
 * SQL Schema definition for easy copy/paste into Supabase SQL Editor
 */
export const SUPABASE_SQL_SCHEMA = `
-- The connected Supabase project already owns career_streams, career_roles,
-- student_profiles, career_audits, analytics_events, and related tables.
-- This migration adds only the tables/columns used by this app that are not
-- present in the shared project schema.
ALTER TABLE IF EXISTS public.career_audits ADD COLUMN IF NOT EXISTS audit_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS career_audits_audit_id_key
  ON public.career_audits (audit_id) WHERE audit_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.role_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.career_roles(id) ON DELETE CASCADE,
  minimum_readiness_benchmark INTEGER DEFAULT 75,
  clarity_weight NUMERIC DEFAULT 0.10,
  technical_weight NUMERIC DEFAULT 0.35,
  project_weight NUMERIC DEFAULT 0.25,
  communication_weight NUMERIC DEFAULT 0.15,
  execution_weight NUMERIC DEFAULT 0.15,
  core_competencies JSONB NOT NULL DEFAULT '[]',
  roadmap_template JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_role_competency UNIQUE (role_id)
);

CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id TEXT PRIMARY KEY,
  plan_name TEXT NOT NULL,
  price_inr INTEGER NOT NULL,
  original_price_inr INTEGER,
  badge TEXT,
  highlight TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  cta_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.skill_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id TEXT NOT NULL,
  phone TEXT,
  skill_name TEXT NOT NULL,
  claimed_level TEXT,
  extracted_level TEXT,
  confidence_score NUMERIC,
  evidence_strength TEXT,
  source TEXT DEFAULT 'voice_probe',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.role_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_signals ENABLE ROW LEVEL SECURITY;

-- No public policies are created. All writes go through the server using the
-- service-role key, which bypasses RLS without exposing that key to clients.
`;

/**
 * Auto-seeds Supabase tables if they are empty
 */
export async function autoSeedSupabaseData(supabase: SupabaseClient) {
  try {
    // 1. Seed Career Streams
    const { data: streams, error: streamErr } = await supabase.from('career_streams').select('id').limit(1);
    if (!streamErr && (!streams || streams.length === 0)) {
      console.log('Seeding Supabase career_streams...');
      await supabase.from('career_streams').upsert(SEED_CAREER_STREAMS);
    }

    // 2. Seed Career Roles
    const { data: roles, error: roleErr } = await supabase.from('career_roles').select('id').limit(1);
    if (!roleErr && (!roles || roles.length === 0)) {
      console.log('Seeding Supabase career_roles...');
      await supabase.from('career_roles').upsert(SEED_CAREER_ROLES);
    }

    // 3. Seed Role Competencies
    const { data: comps, error: compErr } = await supabase.from('role_competencies').select('id').limit(1);
    if (!compErr && (!comps || comps.length === 0)) {
      console.log('Seeding Supabase role_competencies...');
      await supabase.from('role_competencies').upsert(SEED_ROLE_COMPETENCIES);
    }

    // 4. Seed Pricing Plans
    const { data: plans, error: planErr } = await supabase.from('pricing_plans').select('id').limit(1);
    if (!planErr && (!plans || plans.length === 0)) {
      console.log('Seeding Supabase pricing_plans...');
      await supabase.from('pricing_plans').upsert(SEED_PRICING_PLANS);
    }
  } catch (err: any) {
    console.warn('Notice: Supabase auto-seed encountered schema pending:', err?.message || err);
  }
}
