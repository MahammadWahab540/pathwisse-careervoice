const https = require('https');

const baseUrl = 'https://vtmyq2ezci.ap-south-1.awsapprunner.com';

function request(method, endpoint, payload) {
  return new Promise((resolve) => {
    const postData = payload ? JSON.stringify(payload) : null;
    const url = new URL(endpoint, baseUrl);
    const headers = {};
    if (postData) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const req = https.request(url, { method, headers }, (res) => {
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
    if (postData) req.write(postData);
    req.end();
  });
}

async function debugChat() {
  const auditId = '15af2011-f3f9-416a-92fe-0c72c1d0af13';
  const roleId = 'd3b1e060-39f5-4fad-ab8a-641844c48313';

  console.log('Sending chat request...');
  const chatRes = await request('POST', '/api/qalam/chat', {
    auditId,
    userText: "I have experience with Python and ROS2 robot navigation nodes.",
    inputMethod: 'voice',
    clientMessageId: `msg_${Date.now()}_debug`,
    targetRole: 'Robotics Software Engineer Trainee',
    targetRoleId: roleId,
    currentStage: 'architecture_stack_stage'
  });
  console.log('Chat status:', chatRes.status, 'Response:', JSON.stringify(chatRes.json || chatRes.raw, null, 2));

  console.log('\nSending finalize request...');
  const finRes = await request('POST', `/api/audit/${auditId}/finalize`, {});
  console.log('Finalize status:', finRes.status, 'Response:', JSON.stringify(finRes.json || finRes.raw, null, 2));
}

debugChat();
