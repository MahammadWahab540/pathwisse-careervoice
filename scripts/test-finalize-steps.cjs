const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFinalizeSteps() {
  const auditId = '15af2011-f3f9-416a-92fe-0c72c1d0af13';
  const userId = 'd0025cd5-724d-4e33-b593-1c5effe6154a';
  const roleId = 'd3b1e060-39f5-4fad-ab8a-641844c48313';
  const evidenceId = '76dedba2-36cd-47fb-9134-9b97bb2287a6';

  console.log('1. Testing signal insert...');
  const sigRes = await supabase.from('audit_skill_signals').insert({
    session_id: auditId,
    user_id: userId,
    role_id: roleId,
    skill_slug: 'ros2_navigation',
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
  }).select('id').single();
  console.log('Signal insert result:', JSON.stringify(sigRes, null, 2));

  if (sigRes.data?.id) {
    console.log('2. Testing score upsert...');
    const scoreRes = await supabase.from('audit_skill_scores').upsert({
      session_id: auditId,
      user_id: userId,
      role_id: roleId,
      skill_id: 'ros2_nav',
      skill_name: 'ROS2 Navigation',
      score: 70,
      demonstrated_score: 70,
      confidence_score: 70,
      primary_signal_id: sigRes.data.id,
      primary_evidence_id: evidenceId,
      metadata: {},
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id,skill_id' }).select('id').single();
    console.log('Score upsert result:', JSON.stringify(scoreRes, null, 2));

    console.log('3. Testing gap upsert...');
    const gapRes = await supabase.from('audit_skill_gaps').upsert({
      session_id: auditId,
      user_id: userId,
      role_id: roleId,
      skill_id: 'ros2_nav',
      skill_name: 'ROS2 Navigation',
      expected_score: 75,
      demonstrated_score: 70,
      gap: 5,
      priority_weight: 80,
      weighted_gap: 4,
      priority: 'Low',
      gap_status: 'Low',
      evidence_ids: [evidenceId],
      signal_ids: [sigRes.data.id],
      evidence_basis: 'Project notes',
      recommended_action: 'Continue practice',
      mapping_status: 'MAPPED',
      recommended_stage_ids: [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id,skill_id' }).select('id').single();
    console.log('Gap upsert result:', JSON.stringify(gapRes, null, 2));
  }
}

testFinalizeSteps();
