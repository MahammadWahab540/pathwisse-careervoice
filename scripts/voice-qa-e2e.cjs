const WebSocket = require('ws');

const serviceToken = process.env.PIPECAT_SERVICE_TOKEN || process.env.CAREERVOICE_SERVICE_TOKEN;
const base = (process.env.PIPECAT_SERVICE_URL || 'https://7pmmmiwq7m.ap-south-1.awsapprunner.com').replace(/\/+$/, '');
const auditId = process.env.VOICE_QA_AUDIT_ID || 'audit-replit-e2e-test';

if (!serviceToken) {
  console.error('PIPECAT_SERVICE_TOKEN or CAREERVOICE_SERVICE_TOKEN is required.');
  process.exit(2);
}

const rows = [];

function redact(value) {
  return String(value)
    .replace(/token=[^&"'\s]+/g, 'token=REDACTED')
    .replace(serviceToken, 'REDACTED')
    .slice(0, 320);
}

async function httpCase(name, endpoint, options, check) {
  const start = Date.now();
  try {
    const response = await fetch(`${base}${endpoint}`, options);
    const text = await response.text();
    const pass = check(response.status, text);
    rows.push({
      name,
      endpoint,
      status: response.status,
      latencyMs: Date.now() - start,
      snippet: redact(text),
      pass,
    });
    return { response, text, pass };
  } catch (error) {
    rows.push({
      name,
      endpoint,
      status: 'ERR',
      latencyMs: Date.now() - start,
      snippet: error instanceof Error ? error.message : String(error),
      pass: false,
    });
    return { response: null, text: '', pass: false };
  }
}

async function websocketCase(sessionJson) {
  const connectionUrl = sessionJson?.connection?.url;
  if (!connectionUrl) {
    rows.push({
      name: 'Direct WebSocket handshake/audio probe',
      endpoint: `/ws/voice/${auditId}`,
      status: 'NO_URL',
      latencyMs: 0,
      snippet: 'No WebSocket connection URL returned by session provisioning.',
      pass: false,
    });
    return;
  }

  const url = /^wss?:\/\//i.test(connectionUrl)
    ? connectionUrl
    : `${base.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:')}${connectionUrl}`;

  await new Promise((resolve) => {
    const start = Date.now();
    const messages = [];
    let opened = false;
    let finished = false;
    const ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${sessionJson.token || serviceToken}`,
      },
    });

    function finish(row) {
      if (finished) return;
      finished = true;
      rows.push({
        name: 'Direct WebSocket handshake/audio probe',
        endpoint: `/ws/voice/${auditId}`,
        latencyMs: Date.now() - start,
        ...row,
      });
      try {
        ws.terminate();
      } catch {}
      resolve();
    }

    ws.on('open', () => {
      opened = true;
      ws.send(JSON.stringify({ type: 'start', sampleRate: 16000, encoding: 'pcm_s16le' }));
      const silence = new Int16Array(16000);
      ws.send(silence.buffer);
      ws.send(JSON.stringify({
        type: 'text',
        text: 'I built a distributed microservices platform using React, Node.js, and Redis',
      }));
      setTimeout(() => ws.send(JSON.stringify({ type: 'stop' })), 1500);
    });

    ws.on('message', (data, isBinary) => {
      messages.push(isBinary ? `binary ${data.length}` : data.toString());
    });

    ws.on('error', (error) => {
      finish({
        status: 'WS_ERR',
        snippet: error instanceof Error ? error.message : String(error),
        pass: false,
      });
    });

    ws.on('close', (code, reason) => {
      if (finished) return;
      finish({
        status: opened ? `CLOSE_${code}` : `HTTP_${code || 403}`,
        snippet: opened
          ? redact(messages.join(' | ') || `closed: ${reason.toString()}`)
          : `closed before open: ${reason.toString()}`,
        pass: opened && messages.some((message) => /transcript|assistant|audio|binary/i.test(message)),
      });
    });

    setTimeout(() => {
      finish({
        status: opened ? 'OPEN_TIMEOUT' : 'TIMEOUT',
        snippet: redact(messages.join(' | ') || 'No WebSocket response before timeout.'),
        pass: false,
      });
    }, 12000);
  });
}

(async () => {
  await httpCase(
    'Service liveness',
    '/health',
    { headers: { Authorization: `Bearer ${serviceToken}` } },
    (status, text) => status === 200 && text.includes('websocket') && text.includes('daily') && text.includes('livekit'),
  );

  await httpCase(
    'Service readiness',
    '/ready',
    { headers: { Authorization: `Bearer ${serviceToken}` } },
    (status, text) =>
      status === 200 &&
      ['openrouter', 'openrouterStt', 'openrouterTts', 'openrouterLlm', 'tts', 'llm', 'serviceAuth']
        .every((key) => text.includes(`"${key}":true`)),
  );

  const session = await httpCase(
    'WebSocket session provisioning',
    '/api/voice/session',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceToken}`,
      },
      body: JSON.stringify({
        auditId,
        targetRole: 'Full Stack Developer',
        transport: 'websocket',
      }),
    },
    (status, text) => status === 200 && text.includes('"provider":"websocket"') && text.includes('/ws/voice/'),
  );

  let sessionJson = null;
  try {
    sessionJson = JSON.parse(session.text);
  } catch {}
  await websocketCase(sessionJson);

  console.log(JSON.stringify(rows, null, 2));
})();
