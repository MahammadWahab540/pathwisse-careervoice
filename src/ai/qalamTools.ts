export type GapSeverity = 'RED' | 'ORANGE' | 'GREEN';
export type QalamToolSource = 'chat' | 'live' | 'evaluation';

export interface SkillRadarArgs {
  title: string;
  skills: Array<{
    name: string;
    score: number;
    benchmark?: number;
    confidence?: number;
  }>;
}

export interface GapAnalysisArgs {
  roleTitle: string;
  gaps: Array<{
    skill: string;
    severity: GapSeverity;
    score?: number;
    targetScore?: number;
    summary: string;
    action?: string;
  }>;
}

export interface RoadmapArgs {
  roleTitle: string;
  phases: Array<{
    id: string;
    title: string;
    outcome: string;
    durationWeeks?: number;
    status?: 'LOCKED' | 'NEXT' | 'IN_PROGRESS' | 'COMPLETED';
    skills?: string[];
  }>;
}

export interface ReadinessScoreArgs {
  overallScore: number;
  previousScore?: number;
  summary: string;
  dimensions: Array<{
    name: string;
    score: number;
  }>;
}

export interface CompetencyBenchmarkArgs {
  roleTitle: string;
  benchmarkLabel?: string;
  competencies: Array<{
    name: string;
    studentScore: number;
    benchmark: number;
    gap: number;
  }>;
}

export interface EvidenceUploadRequestArgs {
  skillName: string;
  reason: string;
  prompt?: string;
  acceptedEvidence: string[];
  required?: boolean;
}

export interface CareerRecommendationToolArgs {
  recommendations: Array<{
    roleId: string;
    roleTitle: string;
    direction: 'BEST_FIT' | 'ADJACENT_PATH' | 'ASPIRATIONAL_PATH';
    fitScore: number;
    confidenceScore: number;
    supportingSignals: string[];
    contradictingSignals: string[];
    evidenceUsed: string[];
    missingEvidence: string[];
    transitionDifficulty: 'LOW' | 'MEDIUM' | 'HIGH';
    nextValidationQuestion?: string;
    explanation: string;
  }>;
  recommendationConfidence: number;
  needsMoreDiscovery: boolean;
}

export interface QalamToolArgsMap {
  render_skill_radar: SkillRadarArgs;
  show_gap_analysis: GapAnalysisArgs;
  generate_roadmap: RoadmapArgs;
  update_readiness_score: ReadinessScoreArgs;
  show_competency_benchmark: CompetencyBenchmarkArgs;
  request_evidence_upload: EvidenceUploadRequestArgs;
  show_career_recommendations: CareerRecommendationToolArgs;
}

export type QalamToolName = keyof QalamToolArgsMap;

export type QalamToolCall = {
  [Name in QalamToolName]: {
    id: string;
    name: Name;
    args: QalamToolArgsMap[Name];
    source: QalamToolSource;
    createdAt: number;
  };
}[QalamToolName];

export interface AdaptiveEvidenceSubmission {
  skillName: string;
  fileName?: string;
  url?: string;
  note?: string;
}

export interface AuditToolSource {
  overallScore?: number;
  dimensionScores?: Record<string, number>;
  diagnosisSummary?: string;
  diagnosticConclusions?: Array<{
    skillName?: string;
    score?: number;
    confidenceScore?: number;
    gapSeverity?: string;
    gapDescription?: string;
    recommendedAction?: string;
  }>;
  gaps?: Array<{
    id?: string;
    title?: string;
    severity?: string;
    description?: string;
    recommendedAction?: string;
    associatedSkill?: string;
  }>;
  roadmap?: Array<{
    weekNumber?: number;
    title?: string;
    focusArea?: string;
    estimatedHours?: number;
    completed?: boolean;
    topics?: unknown[];
  }>;
}

export interface RoleBenchmarkContext {
  minimumReadinessBenchmark: number;
}

