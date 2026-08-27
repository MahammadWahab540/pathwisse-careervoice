const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listUsers() {
  const res = await supabase.auth.admin.listUsers();
  console.log('Total auth.users:', res.data?.users?.length);
  if (res.data?.users?.length) {
    console.log('Sample user:', JSON.stringify({
      id: res.data.users[0].id,
      phone: res.data.users[0].phone,
      email: res.data.users[0].email,
      created_at: res.data.users[0].created_at
    }, null, 2));
  }
}

listUsers();
