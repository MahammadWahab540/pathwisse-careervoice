const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const serviceArn = 'arn:aws:apprunner:ap-south-1:439093223097:service/pathwisse-careervoice/ab7ef2ff30504cd683c6aeafb627192a';

const sourceConfig = {
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
};

const tmpPath = path.join(__dirname, 'source-config.json');
fs.writeFileSync(tmpPath, JSON.stringify(sourceConfig, null, 2));

console.log('Updating App Runner source configuration with OPENROUTER_LLM_MODEL: openrouter/free,openrouter/auto ...');
const res = execFileSync('aws', [
  'apprunner',
  'update-service',
  '--service-arn', serviceArn,
  '--source-configuration', `file://${tmpPath}`,
  '--region', 'ap-south-1'
], { encoding: 'utf-8' });

console.log('Update result:', res);
