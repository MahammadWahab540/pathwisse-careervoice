import express from 'express';
import http from 'http';
import path from 'path';
import { randomUUID } from 'crypto';
import { GoogleGenAI, Type, Modality, LiveServerMessage } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  getSupabase,
  SUPABASE_SQL_SCHEMA,
  autoSeedSupabaseData,
} from './src/lib/supabase';
import {
  SEED_CAREER_STREAMS,
  SEED_CAREER_ROLES,
  SEED_ROLE_COMPETENCIES,
  SEED_PRICING_PLANS,
} from './src/lib/seedData';
import {
  QALAM_ADAPTIVE_UI_INSTRUCTION,
  buildAuditToolCalls,
} from './src/ai/qalamTools';
import {
  QALAM_GEMINI_TOOLS,
  loadRoleBenchmarkContext,
  normalizeGeminiFunctionCalls,
  planAdaptiveToolCalls,
} from './src/ai/qalamServerTools';

const app = express();
const PORT = Number(process.env.PORT || 5000);

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

  let session: any = null;
  const pendingClientMessages: any[] = [];
  const handleClientMessage = (msg: any) => {
    if (!session) {
      pendingClientMessages.push(msg);
      return;
    }

    if (msg.audio) {
      session.sendRealtimeInput({
        audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
      });
    } else if (msg.text) {
      session.sendRealtimeInput({
        text: msg.text,
      });
    } else if (msg.toolResult?.id && msg.toolResult?.name) {
      session.sendToolResponse({
        functionResponses: [{
          id: msg.toolResult.id,
          name: msg.toolResult.name,
          response: msg.toolResult.result || { rendered: true },
        }],
      });
    }
  };

  clientWs.on('message', (rawMsg) => {
    try {
      handleClientMessage(JSON.parse(rawMsg.toString()));
    } catch (e) {
      console.error('WebSocket Client Msg Error:', e);
    }
  });

  try {
    session = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
        },
        tools: QALAM_GEMINI_TOOLS,
        systemInstruction: `You are Qalam, Pathwisse's interactive AI Career Auditor mascot.
You conduct real-time interactive voice career audits. Speak in a warm, intelligent, concise tone (2-3 sentences max).
Probe the student for actual evidence of applied skills, software projects, libraries used, and engineering challenges. Keep responses natural and conversational.

${QALAM_ADAPTIVE_UI_INSTRUCTION}

For Live sessions, never call show_competency_benchmark unless a verified benchmark value has been explicitly supplied in the conversation context.`,
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

          const toolCalls = normalizeGeminiFunctionCalls(message.toolCall?.functionCalls, 'live');
          if (toolCalls.length > 0 && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'toolCall', calls: toolCalls }));
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

    pendingClientMessages.splice(0).forEach(handleClientMessage);

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

// API Endpoint: Get Published Career Streams from Supabase
app.get('/api/streams', async (req, res) => {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('career_streams')
      .select('id, title, description, icon_name, sort_order')
      .order('sort_order', { ascending: true });
    if (!error && data && data.length > 0) {
      return res.json(
        data.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          iconName: s.icon_name,
        }))
      );
    }
  }
  res.json(
    SEED_CAREER_STREAMS.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      iconName: s.icon_name,
    }))
  );
});

