import express from 'express';
import http from 'http';
import path from 'path';
import { GoogleGenAI, Type, Modality, LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK with user-agent header
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// HTTP & WebSocket Server Creation
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  if (!ai) {
    clientWs.send(JSON.stringify({ type: 'error', error: 'GEMINI_API_KEY is not configured on server' }));
    return;
  }

  try {
    const session = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
        },
        systemInstruction: `You are Qalam, Pathwisse's interactive AI Career Auditor mascot.
You conduct real-time interactive voice career audits. Speak in a warm, intelligent, concise tone (2-3 sentences max).
Probe the student for actual evidence of applied skills, software projects, libraries used, and engineering challenges. Keep responses natural and conversational.`,
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'audio', audio }));
          }
          if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }
          if (message.serverContent?.turnComplete && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'turnComplete' }));
          }
          const outText = message.serverContent?.outputTranscription?.text;
          if (outText && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'outputText', text: outText }));
          }
          const inText = message.serverContent?.inputTranscription?.text;
          if (inText && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'inputText', text: inText }));
          }
        },
        onclose: () => {
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'closed' }));
          }
        },
        onerror: (err) => {
          console.error('Gemini Live Error:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'error', error: err?.message || 'Live session error' }));
          }
        },
      },
    });

    clientWs.on('message', (rawMsg) => {
      try {
        const msg = JSON.parse(rawMsg.toString());
        if (msg.audio) {
          session.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (msg.text) {
          session.sendRealtimeInput({
            text: msg.text,
          });
        }
      } catch (e) {
        console.error('WebSocket Client Msg Error:', e);
      }
    });

    clientWs.on('close', () => {
      try {
        session.close();
      } catch (e) {
        // ignore
      }
    });
  } catch (err: any) {
    console.error('Failed to initiate Gemini Live connection:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'error', error: err.message }));
    }
  }
});

// In-Memory Storage for Analytics & Sessions
const analyticsEventsStore: any[] = [];
const auditSessionsStore: Record<string, any> = {};

// API Endpoint: Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!ai,
    timestamp: new Date().toISOString(),
  });
});

// API Endpoint: Get Published Career Streams
app.get('/api/streams', (req, res) => {
  res.json([
    { id: 'cs_eng', title: 'Computer Science Engineering', description: 'Software development, AI, data science, cybersecurity & cloud systems.' },
    { id: 'ece_eng', title: 'Electronics & Communication Engineering', description: 'Embedded systems, VLSI design, IoT, PCB & telecom systems.' },
    { id: 'ee_eng', title: 'Electrical Engineering', description: 'Power systems, smart grids, control systems & automation.' },
    { id: 'mech_eng', title: 'Mechanical Engineering', description: 'CAD design, HVAC, manufacturing processes, FEA & robotics.' },
    { id: 'civil_eng', title: 'Civil Engineering', description: 'Structural engineering, BIM modelling, site management & urban planning.' },
    { id: 'chem_eng', title: 'Chemical Engineering', description: 'Process engineering, plant operations, quality assurance & petrochemicals.' },
    { id: 'biomed_eng', title: 'Biomedical Engineering', description: 'Medical device design, clinical instrumentation & biomechanics.' },
    { id: 'aero_eng', title: 'Aerospace Engineering', description: 'Aerodynamics, avionics systems, propulsion & flight testing.' },
    { id: 'enviro_eng', title: 'Environmental Engineering', description: 'Environmental impact assessment, water management & sustainability.' },
    { id: 'industrial_eng', title: 'Industrial & Manufacturing Engineering', description: 'Process improvement, lean operations, supply chain & quality control.' },
    { id: 'petro_eng', title: 'Petroleum Engineering', description: 'Reservoir engineering, drilling operations & production technology.' },
    { id: 'robotics_eng', title: 'Robotics & Automation Engineering', description: 'Robotics software, ROS systems, mechatronics & motion control.' },
    { id: 'materials_eng', title: 'Materials Science Engineering', description: 'Metallurgy, composites, polymers & structural materials analysis.' },
  ]);
});

