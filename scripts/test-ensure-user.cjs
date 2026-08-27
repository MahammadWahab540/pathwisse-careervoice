const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testEnsureUser() {
  const testId = randomUUID();
  console.log('Testing create user with id:', testId);
  const res = await supabase.auth.admin.createUser({
    id: testId,
    email: `test_${Date.now()}@careervoice.internal`,
    email_confirm: true,
    user_metadata: { phone_verified: true }
  });
  console.log('Created user with specific id result:', JSON.stringify(res, null, 2));

  if (res.data?.user) {
    // Try inserting into audit_sessions with that user
    const auditRes = await supabase.from('audit_sessions').insert({
      user_id: testId,
      target_role_id: 'd3b1e060-39f5-4fad-ab8a-641844c48313',
      status: 'created'
    }).select();
    console.log('audit_sessions insert with new user:', JSON.stringify(auditRes, null, 2));

    // Clean up
    await supabase.from('audit_sessions').delete().eq('id', auditRes.data[0].id);
    await supabase.auth.admin.deleteUser(testId);
  }
}

testEnsureUser();