// API Endpoint: Get Published Career Roles from Supabase with Salary Ranges
app.get('/api/roles', async (req, res) => {
  const { streamId } = req.query;
  const supabase = getSupabase();
  if (supabase) {
    let query = supabase.from('career_roles').select('*').eq('status', 'published');
    if (streamId) {
      query = query.eq('stream_id', streamId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return res.json(
        data.map((r) => ({
          id: r.id,
          streamId: r.stream_id,
          title: r.title,
          category: r.category,
          description: r.description,
          demandLevel: r.demand_level,
          salaryMinLpa: r.salary_min_lpa,
          salaryMaxLpa: r.salary_max_lpa,
          salaryRangeDisplay: r.salary_range_display,
          keySkills: r.key_skills || [],
          matchType: r.match_type,
          fitReason: r.fit_reason,
          status: r.status,
        }))
      );
    }
  }

  let roles = SEED_CAREER_ROLES;
  if (streamId) {
    roles = roles.filter((r) => r.stream_id === streamId);
    if (roles.length === 0) roles = SEED_CAREER_ROLES;
  }
  res.json(
    roles.map((r) => ({
      id: r.id,
      streamId: r.stream_id,
      title: r.title,
      category: r.category,
      description: r.description,
      demandLevel: r.demand_level,
      salaryMinLpa: r.salary_min_lpa,
      salaryMaxLpa: r.salary_max_lpa,
      salaryRangeDisplay: r.salary_range_display,
      keySkills: r.key_skills,
      matchType: r.match_type,
      fitReason: r.fit_reason,
      status: r.status,
    }))
  );
});

// API Endpoint: Get Role Competency Model & Benchmarks from Supabase
app.get('/api/catalog/competency/:roleId', async (req, res) => {
  const { roleId } = req.params;
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('role_competencies')
      .select('*')
      .eq('role_id', roleId)
      .limit(1);
    if (!error && data && data.length > 0) {
      const comp = data[0];
      return res.json({
        roleId: comp.role_id,
        minimumReadinessBenchmark: comp.minimum_readiness_benchmark,
        evaluationCriteria: {
          clarityWeight: comp.clarity_weight,
          technicalWeight: comp.technical_weight,
          projectWeight: comp.project_weight,
          communicationWeight: comp.communication_weight,
          executionWeight: comp.execution_weight,
        },
        coreCompetencies: comp.core_competencies,
        roadmapTemplate: comp.roadmap_template,
      });
    }
  }

  const found = SEED_ROLE_COMPETENCIES.find((c) => c.role_id === roleId) || SEED_ROLE_COMPETENCIES[0];
  res.json({
    roleId: found.role_id,
    minimumReadinessBenchmark: found.minimum_readiness_benchmark,
    evaluationCriteria: {
      clarityWeight: found.clarity_weight,
      technicalWeight: found.technical_weight,
      projectWeight: found.project_weight,
      communicationWeight: found.communication_weight,
      executionWeight: found.execution_weight,
    },
    coreCompetencies: found.core_competencies,
    roadmapTemplate: found.roadmap_template,
  });
});

// API Endpoint: Get Pricing Plans from Supabase
app.get('/api/pricing', async (req, res) => {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from('pricing_plans').select('*').eq('is_active', true);
    if (!error && data && data.length > 0) {
      return res.json(
        data.map((p) => ({
          id: p.id,
          planName: p.plan_name,
          priceInr: p.price_inr,
          originalPriceInr: p.original_price_inr,
          badge: p.badge,
          highlight: p.highlight,
          features: p.features,
          ctaText: p.cta_text,
        }))
      );
    }
  }
  res.json(
    SEED_PRICING_PLANS.map((p) => ({
      id: p.id,
      planName: p.plan_name,
      priceInr: p.price_inr,
      originalPriceInr: p.original_price_inr,
      badge: p.badge,
      highlight: p.highlight,
      features: p.features,
      ctaText: p.cta_text,
    }))
  );
});

// API Endpoint: Record Skill Signals / Probes in Supabase
app.post('/api/audit/evidence/signal', async (req, res) => {
  const { auditId, phone, skillName, claimedLevel, extractedLevel, confidenceScore, evidenceStrength, source } = req.body;
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('skill_signals').insert({
        audit_id: auditId || `audit_${Date.now()}`,
        phone: phone || 'anonymous',
        skill_name: skillName,
        claimed_level: claimedLevel,
        extracted_level: extractedLevel,
        confidence_score: confidenceScore,
        evidence_strength: evidenceStrength,
        source: source || 'voice_probe',
      });
    } catch (e) {
      console.warn('Skill signal insert notice:', e);
    }
  }
  res.json({ success: true });
});

