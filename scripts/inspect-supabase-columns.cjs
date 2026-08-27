const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectColumns() {
  // Check tables
  const tables = [
    'audit_sessions',
    'audit_attempts',
    'career_voice_transcript_logs',
    'career_streams',
    'career_roles',
    'career_role_genomes',
    'role_competencies',
    'audit_evidence',
    'student_profiles',
    'profiles',
    'pricing_plans'
  ];

  for (const table of tables) {
    const res = await supabase.from(table).select('*').limit(1);
    if (res.error) {
      console.log(`Table "${table}": ERROR - ${res.error.message}`);
    } else {
      console.log(`Table "${table}": OK - Columns:`, Object.keys(res.data?.[0] || {}));
    }
  }
}

inspectColumns();
