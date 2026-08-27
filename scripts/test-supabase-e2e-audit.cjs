const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const baseUrl = 'https://vtmyq2ezci.ap-south-1.awsapprunner.com';
const supabaseUrl = 'https://pfzjbazocmgflcogjjrg.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmempiYXpvY21nZmxjb2dqanJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzMwNTM4NywiZXhwIjoyMTAyODgxMzg3fQ.tfCZ-4ONaeHQOKovP2l2EyzDwZaLtp85VUgK0-MWYV4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

async function runEndToEndValidation() {
  console.log('=====================================================');
  console.log('🚀 RUNNING PHASE 10 REAL END-TO-END SUPABASE AUDIT TEST');
  console.log('=====================================================\n');

  const results = {};

  // TEST 1: Streams fetch (no 42703 error)
  console.log('TEST 1: Fetching career streams...');
  const streamsRes = await request('GET', '/api/streams');
  console.log(`Streams status: ${streamsRes.status}, count: ${Array.isArray(streamsRes.json) ? streamsRes.json.length : 0}`);
  if (streamsRes.status === 200 && Array.isArray(streamsRes.json) && streamsRes.json[0]?.title) {
    console.log('Sample stream title:', streamsRes.json[0].title);
    results['career_streams'] = 'PASS';
  } else {
    results['career_streams'] = 'FAIL';
  }

  // TEST 2: Verify OTP and get real student UUID
  console.log('\nTEST 2: Verifying OTP for phone (+919100886544)...');
  const otpRes = await request('POST', '/api/auth/otp/verify', { phone: '+919100886544', token: '123456' });
  console.log('OTP Verify Result:', JSON.stringify(otpRes.json, null, 2));
  const studentId = otpRes.json?.studentId;
  const isStudentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(studentId);
  console.log(`Student ID: ${studentId} (is UUID: ${isStudentUuid})`);
  results['auth_student_id'] = isStudentUuid ? 'PASS' : 'FAIL';

  // TEST 3: Create real Audit Session in Supabase
  const roleId = 'd3b1e060-39f5-4fad-ab8a-641844c48313'; // Robotics Software Engineer Trainee
  console.log('\nTEST 3: Creating audit session in Supabase for role:', roleId);
  const sessionRes = await request('POST', '/api/audit/session', {
    studentId,
    targetRoleId: roleId,
    context: { branch: 'ECE', phone: '+919100886544' }
  });
  console.log('Audit Session Result:', JSON.stringify(sessionRes.json, null, 2));
  const auditId = sessionRes.json?.auditId;
  const isAuditUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(auditId);
  console.log(`Audit ID: ${auditId} (is UUID: ${isAuditUuid})`);
  results['audit_session_creation'] = isAuditUuid ? 'PASS' : 'FAIL';

  // TEST 4: Persist chat turns into career_voice_transcript_logs
  console.log('\nTEST 4: Sending voice/chat turns...');
  const chatRes1 = await request('POST', '/api/qalam/chat', {
    auditId,
    userText: "I'm interested in building ROS2 and robotics software systems.",
    inputMethod: 'voice',
    clientMessageId: `msg_${Date.now()}_1`,
    targetRole: 'Robotics Software Engineer Trainee',
    targetRoleId: roleId,
    currentStage: 'architecture_stack_stage'
  });
  console.log('Chat Turn 1 Result status:', chatRes1.status, 'Next stage:', chatRes1.json?.currentStage);

  // Check transcript log in Supabase directly
  const { data: transcripts } = await supabase
    .from('career_voice_transcript_logs')
    .select('id, audit_session_id, user_id, actor, content')
    .eq('audit_session_id', auditId);
  console.log(`Direct Supabase transcript rows verified for audit ${auditId}:`, transcripts?.length);
  results['transcript_persistence'] = (transcripts && transcripts.length >= 2) ? 'PASS' : 'FAIL';

  // TEST 5: Upload evidence using real UUID
  console.log('\nTEST 5: Uploading text evidence using audit UUID...');
  const evidenceRes = await request('POST', `/api/audit/${auditId}/evidence`, {
    evidenceType: 'project_notes',
    rawText: 'Built a ROS2 autonomous navigation robot with lidar SLAM and path planning.',
    source: 'project'
  });
  console.log('Evidence Upload Result:', JSON.stringify(evidenceRes.json, null, 2));
  results['evidence_upload'] = evidenceRes.status === 201 ? 'PASS' : 'FAIL';

  // TEST 6: Complete & finalize audit
  console.log('\nTEST 6: Finalizing audit session...');
  const finalizeRes = await request('POST', `/api/audit/${auditId}/finalize`, {});
  console.log(`Finalize status: ${finalizeRes.status}, overallScore: ${finalizeRes.json?.overallScore}, readinessStatus: ${finalizeRes.json?.readinessStatus}`);
  results['audit_completion'] = finalizeRes.status === 200 ? 'PASS' : 'FAIL';

  // TEST 7: Get Report
  console.log('\nTEST 7: Fetching finalized report...');
  const reportRes = await request('GET', `/api/audit/${auditId}/report`);
  console.log(`Report status: ${reportRes.status}, targetRole: ${reportRes.json?.targetRole}`);
  results['report_retrieval'] = reportRes.status === 200 ? 'PASS' : 'FAIL';

  // TEST 8: Get Roadmap Handoff
  console.log('\nTEST 8: Fetching roadmap handoff...');
  const handoffRes = await request('GET', `/api/audit/${auditId}/roadmap-handoff`);
  console.log(`Handoff status: ${handoffRes.status}`);
  results['roadmap_handoff'] = handoffRes.status === 200 ? 'PASS' : 'FAIL';

  // TEST 9: Reject invalid non-UUID identifier with 400 without Postgres 22P02
  console.log('\nTEST 9: Passing invalid "dev_audit_123" to UUID route...');
  const invalidRes = await request('GET', '/api/audit/dev_audit_123/session');
  console.log('Invalid ID rejection status:', invalidRes.status, 'Response:', JSON.stringify(invalidRes.json, null, 2));
  results['invalid_uuid_protection'] = invalidRes.status === 400 && invalidRes.json?.code === 'INVALID_AUDIT_SESSION_ID' ? 'PASS' : 'FAIL';

  console.log('\n=====================================================');
  console.log('📊 SUMMARY TABLE:');
  console.log('=====================================================');
  console.table(results);
}

runEndToEndValidation();
