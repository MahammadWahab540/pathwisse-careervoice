const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function signalLevelForLegacy(level) {
  const normalized = (level || '').trim().toLowerCase();
  if (normalized === 'expert') return 'Expert';
  if (normalized === 'advanced') return 'Advanced';
  if (normalized === 'intermediate') return 'Intermediate';
  return 'Beginner';
}

async function testInsert() {
  const auditId = 'e2271629-c173-437c-94e5-5f16566891e2';
  const session = await supabase.from('audit_sessions').select('*').eq('id', auditId).single();
  console.log('Session:', session.data);

  const evidence = await supabase.from('audit_evidence').select('*').eq('session_id', auditId).limit(1);
  console.log('Evidence:', evidence.data);

  const payload = {
    session_id: auditId,
    user_id: session.data.user_id,
    role_id: session.data.target_role_id,
    skill_slug: 'ros2_navigation',
    skill_name: 'ROS2 Navigation',
    level: signalLevelForLegacy('Beginner'),
    score: null,
    confidence: 0.3,
    source_message_id: evidence.data?.[0]?.source_message_id || null,
    idempotency_key: `finalize:${auditId}:test_skill_${Date.now()}`,
    evidence_summary: evidence.data?.[0]?.raw_text || 'test snippet',
    evidence_id: evidence.data?.[0]?.id,
    claimed_level: null,
    extracted_level: 'Beginner',
    confidence_score: 30,
    evidence_strength: 'Weak',
    raw_answer_snippet: evidence.data?.[0]?.raw_text || 'test snippet',
    source: 'document',
    contract_version: 'career-audit:v1',
    metadata: {
      classifier: 'openrouter-http',
      classifierModel: 'openrouter/free',
    },
  };

  const res = await supabase.from('audit_skill_signals').insert(payload).select('id').single();
  console.log('Insert result:', JSON.stringify(res, null, 2));
}

testInsert();
