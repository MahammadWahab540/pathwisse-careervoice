const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const serviceConfig = {
  ServiceName: 'pathwisse-careervoice',
  SourceConfiguration: {
    ImageRepository: {
      ImageIdentifier: '439093223097.dkr.ecr.ap-south-1.amazonaws.com/pathwisse-careervoice:latest',
      ImageRepositoryType: 'ECR',
      ImageConfiguration: {
        Port: '5000',
        RuntimeEnvironmentVariables: {
          NODE_ENV: 'production',
          PORT: '5000',
          SUPABASE_URL: 'https://pfzjbazocmgflcogjjrg.supabase.co',
          VITE_SUPABASE_URL: 'https://pfzjbazocmgflcogjjrg.supabase.co',
          OPENROUTER_LLM_MODEL: 'openrouter/free,openrouter/auto',
          OPENROUTER_TTS_MODEL: 'fish-audio/s2.1-pro',
          OPENROUTER_STT_MODEL: 'openai/gpt-4o-mini-transcribe',
          GEMINI_CHAT_MODEL: 'gemini-3.6-flash',
          GEMINI_EVALUATION_MODEL: 'gemini-3.6-flash',
          PIPECAT_SERVICE_URL: 'https://7pmmmiwq7m.ap-south-1.awsapprunner.com'
        },
        RuntimeEnvironmentSecrets: {
          OPENROUTER_API_KEY: 'arn:aws:secretsmanager:ap-south-1:439093223097:secret:careervoice/openrouter-api-key-293eG7',
          GEMINI_API_KEY: 'arn:aws:secretsmanager:ap-south-1:439093223097:secret:careervoice/gemini-api-key-quzJTE',
          CAREERVOICE_SERVICE_TOKEN: 'arn:aws:secretsmanager:ap-south-1:439093223097:secret:careervoice/service-token-bWHDcH',
          PIPECAT_SERVICE_TOKEN: 'arn:aws:secretsmanager:ap-south-1:439093223097:secret:careervoice/service-token-bWHDcH',
          SUPABASE_SERVICE_ROLE_KEY: 'arn:aws:secretsmanager:ap-south-1:439093223097:secret:careervoice/supabase-service-role-key-asGi6s',
          SUPABASE_ANON_KEY: 'arn:aws:secretsmanager:ap-south-1:439093223097:secret:careervoice/supabase-anon-key-W0ZWw2',
          VITE_SUPABASE_ANON_KEY: 'arn:aws:secretsmanager:ap-south-1:439093223097:secret:careervoice/supabase-anon-key-W0ZWw2',
          VITE_SUPABASE_PUBLISHABLE_KEY: 'arn:aws:secretsmanager:ap-south-1:439093223097:secret:careervoice/supabase-anon-key-W0ZWw2',
          OPENAI_API_KEY: 'arn:aws:secretsmanager:ap-south-1:439093223097:secret:careervoice/openai-api-key-LY3fXH',
          DAILY_API_KEY: 'arn:aws:secretsmanager:ap-south-1:439093223097:secret:careervoice/daily-api-key-dgULKZ',
          NOVITA_API_KEY: 'arn:aws:secretsmanager:ap-south-1:439093223097:secret:careervoice/novita-api-key-yhBKJE',
          DEEPGRAM_API_KEY: 'arn:aws:secretsmanager:ap-south-1:439093223097:secret:careervoice/deepgram-api-key-jhqyBs'
        }
      }
    },
    AutoDeploymentsEnabled: false,
    AuthenticationConfiguration: {
      AccessRoleArn: 'arn:aws:iam::439093223097:role/careervoice-apprunner-ecr-access-role'
    }
  },
  InstanceConfiguration: {
    Cpu: '1024',
    Memory: '2048',
    InstanceRoleArn: 'arn:aws:iam::439093223097:role/careervoice-apprunner-runtime-role'
  },
  HealthCheckConfiguration: {
    Protocol: 'TCP',
    Path: '/',
    Interval: 5,
    Timeout: 2,
    HealthyThreshold: 1,
    UnhealthyThreshold: 5
  },
  NetworkConfiguration: {
    EgressConfiguration: {
      EgressType: 'DEFAULT'
    },
    IngressConfiguration: {
      IsPubliclyAccessible: true
    },
    IpAddressType: 'IPV4'
  }
};

const configFile = path.join(process.env.TEMP || 'C:\\temp', `apprunner-config-${Date.now()}.json`);
fs.writeFileSync(configFile, JSON.stringify(serviceConfig, null, 2), 'utf-8');

console.log('Deploying App Runner service...');
try {
  const result = execFileSync('aws.exe', [
    'apprunner',
    'create-service',
    '--cli-input-json',
    `file://${configFile.replace(/\\/g, '/')}`,
    '--region',
    'ap-south-1',
    '--output',
    'json'
  ], {
    encoding: 'utf-8',
    env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }
  });

  const parsed = JSON.parse(result);
  console.log('App Runner Service Created Successfully:');
  console.log(`Service ARN: ${parsed.Service.ServiceArn}`);
  console.log(`Service Name: ${parsed.Service.ServiceName}`);
  console.log(`Service URL: https://${parsed.Service.ServiceUrl}`);
  console.log(`Status: ${parsed.Service.Status}`);
} catch (err) {
  console.error('Error creating App Runner service:', err.message);
  if (err.stdout) console.log('Stdout:', err.stdout.toString());
  if (err.stderr) console.error('Stderr:', err.stderr.toString());
} finally {
  if (fs.existsSync(configFile)) fs.unlinkSync(configFile);
}
