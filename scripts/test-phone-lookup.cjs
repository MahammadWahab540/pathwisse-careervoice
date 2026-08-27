const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function normalizePhoneForOtp(phone) {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

async function findAuthUserIdByPhone(phone) {
  const normalized = normalizePhoneForOtp(phone);
  const profile = await supabase.from('profiles').select('user_id').eq('phone', normalized).maybeSingle();
  console.log('profile lookup:', profile);
  if (profile.data?.user_id) return String(profile.data.user_id);

  for (let page = 1; page <= 10; page += 1) {
    const result = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    console.log('listUsers page', page, result.data?.users?.map(u => ({ id: u.id, phone: u.phone })));
    const user = result.data?.users?.find((item) => normalizePhoneForOtp(item.phone || '') === normalized);
    if (user) return user.id;
    if (!result.data || result.data.users.length < 1000) break;
  }
  return null;
}

async function run() {
  const id = await findAuthUserIdByPhone('+919100886544');
  console.log('Found user ID:', id);
}

run();
