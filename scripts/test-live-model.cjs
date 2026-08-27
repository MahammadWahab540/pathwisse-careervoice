const https = require('https');

const baseUrl = 'https://vtmyq2ezci.ap-south-1.awsapprunner.com';

function fetchJson(endpoint) {
  return new Promise((resolve) => {
    https.get(`${baseUrl}${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

async function run() {
  console.log('Testing live /api/health...');
  const health = await fetchJson('/api/health');
  console.log('Live health:', JSON.stringify(health.json, null, 2));
}

run();
