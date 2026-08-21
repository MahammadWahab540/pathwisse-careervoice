import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEvidenceCoverage,
  calculateRoleDirection,
  calculateSkillGap,
  calculateSkillScore,
  parseSkillSignalInput,
  readinessStatusForScore,
  selectNextCompetency,
  type CompetencyBenchmark,
  type ScoringSignal,
} from '../src/domain/careerAudit';

const benchmark: CompetencyBenchmark = {
  skillId: 'react',
  skillSlug: 'react',
  skillName: 'React',
  category: 'Frontend Engineering',
  expectedScore: 80,
  importanceWeight: 0.9,
  dependencyWeight: 0.7,
  employabilityWeight: 0.9,
  requiredLevel: 'Intermediate',
  minimumEvidenceThreshold: 60,
  minimumEvidenceStrength: 'Moderate',
};

test('readiness status boundaries are stable', () => {
  assert.equal(readinessStatusForScore(85), 'Ready');
  assert.equal(readinessStatusForScore(84), 'Nearly Ready');
  assert.equal(readinessStatusForScore(70), 'Nearly Ready');
  assert.equal(readinessStatusForScore(69), 'Developing');
  assert.equal(readinessStatusForScore(45), 'Developing');
  assert.equal(readinessStatusForScore(44), 'Early Stage');
});

test('skill gap uses deterministic benchmark math', () => {
  const result = calculateSkillGap(benchmark, 42);
  assert.equal(result.expectedScore, 80);
  assert.equal(result.demonstratedScore, 42);
  assert.equal(result.gap, 38);
  assert.equal(result.priorityWeight, 0.567);
  assert.equal(result.weightedGap, 21.546);
  assert.equal(result.priority, 'High');
});

test('weak claim never becomes a numeric skill score', () => {
  const signals: ScoringSignal[] = [
    {
      id: 'signal-weak',
      skillName: 'React',
      extractedLevel: 'Intermediate',
      confidenceScore: 75,
      evidenceStrength: 'Weak',
      evidenceId: 'evidence-weak',
    },
  ];

  const result = calculateSkillScore(benchmark, signals);
  assert.equal(result.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(result.demonstratedScore, null);
  assert.equal(result.primarySignalId, null);
  assert.equal(result.primaryEvidenceId, null);
});

test('moderate evidence above configured threshold is deterministically scored', () => {
  const signals: ScoringSignal[] = [
    {
      id: 'signal-1',
      skillName: 'React',
      extractedLevel: 'Intermediate',
      confidenceScore: 74,
      evidenceStrength: 'Moderate',
      evidenceId: 'evidence-1',
    },
  ];

  const first = calculateSkillScore(benchmark, signals);
  const second = calculateSkillScore(benchmark, signals);
  assert.equal(first.status, 'SCORED');
  assert.ok(typeof first.demonstratedScore === 'number');
  assert.deepEqual(first, second);
  assert.equal(first.primarySignalId, 'signal-1');
  assert.equal(first.primaryEvidenceId, 'evidence-1');
});

test('canonical signal parser preserves raw answer evidence', () => {
  const raw = 'I built a React dashboard using TanStack Query, reusable hooks, a REST API, and deployed it on Vercel.';
  const parsed = parseSkillSignalInput({
    auditId: '57f2df69-32c4-4204-8311-3e369c9261b9',
    studentId: 'c01afcf5-22a5-49f2-9fe0-2a739bbfaec4',
    phone: '+919876543210',
    skillName: 'React',
    claimedLevel: 'Intermediate',
    extractedLevel: 'Intermediate',
    confidenceScore: 91,
    evidenceStrength: 'Strong',
    rawAnswerSnippet: raw,
    source: 'voice_probe',
    sourceMessageId: '77b83fb0-dab3-4d4d-a3c0-f1452119ad91',
  });

  assert.equal(parsed.rawAnswerSnippet, raw);
  assert.equal(parsed.evidenceStrength, 'Strong');
  assert.equal(parsed.extractedLevel, 'Intermediate');
});

test('canonical signal parser rejects the old evidenceLevel contract', () => {
  assert.throws(() =>
    parseSkillSignalInput({
      auditId: '57f2df69-32c4-4204-8311-3e369c9261b9',
      skillName: 'React',
      evidenceLevel: 'Intermediate',
      confidenceScore: 75,
      rawAnswerSnippet: 'I know React.',
      source: 'voice_probe',
    })
  );
});

test('evidence coverage exposes missing proof instead of fake progress', () => {
  const coverage = buildEvidenceCoverage([benchmark], [
    {
      id: 'signal-weak',
      skillName: 'React',
      extractedLevel: 'Intermediate',
      confidenceScore: 75,
      evidenceStrength: 'Weak',
      evidenceId: 'evidence-weak',
    },
  ]);

  assert.equal(coverage.length, 1);
  assert.equal(coverage[0].skillName, 'React');
  assert.equal(coverage[0].coverage, 'Weak Evidence');
  assert.equal(coverage[0].scoreStatus, 'INSUFFICIENT_EVIDENCE');
  assert.equal(coverage[0].demonstratedScore, null);
});

test('adaptive interviewer selects the highest-impact competency still lacking evidence', () => {
  const node: CompetencyBenchmark = {
    ...benchmark,
    skillId: 'node',
    skillSlug: 'node_js',
    skillName: 'Node.js',
    importanceWeight: 1,
    employabilityWeight: 1,
  };
  const postgres: CompetencyBenchmark = {
    ...benchmark,
    skillId: 'postgres',
    skillSlug: 'postgresql',
    skillName: 'PostgreSQL',
    importanceWeight: 0.7,
    employabilityWeight: 0.8,
  };

  const next = selectNextCompetency([node, postgres], []);
  assert.equal(next?.skillId, 'node');
});

test('role recommendation is a direction label with supporting evidence, not a percentage', () => {
  const result = calculateRoleDirection(
    {
      education: 'B.Tech',
      branch: 'Computer Science Engineering',
      academicYear: '3rd Year',
      interests: ['backend systems', 'APIs'],
      technicalSkills: ['Node.js', 'PostgreSQL', 'REST APIs'],
      nontechnicalStrengths: ['problem solving'],
      projects: ['Built an API service for a college project'],
      internships: [],
      workExperience: [],
      preferredWork: 'building backend services',
      enjoyedProblems: 'debugging data and API problems',
      analyticalInclination: 'high',
      technicalInclination: 'high',
      communicationInclination: 'moderate',
      leadershipInclination: 'moderate',
      careerAspirations: 'become a backend engineer',
    },
    {
      roleId: 'backend-role',
      title: 'Backend Engineer',
      category: 'Software Engineering',
      keySkills: ['Node.js', 'PostgreSQL', 'REST APIs'],
    }
  );

  assert.equal(result.recommendationType, 'Strong Direction');
  assert.ok(result.reasons.length > 0);
  assert.ok(result.supportingEvidence.length > 0);
  assert.equal('matchScore' in result, false);
});
