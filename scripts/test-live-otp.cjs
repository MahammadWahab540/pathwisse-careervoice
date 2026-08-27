const https = require('https');

const baseUrl = 'https://vtmyq2ezci.ap-south-1.awsapprunner.com';

function postJson(endpoint, payload) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);
    const url = new URL(endpoint, baseUrl);

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (e) => resolve({ error: e.message }));
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('Testing live OTP request via WhatsApp edge function...');
  const res = await postJson('/api/auth/otp/request', { phone: '+919876543210' });
  console.log('Live /api/auth/otp/request result:', JSON.stringify(res, null, 2));
}

run();
