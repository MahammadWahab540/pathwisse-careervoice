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
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

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
-- 1. Create Career Streams Table
CREATE TABLE IF NOT EXISTS public.career_streams (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Career Roles Table
CREATE TABLE IF NOT EXISTS public.career_roles (
  id TEXT PRIMARY KEY,
  stream_id TEXT REFERENCES public.career_streams(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  demand_level TEXT NOT NULL,
  salary_min_lpa NUMERIC DEFAULT 6.0,
  salary_max_lpa NUMERIC DEFAULT 20.0,
  salary_range_display TEXT DEFAULT '₹6L – ₹20L CTC',
  key_skills JSONB NOT NULL DEFAULT '[]',
  match_type TEXT DEFAULT 'Strong match',
  fit_reason TEXT,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Role Competencies & Benchmarks Table
CREATE TABLE IF NOT EXISTS public.role_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id TEXT NOT NULL REFERENCES public.career_roles(id) ON DELETE CASCADE,
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

-- 4. Create Pricing Plans Table
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

-- 5. Create Student Profiles Table
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  college_tier TEXT,
  college_name TEXT,
  branch TEXT,
  grad_year TEXT,
  career_intent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create Skill Signals Table (Evidence Probes & Signals)
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

-- 7. Create Career Audits Table
CREATE TABLE IF NOT EXISTS public.career_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  target_role_id TEXT,
  target_role_title TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  dimension_scores JSONB NOT NULL,
  diagnosis_summary TEXT NOT NULL,
  diagnostic_conclusions JSONB NOT NULL,
  gaps JSONB NOT NULL,
  roadmap JSONB NOT NULL,
  evidence_data JSONB,
  status TEXT DEFAULT 'COMPLETED',
  error_message TEXT,
  iteration INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security (RLS)
ALTER TABLE public.career_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for streams" ON public.career_streams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for roles" ON public.career_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for competencies" ON public.role_competencies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for pricing" ON public.pricing_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for profiles" ON public.student_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for skill_signals" ON public.skill_signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for audits" ON public.career_audits FOR ALL USING (true) WITH CHECK (true);
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
