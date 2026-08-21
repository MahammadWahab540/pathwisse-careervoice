import express from 'express';
import http from 'http';
import path from 'path';
import { GoogleGenAI, Type, Modality, LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { getSupabase, SUPABASE_SQL_SCHEMA } from './src/lib/supabase';

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

// API Endpoint: Qalam AI Chat & Adaptive Probing with Weak Evidence Detection
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
        qalamText: `I noted that regarding ${targetRole}. Tell me about a specific project, API, or system you personally built.`,
        qalamState: 'CURIOUS',
        followUpQuestion: 'Can you walk me through the exact libraries, model architecture, or database queries you wrote?',
        evidenceStrength: 'Weak',
        needsFollowUp: true,
        extractedSkills: [{ skill: 'Core Knowledge', level: 'Intermediate', confidence: 60 }],
      });
    }

    const systemInstruction = `You are Qalam, Pathwisse's elite Career Guide and Career Auditor for engineering students.
You are NOT a generic assistant, generic chatbot, or supportive cheerleader. You act like a top-tier Principal Engineer and technical interviewer conducting a rigorous 1-on-1 career audit.

Role Being Audited: ${targetRole}
Student Academic Context: ${JSON.stringify(studentContext)}
Current Audit Stage: ${currentStage}

Core Responsibilities:
1. Act as a discerning Career Auditor: Verify claimed skills against demonstrable proof of work.
2. Probe Weak Evidence: If the student gives vague claims (e.g. "I know Python", "I made a website", "I did machine learning"), detect that evidence is WEAK and formulate a sharp, constructive follow-up question asking for specific libraries, data structures, deployment URLs, or trade-offs.
3. Keep responses warm, concise, and professional (2-3 sentences max).
4. Always categorize extracted skills with a realistic proficiency ('Beginner' | 'Intermediate' | 'Advanced') and confidence score (0-100).
5. Select an appropriate emotion: 'WELCOME', 'LISTENING', 'SPEAKING', 'THINKING', 'CURIOUS', 'SURPRISED', 'ENCOURAGING', 'CELEBRATING'.`;

    const promptText = `Student's latest response: "${userText}"
Conversation history: ${JSON.stringify(history.slice(-6))}

Respond in valid JSON format matching this schema:
{
  "qalamText": "Qalam's immediate evaluation and spoken response to the student",
  "qalamState": "CURIOUS" | "ENCOURAGING" | "SPEAKING" | "SURPRISED" | "CELEBRATING" | "THINKING",
  "evidenceStrength": "Strong" | "Moderate" | "Weak" | "None",
  "needsFollowUp": boolean,
  "followUpQuestion": "A targeted follow-up probing for concrete technical code/project evidence if the previous claim lacked depth",
  "extractedSkills": [
    { "skill": "Skill Name", "level": "Beginner" | "Intermediate" | "Advanced", "confidence": number }
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
            evidenceStrength: { type: Type.STRING },
            needsFollowUp: { type: Type.BOOLEAN },
            followUpQuestion: { type: Type.STRING },
            extractedSkills: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  skill: { type: Type.STRING },
                  level: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
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
      qalamText: parsed.qalamText || 'That provides useful baseline insight.',
      qalamState: parsed.qalamState || 'CURIOUS',
      evidenceStrength: parsed.evidenceStrength || 'Moderate',
      needsFollowUp: !!parsed.needsFollowUp,
      followUpQuestion: parsed.followUpQuestion || 'What was the most challenging technical roadblock you solved in that project?',
      extractedSkills: parsed.extractedSkills || [],
    });
  } catch (error: any) {
    console.error('Qalam Chat Error:', error);
    res.status(500).json({
      qalamText: "That's helpful context. Let's dig into your applied technical implementation.",
      qalamState: 'CURIOUS',
      evidenceStrength: 'Moderate',
      needsFollowUp: false,
      followUpQuestion: 'Can you describe the project architecture in detail?',
      extractedSkills: [],
      error: error.message,
    });
  }
});

// API Endpoint: Qalam Comprehensive Career Evaluation & Diagnostic Chain Generation
// Every report conclusion MUST follow: Student Answer → Evidence → Skill → Score → Gap → Recommended Action.
app.post('/api/qalam/evaluate', async (req, res) => {
  try {
    const {
      studentContext = {},
      targetRole = 'AI / ML Engineer',
      conversationHistory = [],
      communicationSample = '',
      evidenceData = {},
      isReAudit = false,
      completedMilestones = [],
    } = req.body;

    if (!ai) {
      // Deterministic fallback response if AI key is pending
      const baseScore = isReAudit ? 62 : 44;
      return res.json({
        overallScore: baseScore,
        dimensionScores: {
          careerClarity: isReAudit ? 78 : 68,
          technicalReadiness: isReAudit ? 58 : 42,
          projectReadiness: isReAudit ? 52 : 30,
          communication: 60,
          placementReadiness: isReAudit ? 54 : 38,
          executionReadiness: 65,
        },
        diagnosisSummary: isReAudit
          ? `Substantial progress detected for ${targetRole}! You have bridged key gaps in core architecture. Next milestone: deploy a live end-to-end containerized service.`
          : `You demonstrate solid theoretical awareness for ${targetRole}, but your biggest hireability blocker is a lack of publicly verifiable deployed projects and GitHub evidence.`,
        diagnosticConclusions: [
          {
            id: 'diag_1',
            skillName: 'Production Machine Learning & Model Deployment',
            studentAnswerSnippet: 'Explained training models in Jupyter notebooks with basic dataset split.',
            evidenceVerified: evidenceData?.gitHubUrl ? 'GitHub repository provided; missing automated tests & Dockerfile' : 'No live demo link or Docker packaging provided',
            evidenceStrength: 'Weak',
            score: 38,
            confidenceScore: 85,
            confidenceLevel: 'High',
            gapSeverity: 'RED',
            gapDescription: 'Models exist only locally in notebooks without containerized APIs or cloud endpoints.',
            recommendedAction: 'Build and deploy a FastAPI inference endpoint on Cloud Run or Vercel.',
          },
          {
            id: 'diag_2',
            skillName: 'Mathematical Foundations & Optimization',
            studentAnswerSnippet: 'Mentioned using standard library loss functions without custom loss derivation.',
            evidenceVerified: 'Interview response showed familiarity with gradient descent concepts.',
            evidenceStrength: 'Moderate',
            score: 55,
            confidenceScore: 80,
            confidenceLevel: 'High',
            gapSeverity: 'ORANGE',
            gapDescription: 'Understands intuition but lacks mathematical rigor in backpropagation & metric optimization.',
            recommendedAction: 'Complete Pathwisse Module 1 on Applied Linear Algebra & Custom Loss Functions.',
          },
          {
            id: 'diag_3',
            skillName: 'Engineering Rigor & Documentation',
            studentAnswerSnippet: 'Mentioned basic Git commits without CI/CD or architectural README.',
            evidenceVerified: evidenceData?.gitHubUrl ? 'GitHub profile attached' : 'No repo URL attached',
            evidenceStrength: 'Moderate',
            score: 48,
            confidenceScore: 75,
            confidenceLevel: 'Medium',
            gapSeverity: 'ORANGE',
            gapDescription: 'Repositories lack structured README benchmarks, architecture diagrams, and environment isolation.',
            recommendedAction: 'Upgrade top 2 repositories with production-grade documentation and system architecture diagrams.',
          }
        ],
        gaps: [
          {
            id: 'gap_1',
            title: 'No Live Deployed Production Project',
            severity: 'RED',
            description: 'Lacks a publicly accessible live API or web application demonstrating end-to-end deployment.',
            recommendedAction: 'Build and deploy a containerized microservice on Cloud Run/Vercel.',
            associatedSkill: 'Production Machine Learning & Model Deployment',
            evidenceBasis: 'Notebook code without production API endpoint',
          },
          {
            id: 'gap_2',
            title: 'Mathematical Optimization & Statistical Depth',
            severity: 'ORANGE',
            description: 'Requires deeper grounding in loss derivation, regularization, and mathematical optimization.',
            recommendedAction: 'Complete Pathwisse Module 1 on Applied Math & Statistics.',
            associatedSkill: 'Mathematical Foundations & Optimization',
            evidenceBasis: 'Conceptual explanation without quantitative formulation',
          },
          {
            id: 'gap_3',
            title: 'Public GitHub Code Rigor & Documentation',
            severity: 'ORANGE',
            description: 'Repositories need clean environment locks, test suites, and architectural diagrams.',
            recommendedAction: 'Restructure top 2 repositories with production READMEs.',
            associatedSkill: 'Engineering Rigor & Documentation',
            evidenceBasis: 'Unstructured repository commit history',
          },
        ],
      });
    }

    const promptText = `You are Qalam, Pathwisse's AI Career Auditor conducting a strict Career Readiness Audit for the role of "${targetRole}".