// API Endpoint: Get Published Career Roles by Stream ID
app.get('/api/roles', (req, res) => {
  const { streamId } = req.query;
  const allRoles = [
    {
      id: 'junior_ml_engineer',
      streamId: 'cs_eng',
      title: 'Junior ML Engineer',
      category: 'AI & Data Science',
      description: 'Build, train, evaluate, and deploy machine learning and LLM models for real-world applications.',
      demandLevel: 'Extremely High',
      keySkills: ['Python', 'PyTorch / TensorFlow', 'FastAPI', 'Docker'],
      status: 'published',
      matchType: 'Strong match',
      fitReason: 'Matches strong analytical thinking and interest in building intelligent systems.',
    },
    {
      id: 'full_stack_dev_junior',
      streamId: 'cs_eng',
      title: 'Full Stack Developer (Junior)',
      category: 'Software Engineering',
      description: 'Develop responsive frontend interfaces and secure backend APIs for modern web applications.',
      demandLevel: 'High',
      keySkills: ['React & TypeScript', 'Node.js / Express', 'PostgreSQL / SQL', 'Tailwind CSS'],
      status: 'published',
      matchType: 'Strong match',
      fitReason: 'Great fit for students interested in end-to-end product development.',
    },
    {
      id: 'data_analyst_junior',
      streamId: 'cs_eng',
      title: 'Data Analyst',
      category: 'Analytics',
      description: 'Extract insights from complex databases using SQL, Python, and BI dashboards.',
      demandLevel: 'High',
      keySkills: ['SQL & Query Tuning', 'Python & Pandas', 'Power BI / Tableau'],
      status: 'published',
      matchType: 'Worth exploring',
      fitReason: 'Ideal for students who enjoy uncovering patterns and telling stories with data.',
    },
  ];

  if (streamId) {
    const filtered = allRoles.filter((r) => r.streamId === streamId && r.status === 'published');
    return res.json(filtered.length > 0 ? filtered : allRoles);
  }
  res.json(allRoles);
});

