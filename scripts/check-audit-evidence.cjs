const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEvidence() {
  const res = await supabase.from('audit_evidence').insert({
    session_id: '15af2011-f3f9-416a-92fe-0c72c1d0af13',
    user_id: 'd0025cd5-724d-4e33-b593-1c5effe6154a',
    evidence_type: 'test',
    raw_text: 'test'
  }).select();
  console.log('insert audit_evidence result:', JSON.stringify(res, null, 2));
}

checkEvidence();