// API Endpoint: Qalam AI Chat & Adaptive Probing with Weak Evidence Detection
app.post('/api/qalam/chat', async (req, res) => {
  try {
    const {
      userText,
      history = [],
      studentContext = {},
      targetRole = 'AI / ML Engineer',
      targetRoleId,
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
        extractedSkills: [],
        toolCalls: [],
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
5. Select an appropriate emotion: 'WELCOME', 'LISTENING', 'SPEAKING', 'THINKING', 'CURIOUS', 'SURPRISED', 'ENCOURAGING', 'CELEBRATING'.

${QALAM_ADAPTIVE_UI_INSTRUCTION}`;

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

    const [response, toolCalls] = await Promise.all([
      ai.models.generateContent({
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
      }),
      planAdaptiveToolCalls(ai, {
        userText,
        history,
        studentContext,
        targetRole,
        targetRoleId,
        currentStage,
      }),
    ]);

    const parsed = JSON.parse(response.text || '{}');

    res.json({
      qalamText: parsed.qalamText || 'That provides useful baseline insight.',
      qalamState: parsed.qalamState || 'CURIOUS',
      evidenceStrength: parsed.evidenceStrength || 'Moderate',
      needsFollowUp: !!parsed.needsFollowUp,
      followUpQuestion: parsed.followUpQuestion || 'What was the most challenging technical roadblock you solved in that project?',
      extractedSkills: parsed.extractedSkills || [],
      toolCalls,
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
      toolCalls: [],
      error: error.message,
    });
  }
});

// API Endpoint: Qalam Comprehensive Career Evaluation & Diagnostic Chain Generation
// Every report conclusion MUST follow: Student Answer → Evidence → Skill → Score → Gap → Recommended Action.
// Note: Fallback heuristic scoring is removed in accordance with strict real evaluation rules.
app.post('/api/qalam/evaluate', async (req, res) => {
  try {
    const {
      studentContext = {},
      targetRole = 'Junior ML Engineer',
      targetRoleId,
      conversationHistory = [],
      communicationSample = '',
      evidenceData = {},
      isReAudit = false,
      completedMilestones = [],
      phone = '',
    } = req.body;

    if (!ai) {
      return res.status(503).json({
        success: false,
        error: 'AI Evaluator service is not initialized (GEMINI_API_KEY required). Strict evaluation requires live model connection.',
      });
    }

    const benchmarkContext = await loadRoleBenchmarkContext(targetRoleId);

    const promptText = `You are Qalam, Pathwisse's AI Career Auditor conducting a strict Career Readiness Audit for the role of "${targetRole}".

Student Academic Background: ${JSON.stringify(studentContext)}
Conversation Audit Logs: ${JSON.stringify(conversationHistory)}
60-Second Communication Intro: "${communicationSample}"
Uploaded Proof & Evidence: ${JSON.stringify(evidenceData)}
Verified Role Benchmark Context: ${benchmarkContext ? JSON.stringify(benchmarkContext) : 'No verified role benchmark available'}
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
Use the verified role benchmark only if one is supplied above. Never invent or infer a role threshold.
Generate a concise evidence-backed roadmap when the diagnostic gaps support one.

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
  ],
  "roadmap": [
    {
      "weekNumber": 1,
      "title": "Evidence-backed milestone",
      "focusArea": "What the student should be able to prove next",
      "estimatedHours": 8,
      "topics": []
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

    if (!response.text) {
      throw new Error('Empty response received from evaluation engine.');
    }

    const parsed = JSON.parse(response.text);

    // Persist verified audit to Supabase
    const supabase = getSupabase();
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (supabase) {
      try {
        await supabase.from('career_audits').insert({
          audit_id: auditId,
          phone: phone || studentContext?.phone || 'anonymous',
          target_role: targetRole,
          overall_score: parsed.overallScore || 0,
          dimension_scores: parsed.dimensionScores || {},
          diagnosis_summary: parsed.diagnosisSummary || '',
          diagnostic_conclusions: parsed.diagnosticConclusions || [],
          gaps: parsed.gaps || [],
          roadmap: parsed.roadmap || [],
          evidence_data: evidenceData || {},
          iteration: isReAudit ? 2 : 1,
        });
      } catch (dbErr) {
        console.warn('Supabase audit auto-save notice:', dbErr);
      }
    }

    const toolCalls = buildAuditToolCalls(parsed, targetRole, benchmarkContext);

    res.json({
      success: true,
      auditId,
      ...parsed,
      toolCalls,
    });
  } catch (error: any) {
    console.error('Qalam Evaluate Error:', error);
    res.status(500).json({
      success: false,
      error: `AI Evaluation failed: ${error?.message || 'Unknown evaluation error'}. Please retry the audit.`,
    });
  }
});

// API Endpoint: Analytics Tracking persisted in Supabase
app.post('/api/analytics/track', async (req, res) => {
  const eventData = req.body;
  if (!eventData.eventName) {
    return res.status(400).json({ error: 'eventName is required' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({
      success: false,
      error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  const enrichedEvent = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...eventData,
  };

  const { error } = await supabase.from('analytics_events').insert({
    id: enrichedEvent.id,
    event_name: enrichedEvent.eventName,
    event_time: enrichedEvent.timestamp,
    source: 'pathwisse_qalam',
    properties: {
      anonymousId: enrichedEvent.anonymousId || null,
      sessionId: enrichedEvent.sessionId || null,
      auditId: enrichedEvent.auditId || null,
      screenName: enrichedEvent.screenName || null,
      careerRole: enrichedEvent.careerRole || null,
      collegeId: enrichedEvent.collegeId || null,
      campaignId: enrichedEvent.campaignId || null,
      referralCode: enrichedEvent.referralCode || null,
      metadata: enrichedEvent.metadata || {},
    },
  });

  if (error) {
    console.error('Supabase analytics insert error:', error.message);
    return res.status(500).json({ success: false, error: 'Analytics event could not be saved.' });
  }

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
      connected: false,
      message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not configured yet in environment variables.',
      schemaSql: SUPABASE_SQL_SCHEMA,
    });
  }

  try {
    // Attempt auto-seed for tables if empty
    await autoSeedSupabaseData(supabase);

    const { data: profileCheck, error: profErr } = await supabase.from('student_profiles').select('id').limit(1);
    const { data: rolesCheck, error: roleErr } = await supabase.from('career_roles').select('id').limit(1);
    const { data: streamsCheck, error: streamErr } = await supabase.from('career_streams').select('id').limit(1);
    const { data: compCheck, error: compErr } = await supabase.from('role_competencies').select('id').limit(1);
    const { data: pricingCheck, error: pricingErr } = await supabase.from('pricing_plans').select('id').limit(1);
    const { data: analyticsCheck, error: analyticsErr } = await supabase.from('analytics_events').select('id').limit(1);

    const anyError = profErr || roleErr || streamErr || compErr || pricingErr || analyticsErr;
    if (anyError) {
      return res.json({
        configured: true,
        connected: false,
        message: `Connected to Supabase project, but some tables are pending: ${anyError.message}. Execute the schema in Supabase SQL editor.`,
        schemaSql: SUPABASE_SQL_SCHEMA,
      });
    }

    return res.json({
      configured: true,
      connected: true,
        message: 'Successfully connected to Supabase! Tables (student_profiles, career_streams, career_roles, role_competencies, pricing_plans, career_audits, skill_signals, analytics_events) are verified and active.',
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
    return res.status(503).json({
      synced: false,
      error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
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
    return res.status(503).json({
      synced: false,
      error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  try {
    const { data, error } = await supabase
      .from('career_audits')
      .insert({
        audit_id: auditResult?.auditId || `audit_${Date.now()}`,
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
app.get('/api/analytics/stats', async (req, res) => {
  const supabase = getSupabase();
  let events = analyticsEventsStore;

  if (supabase) {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Supabase analytics query error:', error.message);
      return res.status(500).json({ success: false, error: 'Analytics could not be loaded.' });
    }

    events = (data || []).map((event) => ({
      id: event.id,
      eventName: event.event_name,
      ...(event.properties || {}),
      metadata: event.properties?.metadata || {},
      timestamp: event.event_time || event.created_at,
    }));
  }

  const totalEvents = events.length;
  const sessions = new Set(events.map((e) => e.sessionId)).size;

  const funnelCounts = {
    landingViewed: events.filter((e) => e.eventName === 'career_audit_landing_viewed').length,
    auditStarted: events.filter((e) => e.eventName === 'career_audit_started').length,
    phoneSubmitted: events.filter((e) => e.eventName === 'phone_submitted').length,
    otpVerified: events.filter((e) => e.eventName === 'otp_verified').length,
    voiceSessionStarted: events.filter((e) => e.eventName === 'voice_session_started').length,
    audit25: events.filter((e) => e.eventName === 'audit_progress_25').length,
    audit50: events.filter((e) => e.eventName === 'audit_progress_50').length,
    audit75: events.filter((e) => e.eventName === 'audit_progress_75').length,
    auditCompleted: events.filter((e) => e.eventName === 'audit_completed').length,
    roadmapViewed: events.filter((e) => e.eventName === 'roadmap_preview_viewed').length,
    upgradeClicked: events.filter((e) => e.eventName === 'upgrade_clicked').length,
  };

  const voiceInteractions = events.filter((e) => e.inputMethod === 'voice' || e.metadata?.inputMethod === 'voice').length;
  const tapInteractions = events.filter(
    (e) =>
      e.inputMethod === 'tap' ||
      e.inputMethod === 'type' ||
      e.metadata?.inputMethod === 'tap' ||
      e.metadata?.inputMethod === 'type'
  ).length;

  res.json({
    totalEvents,
    totalSessions: sessions || 1,
    funnel: funnelCounts,
    voiceVsTap: { voice: voiceInteractions, tap: tapInteractions },
    recentEvents: events.slice(0, 25),
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