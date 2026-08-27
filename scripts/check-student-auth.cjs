const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const users = await supabase.auth.admin.listUsers();
  console.log('Auth users in Supabase:', users.data.users.map(u => ({ id: u.id, phone: u.phone })));

  // Try creating an audit session with user d0025cd5-724d-4e33-b593-1c5effe6154a
  const res = await supabase.from('audit_sessions').insert({
    user_id: users.data.users[0].id,
    target_role_id: 'd3b1e060-39f5-4fad-ab8a-641844c48313',
    status: 'created'
  }).select();
  console.log('Insert result with existing user:', JSON.stringify(res, null, 2));
}

check();
