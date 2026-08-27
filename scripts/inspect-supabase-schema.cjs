const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect() {
  console.log('--- 1. Inspecting career_streams ---');
  const streams = await supabase.from('career_streams').select('*').limit(3);
  console.log('career_streams sample row:', JSON.stringify(streams.data?.[0] || streams.error, null, 2));

  console.log('\n--- 2. Inspecting audit_sessions ---');
  const auditSessions = await supabase.from('audit_sessions').select('*').limit(3);
  console.log('audit_sessions sample row:', JSON.stringify(auditSessions.data?.[0] || auditSessions.error, null, 2));

  console.log('\n--- 3. Inspecting career_voice_transcript_logs ---');
  const transcripts = await supabase.from('career_voice_transcript_logs').select('*').order('created_at', { ascending: false }).limit(5);
  console.log('career_voice_transcript_logs sample rows:', JSON.stringify(transcripts.data || transcripts.error, null, 2));

  console.log('\n--- 4. Inspecting career_roles ---');
  const roles = await supabase.from('career_roles').select('*').limit(1);
  console.log('career_roles columns/sample:', JSON.stringify(roles.data?.[0] || roles.error, null, 2));

  console.log('\n--- 5. Inspecting audit_evidence / evidence_ledger ---');
  const evidence = await supabase.from('audit_evidence').select('*').limit(1);
  console.log('audit_evidence sample:', JSON.stringify(evidence.data || evidence.error, null, 2));

  const evidenceLedger = await supabase.from('evidence_ledger').select('*').limit(1);
  console.log('evidence_ledger sample:', JSON.stringify(evidenceLedger.data || evidenceLedger.error, null, 2));

  console.log('\n--- 6. Inspecting career_role_genomes ---');
  const genomes = await supabase.from('career_role_genomes').select('*').limit(1);
  console.log('career_role_genomes sample:', JSON.stringify(genomes.data?.[0] || genomes.error, null, 2));
}

inspect();
