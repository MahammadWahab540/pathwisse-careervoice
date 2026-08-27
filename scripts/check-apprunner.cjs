const { execFileSync } = require('child_process');

const serviceArn = 'arn:aws:apprunner:ap-south-1:439093223097:service/pathwisse-careervoice/ab7ef2ff30504cd683c6aeafb627192a';

try {
  const result = execFileSync('aws.exe', [
    'apprunner',
    'describe-service',
    '--service-arn',
    serviceArn,
    '--region',
    'ap-south-1',
    '--output',
    'json'
  ], {
    encoding: 'utf-8',
    env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }
  });

  const parsed = JSON.parse(result);
  console.log(`Service: ${parsed.Service.ServiceName} | Status: ${parsed.Service.Status} | URL: https://${parsed.Service.ServiceUrl}`);
} catch (err) {
  console.error('Error checking service:', err.message);
  if (err.stdout) console.log('Stdout:', err.stdout.toString());
  if (err.stderr) console.error('Stderr:', err.stderr.toString());
}
