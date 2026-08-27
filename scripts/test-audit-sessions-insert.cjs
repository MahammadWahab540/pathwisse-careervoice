const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInsert() {
  const roleId = '8085348d-32a5-4e45-bddb-f0a2d4b3b553';
  const testUserId = randomUUID();

  console.log('Testing insert with user_id:', testUserId);
  const res = await supabase.from('audit_sessions').insert({
    user_id: testUserId,
    target_role_id: roleId,
    status: 'in_progress'
  }).select();

  console.log('Insert result:', JSON.stringify(res, null, 2));

  if (res.data?.[0]) {
    console.log('Columns in audit_sessions:', Object.keys(res.data[0]));
    // Clean up
    await supabase.from('audit_sessions').delete().eq('id', res.data[0].id);
  }
}

testInsert();
