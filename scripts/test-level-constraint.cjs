const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLevelConstraint() {
  const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'basic', 'intermediate', 'advanced'];
  for (const lvl of levels) {
    const res = await supabase.from('audit_skill_signals').insert({
      session_id: '15af2011-f3f9-416a-92fe-0c72c1d0af13',
      user_id: 'd0025cd5-724d-4e33-b593-1c5effe6154a',
      role_id: 'd3b1e060-39f5-4fad-ab8a-641844c48313',
      skill_slug: 'ros2',
      skill_name: 'ROS2',
      level: lvl,
      idempotency_key: `test_lvl_${lvl}_${Date.now()}`
    }).select('id, level');
    console.log(`Level "${lvl}":`, res.error ? res.error.message : `OK (id: ${res.data[0]?.id})`);
  }
}

testLevelConstraint();
