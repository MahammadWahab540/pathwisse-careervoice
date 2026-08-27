const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspect2() {
  const streams = await supabase.from('career_streams').select('*').limit(2);
  console.log('career_streams:', JSON.stringify(streams.data, null, 2));

  const sessions = await supabase.from('audit_sessions').select('*').limit(2);
  console.log('audit_sessions:', JSON.stringify(sessions.data, null, 2));

  const users = await supabase.from('users').select('*').limit(2);
  console.log('users table:', JSON.stringify(users.data || users.error, null, 2));

  const students = await supabase.from('students').select('*').limit(2);
  console.log('students table:', JSON.stringify(students.data || students.error, null, 2));
}

inspect2();