export const QALAM_ADAPTIVE_UI_INSTRUCTION = `
Adaptive UI tools are available. Use them only when a visual or interactive surface is more useful than another sentence.
- render_skill_radar: after you have multiple evidence-backed skill signals worth comparing.
- show_gap_analysis: when specific RED/ORANGE/GREEN gaps are supported by evidence.
- generate_roadmap: only when a concrete ordered learning plan exists.
- update_readiness_score: when a score has actually been calculated from audit evidence. Never invent a score.
- show_competency_benchmark: only when a real role benchmark is present in context. Never invent benchmark values.
- request_evidence_upload: when a material claim is weak/unsupported and a file, repository, portfolio, certificate, or project link would materially improve confidence.
- show_career_recommendations: only after the deterministic Career Intelligence engine returns database-backed recommendations. If needsMoreDiscovery is true, ask the next question instead of presenting final cards.
Call at most two adaptive UI tools per conversational turn. Do not call a tool merely for decoration. Keep speaking naturally even when a UI tool is used.
`.trim();

const scoreSchema = { type: 'number', minimum: 0, maximum: 100 } as const;
const stringArraySchema = { type: 'array', items: { type: 'string' } } as const;

export const QALAM_TOOL_DECLARATIONS = [
  {
    name: 'render_skill_radar',
    description: 'Render an evidence-backed skill radar or competency matrix for the student.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        skills: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              score: scoreSchema,
              benchmark: scoreSchema,
              confidence: scoreSchema,
            },
            required: ['name', 'score'],
          },
        },
      },
      required: ['title', 'skills'],
    },
  },
  {
    name: 'show_gap_analysis',
    description: 'Show evidence-backed skill gaps with RED, ORANGE, or GREEN severity and next actions.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        roleTitle: { type: 'string' },
        gaps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              skill: { type: 'string' },
              severity: { type: 'string', enum: ['RED', 'ORANGE', 'GREEN'] },
              score: scoreSchema,
              targetScore: scoreSchema,
              summary: { type: 'string' },
              action: { type: 'string' },
            },
            required: ['skill', 'severity', 'summary'],
          },
        },
      },
      required: ['roleTitle', 'gaps'],
    },
  },
  {
    name: 'generate_roadmap',
    description: 'Render an ordered, interactive career roadmap based on evaluated gaps and actions.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        roleTitle: { type: 'string' },
        phases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              outcome: { type: 'string' },
              durationWeeks: { type: 'number', minimum: 0 },
              status: { type: 'string', enum: ['LOCKED', 'NEXT', 'IN_PROGRESS', 'COMPLETED'] },
              skills: stringArraySchema,
            },
            required: ['id', 'title', 'outcome'],
          },
        },
      },
      required: ['roleTitle', 'phases'],
    },
  },
  {
    name: 'update_readiness_score',
    description: 'Update the live Career Readiness Score dashboard using an actually calculated audit score.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        overallScore: scoreSchema,
        previousScore: scoreSchema,
        summary: { type: 'string' },
        dimensions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              score: scoreSchema,
            },
            required: ['name', 'score'],
          },
        },
      },
      required: ['overallScore', 'summary', 'dimensions'],
    },
  },
  {
    name: 'show_competency_benchmark',
    description: 'Compare student competency scores with a real target-role readiness benchmark supplied in context.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        roleTitle: { type: 'string' },
        benchmarkLabel: { type: 'string' },
        competencies: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              studentScore: scoreSchema,
              benchmark: scoreSchema,
              gap: { type: 'number' },
            },
            required: ['name', 'studentScore', 'benchmark', 'gap'],
          },
        },
      },
      required: ['roleTitle', 'competencies'],
    },
  },
  {
    name: 'request_evidence_upload',
    description: 'Ask the student for concrete proof when a material skill claim lacks verifiable evidence.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        skillName: { type: 'string' },
        reason: { type: 'string' },
        prompt: { type: 'string' },
        acceptedEvidence: stringArraySchema,
        required: { type: 'boolean' },
      },
      required: ['skillName', 'reason', 'acceptedEvidence'],
    },
  },
  {
    name: 'show_career_recommendations',
    description: 'Show database-backed Career Intelligence V2 recommendations after deterministic scoring has completed.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              roleId: { type: 'string' },
              roleTitle: { type: 'string' },
              direction: { type: 'string', enum: ['BEST_FIT', 'ADJACENT_PATH', 'ASPIRATIONAL_PATH'] },
              fitScore: scoreSchema,
              confidenceScore: scoreSchema,
              supportingSignals: stringArraySchema,
              contradictingSignals: stringArraySchema,
              evidenceUsed: stringArraySchema,
              missingEvidence: stringArraySchema,
              transitionDifficulty: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
              nextValidationQuestion: { type: 'string' },
              explanation: { type: 'string' },
            },
            required: [
              'roleId',
              'roleTitle',
              'direction',
              'fitScore',
              'confidenceScore',
              'supportingSignals',
              'contradictingSignals',
              'evidenceUsed',
              'missingEvidence',
              'transitionDifficulty',
              'explanation',
            ],
          },
        },
        recommendationConfidence: scoreSchema,
        needsMoreDiscovery: { type: 'boolean' },
      },
      required: ['recommendations', 'recommendationConfidence', 'needsMoreDiscovery'],
    },
  },
] as const;

