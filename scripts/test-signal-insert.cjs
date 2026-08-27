const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSignalInsert() {
  const auditId = '15af2011-f3f9-416a-92fe-0c72c1d0af13';
  const userId = 'd0025cd5-724d-4e33-b593-1c5effe6154a';
  const evidenceId = '76dedba2-36cd-47fb-9134-9b97bb2287a6';

  const res = await supabase
    .from('audit_skill_signals')
    .insert({
      session_id: auditId,
      user_id: userId,
      skill_id: 'test_skill',
      skill_slug: 'test_skill',
      skill_name: 'ROS2 Navigation',
      level: 'intermediate',
      score: null,
      confidence: 0.7,
      idempotency_key: `sig_${Date.now()}`,
      evidence_summary: 'Built ROS2 robot',
      evidence_id: evidenceId,
      extracted_level: 'Intermediate',
      confidence_score: 70,
      evidence_strength: 'Strong',
      raw_answer_snippet: 'Built ROS2 robot',
      source: 'project',
      contract_version: 'career-audit:v1',
      metadata: { classifier: 'gemini-http' },
    })
    .select('id')
    .single();

  console.log('Signal insert test result:', JSON.stringify(res, null, 2));
}

testSignalInsert();
