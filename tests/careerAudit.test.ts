import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRoleFit,
  calculateSkillGap,
  calculateSkillScore,
  parseSkillSignalInput,
  readinessStatusForScore,
} from '../src/domain/careerAudit';

const benchmark = {
  skillId: 'react',
  skillName: 'React',
  category: 'Frontend Engineering',
  expectedScore: 80,
  importanceWeight: 0.9,
  dependencyWeight: 0.7,
  employabilityWeight: 0.9,
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

test('identical evidence produces identical demonstrated scores', () => {
  const signals = [
    {
      id: 'signal-1',
      skillName: 'React',
      extractedLevel: 'Intermediate',
      confidenceScore: 74,
      evidenceStrength: 'Moderate' as const,
    },
  ];

  const first = calculateSkillScore(benchmark, signals);
  const second = calculateSkillScore(benchmark, signals);
  assert.deepEqual(first, second);
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

test('role fit changes with student evidence instead of card position', () => {
  const role = {
    roleId: 'backend-role',
    title: 'Backend Engineer',
    category: 'Software Engineering',
    keySkills: ['Node.js', 'PostgreSQL', 'REST APIs'],
  };

  const backendProfile = calculateRoleFit(
    {
      careerIntent: 'I want to build backend APIs and distributed services',
      branch: 'Computer Science Engineering',
      knownSkills: ['Node.js', 'PostgreSQL', 'REST APIs'],
    },
    role
  );

  const designProfile = calculateRoleFit(
    {
      careerIntent: 'I want to become a product designer focused on UX research',
      branch: 'Design',
      knownSkills: ['Figma', 'User Research'],
    },
    role
  );

  assert.ok(backendProfile.matchScore > designProfile.matchScore);
  assert.ok(backendProfile.fitReasons.length > 0);
});
