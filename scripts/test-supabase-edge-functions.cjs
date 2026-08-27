const https = require('https');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const anonKey = 'sb_publishable_5IxIvt5Ba8m-AFbAnwZXDQ_8jyx9qPX';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

function testEdgeFunction(name, payload) {
  return new Promise((resolve) => {
    const url = new URL(`/functions/v1/${name}`, supabaseUrl);
    const postData = JSON.stringify(payload);

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ function: name, status: res.statusCode, data });
      });
    });

    req.on('error', (e) => resolve({ function: name, error: e.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('Testing Supabase Edge Functions...');
  const sendRes = await testEdgeFunction('send-whatsapp-otp', { phone: '+919876543210' });
  console.log('send-whatsapp-otp result:', sendRes);

  const verifyRes = await testEdgeFunction('verify-whatsapp-otp', { phone: '+919876543210', otp: '123456' });
  console.log('verify-whatsapp-otp result:', verifyRes);
}

run();
