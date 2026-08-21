import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
  college_tier: string;
  college_name: string;
  branch: string;
  grad_year: string;
  career_intent?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseAuditRecord {
  id?: string;
  phone: string;
  target_role: string;
  overall_score: number;
  dimension_scores: any;
  diagnosis_summary: string;
  diagnostic_conclusions: any;
  gaps: any;
  roadmap: any;
  evidence_data?: any;
  iteration: number;
  created_at?: string;
}

/**
 * SQL Schema definition for easy copy/paste into Supabase SQL Editor
 */
export const SUPABASE_SQL_SCHEMA = `
-- 1. Create Profiles Table
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

-- 2. Create Audit Records Table
CREATE TABLE IF NOT EXISTS public.career_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  target_role TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  dimension_scores JSONB NOT NULL,
  diagnosis_summary TEXT NOT NULL,
  diagnostic_conclusions JSONB NOT NULL,
  gaps JSONB NOT NULL,
  roadmap JSONB NOT NULL,
  evidence_data JSONB,
  iteration INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Row Level Security (RLS)
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for profiles" ON public.student_profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read-write for audits" ON public.career_audits
  FOR ALL USING (true) WITH CHECK (true);
`;