const TOOL_NAMES = new Set<QalamToolName>(QALAM_TOOL_DECLARATIONS.map((tool) => tool.name));

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asOptionalString(value: unknown): string | undefined {
  const result = asString(value);
  return result || undefined;
}

function asNumber(value: unknown, fallback = 0): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function clampScore(value: unknown, fallback = 0): number {
  return Math.max(0, Math.min(100, Math.round(asNumber(value, fallback))));
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : [];
}

function normalizeSeverity(value: unknown): GapSeverity {
  const normalized = asString(value).toUpperCase();
  if (normalized === 'GREEN' || normalized === 'ORANGE' || normalized === 'RED') {
    return normalized;
  }
  return 'ORANGE';
}

function normalizeStatus(value: unknown): RoadmapArgs['phases'][number]['status'] {
  const normalized = asString(value).toUpperCase();
  if (normalized === 'LOCKED' || normalized === 'NEXT' || normalized === 'IN_PROGRESS' || normalized === 'COMPLETED') {
    return normalized;
  }
  return undefined;
}

function normalizeCareerDirection(value: unknown): CareerRecommendationToolArgs['recommendations'][number]['direction'] {
  const normalized = asString(value).toUpperCase();
  if (normalized === 'BEST_FIT' || normalized === 'ADJACENT_PATH' || normalized === 'ASPIRATIONAL_PATH') {
    return normalized;
  }
  return 'ASPIRATIONAL_PATH';
}

function normalizeTransitionDifficulty(value: unknown): CareerRecommendationToolArgs['recommendations'][number]['transitionDifficulty'] {
  const normalized = asString(value).toUpperCase();
  if (normalized === 'LOW' || normalized === 'MEDIUM' || normalized === 'HIGH') return normalized;
  return 'MEDIUM';
}

