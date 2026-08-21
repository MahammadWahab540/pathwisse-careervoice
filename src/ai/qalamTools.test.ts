import { buildAuditToolCalls, normalizeQalamToolCall } from './qalamTools.js';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const readiness = normalizeQalamToolCall({
  id: 'readiness_1',
  name: 'update_readiness_score',
  args: {
    overallScore: 104,
    summary: 'Evidence-backed score',
    dimensions: [
      { name: 'Technical readiness', score: -5 },
      { name: 'Communication', score: 72 },
    ],
  },
});

assert(readiness?.name === 'update_readiness_score', 'Expected readiness tool to be accepted');
assert(readiness.args.overallScore === 100, 'Overall score must be clamped to 100');
assert(readiness.args.dimensions[0]?.score === 0, 'Dimension score must be clamped to 0');

const unknown = normalizeQalamToolCall({
  id: 'dangerous_1',
  name: 'delete_account',
  args: {},
});
assert(unknown === null, 'Unknown model-selected tools must be rejected');

const gaps = normalizeQalamToolCall({
  id: 'gaps_1',
  name: 'show_gap_analysis',
  args: {
    roleTitle: 'Frontend Engineer',
    gaps: [{ skill: 'React', severity: 'red', summary: 'No production evidence yet.' }],
  },
});
assert(gaps?.name === 'show_gap_analysis', 'Expected gap tool to be accepted');
assert(gaps.args.gaps[0]?.severity === 'RED', 'Gap severity must normalize to RED');

const evaluationCalls = buildAuditToolCalls(
  {
    overallScore: 61,
    dimensionScores: {
      technicalReadiness: 54,
      projectReadiness: 48,
    },
    diagnosisSummary: 'Good fundamentals, but project evidence is below the role bar.',
    diagnosticConclusions: [
      {
        skillName: 'TypeScript',
        score: 64,
        confidenceScore: 88,
        gapSeverity: 'ORANGE',
        gapDescription: 'Needs stronger production patterns.',
        recommendedAction: 'Build and defend a typed API integration.',
      },
    ],
    gaps: [
      {
        id: 'gap_1',
        title: 'Production TypeScript',
        severity: 'ORANGE',
        description: 'Evidence does not yet show production depth.',
        recommendedAction: 'Complete a typed end-to-end project.',
        associatedSkill: 'TypeScript',
      },
    ],
    roadmap: [
      {
        weekNumber: 1,
        title: 'Typed APIs',
        focusArea: 'Build and test a typed API integration.',
        estimatedHours: 8,
        topics: [],
      },
    ],
  },
  'Frontend Engineer',
  { minimumReadinessBenchmark: 70 },
);

assert(evaluationCalls.some((call) => call.name === 'update_readiness_score'), 'Evaluation must emit readiness UI');
assert(evaluationCalls.some((call) => call.name === 'show_gap_analysis'), 'Evaluation must emit gap UI');
assert(evaluationCalls.some((call) => call.name === 'render_skill_radar'), 'Evaluation must emit skill radar UI');
const benchmark = evaluationCalls.find((call) => call.name === 'show_competency_benchmark');
assert(benchmark?.name === 'show_competency_benchmark', 'Real role benchmark should emit benchmark UI');
assert(benchmark.args.competencies[0]?.benchmark === 70, 'Benchmark must use the supplied role threshold');

console.log('qalamTools contract tests passed');
