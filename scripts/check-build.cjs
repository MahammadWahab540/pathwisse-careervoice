const { execFileSync } = require('child_process');

const buildId = process.argv[2] || 'pathwisse-careervoice-builder:3509ce4b-fa85-4637-bc88-3ec1261c80c3';

function check() {
  const stdout = execFileSync('aws.exe', [
    'codebuild',
    'batch-get-builds',
    '--ids',
    buildId,
    '--region',
    'ap-south-1',
    '--output',
    'json'
  ], {
    encoding: 'utf-8',
    env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }
  });

  const parsed = JSON.parse(stdout);
  const build = parsed.builds[0];
  console.log(`Phase: ${build.currentPhase} | Status: ${build.buildStatus} | Complete: ${build.buildComplete}`);
  return build;
}

const build = check();
if (build.buildComplete && build.buildStatus === 'FAILED') {
  console.log('Failed phases:', JSON.stringify(build.phases.filter(p => p.phaseStatus === 'FAILED'), null, 2));
}
