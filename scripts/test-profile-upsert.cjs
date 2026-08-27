const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProfileUpsert() {
  const phone = '+919100886544';
  
  // 1. Try creating auth user
  console.log('1. Creating auth user for phone:', phone);
  const created = await supabase.auth.admin.createUser({
    phone,
    phone_confirm: true,
    user_metadata: { phone_verified: true, whatsapp_opt_in: true },
  });
  console.log('createUser result:', JSON.stringify(created, null, 2));

  const userId = created.data?.user?.id;
  if (!userId) return;

  // 2. Try profiles table
  console.log('2. Upserting into profiles table...');
  const profileRes = await supabase.from('profiles').upsert({
    user_id: userId,
    phone,
    phone_verified: true,
    whatsapp_opt_in: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' }).select();
  console.log('profiles result:', JSON.stringify(profileRes, null, 2));

  // 3. Try student_profiles table
  console.log('3. Upserting into student_profiles table...');
  const studentProfileRes = await supabase.from('student_profiles').upsert({
    id: userId,
    phone,
    first_name: 'Mahammad',
    updated_at: new Date().toISOString(),
  }).select();
  console.log('student_profiles result:', JSON.stringify(studentProfileRes, null, 2));

  // 4. Try audit_sessions insert now with real auth user id
  console.log('4. Inserting into audit_sessions with real auth userId:', userId);
  const auditRes = await supabase.from('audit_sessions').insert({
    user_id: userId,
    target_role_id: '8085348d-32a5-4e45-bddb-f0a2d4b3b553',
    status: 'in_progress'
  }).select();
  console.log('audit_sessions insert result:', JSON.stringify(auditRes, null, 2));
}

testProfileUpsert();
