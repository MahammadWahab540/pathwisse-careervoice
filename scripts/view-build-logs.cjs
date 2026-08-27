const { execFileSync } = require('child_process');

const buildId = process.argv[2] || '3509ce4b-fa85-4637-bc88-3ec1261c80c3';

try {
  const stdout = execFileSync('aws.exe', [
    'logs',
    'get-log-events',
    '--log-group-name',
    '/aws/codebuild/pathwisse-careervoice-builder',
    '--log-stream-name',
    buildId.includes(':') ? buildId.split(':')[1] : buildId,
    '--region',
    'ap-south-1',
    '--output',
    'json'
  ], {
    encoding: 'utf-8',
    env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }
  });

  const parsed = JSON.parse(stdout);
  parsed.events.slice(-50).forEach(e => console.log(e.message));
} catch (err) {
  console.error('Error fetching logs:', err.message);
  if (err.stdout) console.log('Stdout:', err.stdout.toString());
  if (err.stderr) console.error('Stderr:', err.stderr.toString());
}
