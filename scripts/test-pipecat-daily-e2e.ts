/**
 * CareerVoice Pipecat Voice Agent End-to-End Diagnostic & Integration Test
 * Verifies:
 * 1. Health and /ready probes on AWS App Runner service.
 * 2. Session initiation and Daily.co WebRTC room provisioning.
 * 3. OpenRouter / multi-provider TTS and LLM configuration validation.
 */

async function runPipecatDiagnostic() {
  console.log('=== CareerVoice Pipecat Voice Agent Diagnostics ===\n');

  const remoteUrl = process.env.PIPECAT_SERVICE_URL || 'https://7pmmmiwq7m.ap-south-1.awsapprunner.com';
  const serviceToken = process.env.CAREERVOICE_SERVICE_TOKEN || 'V8ogCSfhVJu-gwU8hexPx4pE0JfUg9QVX4nlOdpDCsU';

  console.log(`Target Voice Service: ${remoteUrl}`);

  // 1. Health Probe
  console.log('\n[1/3] Testing /health liveness probe...');
  try {
    const healthRes = await fetch(`${remoteUrl}/health`);
    const healthData = await healthRes.json();
    console.log(`✓ /health responded (Status ${healthRes.status}):`, healthData);
  } catch (err: any) {
    console.error('✗ /health failed:', err.message);
  }

  // 2. Readiness Probe
  console.log('\n[2/3] Testing /ready provider probe...');
  try {
    const readyRes = await fetch(`${remoteUrl}/ready`);
    const readyData = await readyRes.json();
    console.log(`✓ /ready responded (Status ${readyRes.status}):`);
    console.log(JSON.stringify(readyData, null, 2));
  } catch (err: any) {
    console.error('✗ /ready failed:', err.message);
  }

  // 3. Voice Session Creation
  console.log('\n[3/3] Testing /api/voice/session creation with service token...');
  try {
    const auditId = `diag-test-${Date.now()}`;
    const sessionRes = await fetch(`${remoteUrl}/api/voice/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceToken}`,
      },
      body: JSON.stringify({
        auditId,
        targetRole: 'Full Stack Engineer',
        studentName: 'Diagnostic Candidate',
        transport: 'daily',
      }),
    });

    const sessionData = await sessionRes.json();
    if (sessionRes.ok && sessionData.success) {
      console.log(`✓ Session successfully created (Status ${sessionRes.status})!`);
      console.log(`  - Audit ID: ${sessionData.auditId}`);
      console.log(`  - Provider: ${sessionData.provider}`);
      console.log(`  - Room URL: ${sessionData.roomUrl}`);
      console.log(`  - Token Length: ${sessionData.token ? sessionData.token.length : 0} chars`);
      console.log(`  - Room Name: ${sessionData.connection?.roomName}`);
    } else {
      console.error(`✗ Session creation failed (Status ${sessionRes.status}):`, sessionData);
    }
  } catch (err: any) {
    console.error('✗ Voice session call failed:', err.message);
  }

  console.log('\n=== Diagnostic Completed ===');
}

runPipecatDiagnostic();
