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
  const auditId = 'dev_audit_2beacc72-c4ec-4473-9377-abefa4cdc299';
  console.log('Testing /api/audit/:auditId/report...');
  const reportRes = await fetchJson(`/api/audit/${auditId}/report`);
  console.log('Report result:', JSON.stringify(reportRes, null, 2));

  console.log('Testing /api/audit/:auditId/roadmap-handoff...');
  const handoffRes = await fetchJson(`/api/audit/${auditId}/roadmap-handoff`);
  console.log('Handoff result:', JSON.stringify(handoffRes, null, 2));
}

run();
