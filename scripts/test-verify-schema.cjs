const https = require('https');

const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const anonKey = 'sb_publishable_5IxIvt5Ba8m-AFbAnwZXDQ_8jyx9qPX';

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
        try {
          resolve({ function: name, status: res.statusCode, json: JSON.parse(data) });
        } catch {
          resolve({ function: name, status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (e) => resolve({ function: name, error: e.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('Testing payload schemas:');
  const v1 = await testEdgeFunction('verify-whatsapp-otp', {});
  console.log('Empty verify payload:', v1);
}

run();