// API Endpoint: Qalam AI Chat & Adaptive Probing
app.post('/api/qalam/chat', async (req, res) => {
  try {
    const {
      userText,
      history = [],
      studentContext = {},
      targetRole = 'AI / ML Engineer',
      currentStage = 'adaptive_questions',
    } = req.body;

    if (!ai) {
      // Graceful fallback if GEMINI_API_KEY is not set
      return res.json({
        qalamText: `I heard you! Regarding ${targetRole}, tell me about a project or problem you solved recently using your skills.`,
        qalamState: 'CURIOUS',
        followUpQuestion: 'What was the trickiest part of that build?',
        extractedSkills: [{ skill: 'Problem Solving', level: 'Intermediate' }],
      });
    }

    const systemInstruction = `You are Qalam, Pathwisse's AI Career Auditor.
Your personality is calm, intelligent, encouraging, highly perceptive, and constructive. You are NOT a generic assistant or chatbot; you act like a top-tier tech mentor and engineering interviewer conducting a 1-on-1 career audit.

Target Role: ${targetRole}
Student Context: ${JSON.stringify(studentContext)}
Current Stage: ${currentStage}

Rules for Qalam:
1. Speak in concise, warm, natural sentences (2-3 sentences max per turn).
2. Never give fake praise or dry lists. Always probe for actual evidence of applied skills rather than asking them to self-rate from 1-10.
3. If they mention a skill (e.g., Python, SQL, React), ask what they actually built with it or what libraries/tools they used.
4. Select one appropriate Qalam emotion state from: 'WELCOME', 'LISTENING', 'SPEAKING', 'THINKING', 'CURIOUS', 'SURPRISED', 'ENCOURAGING', 'CELEBRATING'.
5. Always maintain focus on diagnosing career readiness for Pathwisse's roadmap.`;

    const promptText = `Student's latest response: "${userText}"
Conversation history: ${JSON.stringify(history.slice(-6))}

Respond in valid JSON format matching this schema:
{
  "qalamText": "What Qalam says back to the student",
  "qalamState": "CURIOUS" | "ENCOURAGING" | "SPEAKING" | "SURPRISED" | "CELEBRATING",
  "followUpQuestion": "A targeted follow-up question probing for technical or project evidence",
  "extractedSkills": [
    { "skill": "Skill Name", "level": "Beginner" | "Intermediate" | "Advanced" }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            qalamText: { type: Type.STRING },
            qalamState: { type: Type.STRING },
            followUpQuestion: { type: Type.STRING },
            extractedSkills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  skill: { type: Type.STRING },
                  level: { type: Type.STRING },
                },
                required: ['skill', 'level'],
              },
            },
          },
          required: ['qalamText', 'qalamState', 'followUpQuestion'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');

    res.json({
      qalamText: parsed.qalamText || 'That gives me great insight into your baseline.',
      qalamState: parsed.qalamState || 'CURIOUS',
      followUpQuestion: parsed.followUpQuestion || 'What project are you most proud of building so far?',
      extractedSkills: parsed.extractedSkills || [],
    });
  } catch (error: any) {
    console.error('Qalam Chat Error:', error);
    res.status(500).json({
      qalamText: "That's helpful context. Let's explore your practical project experience next.",
      qalamState: 'CURIOUS',
      error: error.message,
    });
  }
});

// API Endpoint: Qalam Comprehensive Career Evaluation & Roadmap Generation
app.post('/api/qalam/evaluate', async (req, res) => {
  try {
    const {
      studentContext = {},
      targetRole = 'AI / ML Engineer',
      conversationHistory = [],
      communicationSample = '',
      evidenceData = {},
    } = req.body;

    if (!ai) {
      // Deterministic fallback response if AI key is pending
      return res.json({
        overallScore: 43,
        dimensionScores: {
          careerClarity: 68,
          technicalReadiness: 41,
          projectReadiness: 29,
          communication: 55,
          placementReadiness: 37,
          executionReadiness: 50,
        },
        diagnosisSummary:
          "You're currently strongest in core technical concepts. The main blocker holding you back from looking like a competitive " +
          targetRole +
          " candidate is proof of deployed projects and structured GitHub evidence.",
        gaps: [
          {
            id: 'gap_1',
            title: 'No Deployed Production Project',
            severity: 'RED',
            description: 'Lacks a publicly accessible live API or web application showing end-to-end implementation.',
            recommendedAction: 'Build and deploy a containerized microservice to Cloud Run/Vercel.',
          },
          {
            id: 'gap_2',
            title: 'Statistical & Applied Foundation Gap',
            severity: 'RED',
            description: 'Requires stronger mathematical rigor in optimization, cross-validation, and metrics.',
            recommendedAction: 'Complete Pathwisse Module 1 on Applied Math & Statistics.',
          },
          {
            id: 'gap_3',
            title: 'GitHub & Evidence Portfolio Weakness',
            severity: 'ORANGE',
            description: 'Repository structure lacks clean documentation, tests, and architectural diagrams.',
            recommendedAction: 'Restructure top 2 repositories with production READMEs.',
          },
        ],
      });
    }

    const promptText = `Analyze this student's career audit session for the role of "${targetRole}".

Student Background: ${JSON.stringify(studentContext)}
Conversation Audit Logs: ${JSON.stringify(conversationHistory)}
60-Second Communication Intro: "${communicationSample}"
Evidence Uploaded: ${JSON.stringify(evidenceData)}

Provide a rigorous, constructive career audit evaluation.
Calculate realistic 0-100 scores across 6 dimensions:
1. careerClarity (Does the student understand what the role actually entails day-to-day?)
2. technicalReadiness (Do they possess core technical/theoretical knowledge?)
3. projectReadiness (Have they built and deployed real applied projects?)
4. communication (Structure, clarity, confidence, filler words, technical articulation)
5. placementReadiness (Resume, GitHub, portfolio, interview preparedness)
6. executionReadiness (Discipline, consistency, time availability)

Calculate the overall weighted Career Readiness Score (0-100).
Identify 3 to 5 specific Gaps with severity:
- RED: Critical blockers preventing interview calls.
- ORANGE: Moderate gaps needing improvement.
- GREEN: Strong foundational strengths to highlight.

Provide a constructive 2-3 sentence tone-neutral diagnosis summary.

Format output as JSON:
{
  "overallScore": 43,
  "dimensionScores": {
    "careerClarity": 68,
    "technicalReadiness": 41,
    "projectReadiness": 29,
    "communication": 55,
    "placementReadiness": 37,
    "executionReadiness": 50
  },
  "diagnosisSummary": "You are currently strongest in...",
  "gaps": [
    {
      "id": "gap_1",
      "title": "Title of Gap",
      "severity": "RED",
      "description": "Why this holds them back",
      "recommendedAction": "Actionable Pathwisse step"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error: any) {
    console.error('Qalam Evaluate Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Endpoint: Analytics Tracking (PostHog & Supabase style instrumentation)
app.post('/api/analytics/track', (req, res) => {
  const eventData = req.body;
  if (!eventData.eventName) {
    return res.status(400).json({ error: 'eventName is required' });
  }

  const enrichedEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...eventData,
  };

  analyticsEventsStore.push(enrichedEvent);

  // Maintain max 1000 events in memory
  if (analyticsEventsStore.length > 1000) {
    analyticsEventsStore.shift();
  }

  res.json({ success: true, eventId: enrichedEvent.id });
});

// API Endpoint: Analytics Dashboard Metrics
app.get('/api/analytics/stats', (req, res) => {
  const totalEvents = analyticsEventsStore.length;
  const sessions = new Set(analyticsEventsStore.map((e) => e.sessionId)).size;

  const funnelCounts = {
    landingViewed: analyticsEventsStore.filter((e) => e.eventName === 'career_audit_landing_viewed').length,
    auditStarted: analyticsEventsStore.filter((e) => e.eventName === 'career_audit_started').length,
    phoneSubmitted: analyticsEventsStore.filter((e) => e.eventName === 'phone_submitted').length,
    otpVerified: analyticsEventsStore.filter((e) => e.eventName === 'otp_verified').length,
    voiceSessionStarted: analyticsEventsStore.filter((e) => e.eventName === 'voice_session_started').length,
    audit25: analyticsEventsStore.filter((e) => e.eventName === 'audit_progress_25').length,
    audit50: analyticsEventsStore.filter((e) => e.eventName === 'audit_progress_50').length,
    audit75: analyticsEventsStore.filter((e) => e.eventName === 'audit_progress_75').length,
    auditCompleted: analyticsEventsStore.filter((e) => e.eventName === 'audit_completed').length,
    roadmapViewed: analyticsEventsStore.filter((e) => e.eventName === 'roadmap_preview_viewed').length,
    upgradeClicked: analyticsEventsStore.filter((e) => e.eventName === 'upgrade_clicked').length,
  };

  const voiceInteractions = analyticsEventsStore.filter((e) => e.inputMethod === 'voice').length;
  const tapInteractions = analyticsEventsStore.filter((e) => e.inputMethod === 'tap' || e.inputMethod === 'type').length;

  res.json({
    totalEvents,
    totalSessions: sessions || 1,
    funnel: funnelCounts,
    voiceVsTap: { voice: voiceInteractions, tap: tapInteractions },
    recentEvents: analyticsEventsStore.slice(-25).reverse(),
  });
});

// Start Express Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Pathwisse Qalam Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