function baseCall<Name extends QalamToolName>(
  raw: Record<string, unknown>,
  name: Name,
  args: QalamToolArgsMap[Name],
  source: QalamToolSource,
): Extract<QalamToolCall, { name: Name }> {
  return {
    id: asString(raw.id) || `ui_${name}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    args,
    source,
    createdAt: asNumber(raw.createdAt, Date.now()),
  } as Extract<QalamToolCall, { name: Name }>;
}

export function normalizeQalamToolCall(
  value: unknown,
  source: QalamToolSource = 'chat',
): QalamToolCall | null {
  const raw = asRecord(value);
  const name = asString(raw.name) as QalamToolName;
  if (!TOOL_NAMES.has(name)) return null;

  const args = asRecord(raw.args);

  switch (name) {
    case 'render_skill_radar':
      return baseCall(raw, name, {
        title: asString(args.title, 'Skill signal radar'),
        skills: (Array.isArray(args.skills) ? args.skills : []).map((item) => {
          const skill = asRecord(item);
          const benchmark = skill.benchmark == null ? undefined : clampScore(skill.benchmark);
          const confidence = skill.confidence == null ? undefined : clampScore(skill.confidence);
          return {
            name: asString(skill.name, 'Skill'),
            score: clampScore(skill.score),
            ...(benchmark == null ? {} : { benchmark }),
            ...(confidence == null ? {} : { confidence }),
          };
        }),
      }, source);

    case 'show_gap_analysis':
      return baseCall(raw, name, {
        roleTitle: asString(args.roleTitle, 'Target role'),
        gaps: (Array.isArray(args.gaps) ? args.gaps : []).map((item) => {
          const gap = asRecord(item);
          return {
            skill: asString(gap.skill, 'Skill'),
            severity: normalizeSeverity(gap.severity),
            ...(gap.score == null ? {} : { score: clampScore(gap.score) }),
            ...(gap.targetScore == null ? {} : { targetScore: clampScore(gap.targetScore) }),
            summary: asString(gap.summary, 'Evidence gap detected.'),
            ...(asOptionalString(gap.action) ? { action: asOptionalString(gap.action) } : {}),
          };
        }),
      }, source);

    case 'generate_roadmap':
      return baseCall(raw, name, {
        roleTitle: asString(args.roleTitle, 'Target role'),
        phases: (Array.isArray(args.phases) ? args.phases : []).map((item, index) => {
          const phase = asRecord(item);
          const status = normalizeStatus(phase.status);
          const skills = asStringArray(phase.skills);
          return {
            id: asString(phase.id, `phase_${index + 1}`),
            title: asString(phase.title, `Phase ${index + 1}`),
            outcome: asString(phase.outcome, 'Complete the next evidence-backed milestone.'),
            ...(phase.durationWeeks == null ? {} : { durationWeeks: Math.max(0, Math.round(asNumber(phase.durationWeeks))) }),
            ...(status ? { status } : {}),
            ...(skills.length ? { skills } : {}),
          };
        }),
      }, source);

    case 'update_readiness_score':
      return baseCall(raw, name, {
        overallScore: clampScore(args.overallScore),
        ...(args.previousScore == null ? {} : { previousScore: clampScore(args.previousScore) }),
        summary: asString(args.summary, 'Career readiness updated from current audit evidence.'),
        dimensions: (Array.isArray(args.dimensions) ? args.dimensions : []).map((item) => {
          const dimension = asRecord(item);
          return {
            name: asString(dimension.name, 'Dimension'),
            score: clampScore(dimension.score),
          };
        }),
      }, source);

    case 'show_competency_benchmark':
      return baseCall(raw, name, {
        roleTitle: asString(args.roleTitle, 'Target role'),
        ...(asOptionalString(args.benchmarkLabel) ? { benchmarkLabel: asOptionalString(args.benchmarkLabel) } : {}),
        competencies: (Array.isArray(args.competencies) ? args.competencies : []).map((item) => {
          const competency = asRecord(item);
          const studentScore = clampScore(competency.studentScore);
          const benchmark = clampScore(competency.benchmark);
          return {
            name: asString(competency.name, 'Competency'),
            studentScore,
            benchmark,
            gap: Math.round(asNumber(competency.gap, studentScore - benchmark)),
          };
        }),
      }, source);

    case 'request_evidence_upload':
      return baseCall(raw, name, {
        skillName: asString(args.skillName, 'Claimed skill'),
        reason: asString(args.reason, 'This claim needs stronger proof.'),
        ...(asOptionalString(args.prompt) ? { prompt: asOptionalString(args.prompt) } : {}),
        acceptedEvidence: asStringArray(args.acceptedEvidence),
        ...(typeof args.required === 'boolean' ? { required: args.required } : {}),
      }, source);

    case 'show_career_recommendations':
      return baseCall(raw, name, {
        recommendations: (Array.isArray(args.recommendations) ? args.recommendations : []).map((item) => {
          const recommendation = asRecord(item);
          return {
            roleId: asString(recommendation.roleId),
            roleTitle: asString(recommendation.roleTitle, 'Career direction'),
            direction: normalizeCareerDirection(recommendation.direction),
            fitScore: clampScore(recommendation.fitScore),
            confidenceScore: clampScore(recommendation.confidenceScore),
            supportingSignals: asStringArray(recommendation.supportingSignals),
            contradictingSignals: asStringArray(recommendation.contradictingSignals),
            evidenceUsed: asStringArray(recommendation.evidenceUsed),
            missingEvidence: asStringArray(recommendation.missingEvidence),
            transitionDifficulty: normalizeTransitionDifficulty(recommendation.transitionDifficulty),
            ...(asOptionalString(recommendation.nextValidationQuestion)
              ? { nextValidationQuestion: asOptionalString(recommendation.nextValidationQuestion) }
              : {}),
            explanation: asString(recommendation.explanation, 'This direction is based on current CareerVoice evidence.'),
          };
        }).filter((item) => item.roleId),
        recommendationConfidence: clampScore(args.recommendationConfidence),
        needsMoreDiscovery: Boolean(args.needsMoreDiscovery),
      }, source);
  }
}

const DIMENSION_LABELS: Record<string, string> = {
  careerClarity: 'Career clarity',
  technicalReadiness: 'Technical readiness',
  projectReadiness: 'Project readiness',
  communication: 'Communication',
  placementReadiness: 'Placement readiness',
  executionReadiness: 'Execution readiness',
};

export function buildAuditToolCalls(
  audit: AuditToolSource,
  roleTitle: string,
  benchmarkContext?: RoleBenchmarkContext | null,
): QalamToolCall[] {
  const calls: QalamToolCall[] = [];
  const timestamp = Date.now();

  if (typeof audit.overallScore === 'number') {
    const dimensions = Object.entries(audit.dimensionScores || {}).map(([name, score]) => ({
      name: DIMENSION_LABELS[name] || name,
      score: clampScore(score),
    }));
    calls.push(baseCall(
      { id: 'evaluation_readiness', createdAt: timestamp },
      'update_readiness_score',
      {
        overallScore: clampScore(audit.overallScore),
        summary: asString(audit.diagnosisSummary, 'Career readiness calculated from audit evidence.'),
        dimensions,
      },
      'evaluation',
    ));
  }

  const gaps = (audit.gaps || []).map((gap) => ({
    skill: asString(gap.associatedSkill || gap.title, 'Skill'),
    severity: normalizeSeverity(gap.severity),
    summary: asString(gap.description, 'Evidence gap detected.'),
    ...(asOptionalString(gap.recommendedAction) ? { action: asOptionalString(gap.recommendedAction) } : {}),
  }));
  if (gaps.length) {
    calls.push(baseCall(
      { id: 'evaluation_gaps', createdAt: timestamp + 1 },
      'show_gap_analysis',
      { roleTitle, gaps },
      'evaluation',
    ));
  }

  const conclusions = audit.diagnosticConclusions || [];
  if (conclusions.length) {
    const benchmark = benchmarkContext
      ? clampScore(benchmarkContext.minimumReadinessBenchmark)
      : undefined;
    const skills = conclusions.map((conclusion) => ({
      name: asString(conclusion.skillName, 'Skill'),
      score: clampScore(conclusion.score),
      confidence: clampScore(conclusion.confidenceScore),
      ...(benchmark == null ? {} : { benchmark }),
    }));
    calls.push(baseCall(
      { id: 'evaluation_skill_radar', createdAt: timestamp + 2 },
      'render_skill_radar',
      { title: `${roleTitle} competency signal`, skills },
      'evaluation',
    ));

    if (benchmark != null) {
      calls.push(baseCall(
        { id: 'evaluation_benchmark', createdAt: timestamp + 3 },
        'show_competency_benchmark',
        {
          roleTitle,
          benchmarkLabel: `Role readiness threshold ${benchmark}`,
          competencies: conclusions.map((conclusion) => {
            const studentScore = clampScore(conclusion.score);
            return {
              name: asString(conclusion.skillName, 'Skill'),
              studentScore,
              benchmark,
              gap: studentScore - benchmark,
            };
          }),
        },
        'evaluation',
      ));
    }
  }

  const roadmap = audit.roadmap || [];
  if (roadmap.length) {
    calls.push(baseCall(
      { id: 'evaluation_roadmap', createdAt: timestamp + 4 },
      'generate_roadmap',
      {
        roleTitle,
        phases: roadmap.map((week, index) => ({
          id: `week_${week.weekNumber ?? index + 1}`,
          title: asString(week.title, `Week ${week.weekNumber ?? index + 1}`),
          outcome: asString(week.focusArea, 'Complete the next career milestone.'),
          durationWeeks: 1,
          status: week.completed ? 'COMPLETED' : index === 0 ? 'NEXT' : 'LOCKED',
        })),
      },
      'evaluation',
    ));
  }

  return calls;
}

export function mergeQalamToolCalls(
  existing: QalamToolCall[],
  incoming: QalamToolCall[],
  maxCalls = 8,
): QalamToolCall[] {
  const merged = [...existing];
  for (const call of incoming) {
    const identity = call.name === 'request_evidence_upload'
      ? `${call.name}:${call.args.skillName.toLowerCase()}`
      : call.name;
    const index = merged.findIndex((item) => {
      const itemIdentity = item.name === 'request_evidence_upload'
        ? `${item.name}:${item.args.skillName.toLowerCase()}`
        : item.name;
      return item.id === call.id || itemIdentity === identity;
    });
    if (index >= 0) merged.splice(index, 1);
    merged.push(call);
  }
  return merged.slice(-Math.max(1, maxCalls));
}