Student Background: ${JSON.stringify(studentContext)}
Conversation Audit Logs: ${JSON.stringify(conversationHistory)}
60-Second Communication Intro: "${communicationSample}"
Uploaded Proof & Evidence: ${JSON.stringify(evidenceData)}
Is Re-Audit: ${isReAudit}
Completed Milestones: ${JSON.stringify(completedMilestones)}

AUDIT DIRECTIVE:
Act as a rigorous Career Guide and Career Auditor. For every major skill tested, you MUST generate a complete diagnostic conclusion following this exact 6-stage chain:
1. Student Answer (Student's verbatim claim or interview answer snippet)
2. Evidence Verified (What concrete proof was found in code/demo/resume vs missing)
3. Skill (The core engineering competency)
4. Score & Confidence (Score 0-100, Confidence Score 0-100, Confidence Level 'High' | 'Medium' | 'Low')
5. Identified Gap (Severity 'RED' | 'ORANGE' | 'GREEN', Description)
6. Recommended Action (Specific Pathwisse milestone fix)

Also calculate 0-100 dimension scores:
- careerClarity (Role understanding)
- technicalReadiness (Depth of core knowledge)
- projectReadiness (Proof of real built/deployed systems)
- communication (Clarity, structure, technical defense)
- placementReadiness (Resume/GitHub proof)
- executionReadiness (Weekly commitment & momentum)

Provide overall weighted Career Readiness Score (0-100) and a concise, constructive 2-3 sentence tone-neutral diagnosis summary.

Format output as valid JSON matching this schema:
{
  "overallScore": 44,
  "dimensionScores": {
    "careerClarity": 68,
    "technicalReadiness": 42,
    "projectReadiness": 30,
    "communication": 60,
    "placementReadiness": 38,
    "executionReadiness": 65
  },
  "diagnosisSummary": "Constructive 2-3 sentence summary...",
  "diagnosticConclusions": [
    {
      "id": "diag_1",
      "skillName": "Name of Skill",
      "studentAnswerSnippet": "What the student said in audit...",
      "evidenceVerified": "What concrete evidence was verified or missing...",
      "evidenceStrength": "Strong" | "Moderate" | "Weak" | "None",
      "score": 42,
      "confidenceScore": 85,
      "confidenceLevel": "High" | "Medium" | "Low",
      "gapSeverity": "RED" | "ORANGE" | "GREEN",
      "gapDescription": "Specific gap holding them back...",
      "recommendedAction": "Concrete Pathwisse action step..."
    }
  ],
  "gaps": [
    {
      "id": "gap_1",
      "title": "Title of Gap",
      "severity": "RED" | "ORANGE" | "GREEN",
      "description": "Why this holds them back",
      "recommendedAction": "Actionable Pathwisse step",
      "associatedSkill": "Associated Skill Name",
      "evidenceBasis": "Why this gap was flagged based on evidence"
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

// API Endpoint: Supabase BaaS Status & Schema Check
app.get('/api/supabase/status', async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    return res.json({
      configured: false,
      message: 'SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not configured yet in environment variables.',
      schemaSql: SUPABASE_SQL_SCHEMA,
    });
  }

  try {
    const { data, error } = await supabase.from('student_profiles').select('id').limit(1);
    if (error) {
      return res.json({
        configured: true,
        connected: false,
        message: `Connected to Supabase project, but table check returned: ${error.message}. Make sure to execute the schema in Supabase SQL editor.`,
        schemaSql: SUPABASE_SQL_SCHEMA,
      });
    }

    return res.json({
      configured: true,
      connected: true,
      message: 'Successfully connected to Supabase BaaS! Tables are active and ready.',
      schemaSql: SUPABASE_SQL_SCHEMA,
    });
  } catch (err: any) {
    return res.json({
      configured: true,
      connected: false,
      message: err.message,
      schemaSql: SUPABASE_SQL_SCHEMA,
    });
  }
});

// API Endpoint: Sync Student Profile with Supabase BaaS
app.post('/api/supabase/profile/sync', async (req, res) => {
  const supabase = getSupabase();
  const profileData = req.body;

  if (!supabase) {
    return res.json({
      synced: false,
      fallback: 'local_storage',
      message: 'Supabase credentials not set, profile saved in local memory.',
    });
  }

  try {
    const { data, error } = await supabase
      .from('student_profiles')
      .upsert(
        {
          phone: profileData.phone,
          first_name: profileData.firstName || profileData.first_name,
          college_tier: profileData.collegeTier || profileData.college_tier,
          college_name: profileData.collegeName || profileData.college_name,
          branch: profileData.branch,
          grad_year: profileData.gradYear || profileData.grad_year,
          career_intent: profileData.careerIntent || profileData.career_intent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'phone' }
      )
      .select();

    if (error) {
      console.error('Supabase profile upsert error:', error.message);
      return res.status(400).json({ synced: false, error: error.message });
    }

    return res.json({ synced: true, profile: data?.[0] });
  } catch (err: any) {
    console.error('Supabase sync exception:', err);
    return res.status(500).json({ synced: false, error: err.message });
  }
});

// API Endpoint: Save Career Audit Result to Supabase BaaS
app.post('/api/supabase/audit/save', async (req, res) => {
  const supabase = getSupabase();
  const { phone, targetRole, auditResult, evidenceData } = req.body;

  if (!supabase) {
    return res.json({
      synced: false,
      fallback: 'local_storage',
      message: 'Supabase credentials not set, audit saved in client state.',
    });
  }

  try {
    const { data, error } = await supabase
      .from('career_audits')
      .insert({
        phone: phone || 'anonymous',
        target_role: targetRole || 'Software Engineer',
        overall_score: auditResult?.overallScore || 0,
        dimension_scores: auditResult?.dimensionScores || {},
        diagnosis_summary: auditResult?.diagnosisSummary || '',
        diagnostic_conclusions: auditResult?.diagnosticConclusions || [],
        gaps: auditResult?.gaps || [],
        roadmap: auditResult?.roadmap || [],
        evidence_data: evidenceData || {},
        iteration: auditResult?.auditIteration || 1,
      })
      .select();

    if (error) {
      console.error('Supabase audit insert error:', error.message);
      return res.status(400).json({ synced: false, error: error.message });
    }

    return res.json({ synced: true, auditRecordId: data?.[0]?.id });
  } catch (err: any) {
    console.error('Supabase audit save exception:', err);
    return res.status(500).json({ synced: false, error: err.message });
  }
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
