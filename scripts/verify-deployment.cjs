const https = require('https');

const baseUrl = 'https://vtmyq2ezci.ap-south-1.awsapprunner.com';

function fetchJson(endpoint) {
  return new Promise((resolve, reject) => {
    https.get(`${baseUrl}${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('=== Verifying Pathwisse CareerVoice Live Deployment ===');
  console.log(`Target: ${baseUrl}`);

  try {
    const health = await fetchJson('/api/health');
    console.log('\n[/api/health]:', JSON.stringify(health, null, 2));

    const readiness = await fetchJson('/api/readiness');
    console.log('\n[/api/readiness]:', JSON.stringify(readiness, null, 2));

    const supabaseHealth = await fetchJson('/api/supabase/health');
    console.log('\n[/api/supabase/health]:', JSON.stringify(supabaseHealth, null, 2));

    const modelsHealth = await fetchJson('/api/models/health');
    console.log('\n[/api/models/health]:', JSON.stringify(modelsHealth, null, 2));

    const root = await fetchJson('/');
    console.log('\n[/ root HTML]: Status', root.status, '| HTML Length:', root.raw ? root.raw.length : 'JSON');
  } catch (err) {
    console.error('Verification failed:', err);
  }
}

verify();
