import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRoleFit,
  calculateSkillGap,
  calculateSkillScore,
  decideAuditTransition,
  isNoExperienceAnswer,
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

const transitionStages = [
  {
    stageId: 'clarity_stage',
    competencyId: 'role_clarity',
    questionId: 'q_clarity_1',
    questionText: 'Why does this role interest you?',
  },
  {
    stageId: 'technical_core_stage',
    competencyId: 'technical_core',
    questionId: 'q_technical_1',
    questionText: 'Tell me about the most relevant project you handled.',
  },
  {
    stageId: 'execution_stage',
    competencyId: 'execution',
    questionId: 'q_execution_1',
    questionText: 'How much time can you dedicate weekly?',
  },
];

test('audit transition advances for Strong and Moderate evidence', () => {
  const strong = decideAuditTransition({
    stages: transitionStages,
    currentStageId: 'clarity_stage',
    currentCompetencyId: 'role_clarity',
    currentQuestionId: 'q_clarity_1',
    stateVersion: 4,
    expectedStateVersion: 4,
    evidenceStrength: 'Strong',
    studentAnswer: 'I researched this role and completed a relevant project.',
  });

  assert.equal(strong.action, 'ADVANCE');
  assert.equal(strong.nextStage, 'technical_core_stage');
  assert.equal(strong.nextCompetencyId, 'technical_core');
  assert.equal(strong.followUpCount, 0);

  const moderate = decideAuditTransition({
    stages: transitionStages,
    currentStageId: 'technical_core_stage',
    currentCompetencyId: 'technical_core',
    currentQuestionId: 'q_technical_1',
    stateVersion: 5,
    expectedStateVersion: 5,
    evidenceStrength: 'Moderate',
    studentAnswer: 'I built part of the dashboard and can explain the API flow.',
  });

  assert.equal(moderate.action, 'ADVANCE');
  assert.equal(moderate.nextStage, 'execution_stage');
});

test('audit transition allows exactly one weak follow-up then advances', () => {
  const firstWeak = decideAuditTransition({
    stages: transitionStages,
    currentStageId: 'technical_core_stage',
    currentCompetencyId: 'technical_core',
    currentQuestionId: 'q_technical_1',
    stateVersion: 2,
    expectedStateVersion: 2,
    evidenceStrength: 'Weak',
    followUpCount: 0,
    studentAnswer: 'I know basics.',
    followUpQuestion: 'What did you personally build?',
  });

  assert.equal(firstWeak.action, 'FOLLOW_UP');
  assert.equal(firstWeak.nextStage, 'technical_core_stage');
  assert.equal(firstWeak.followUpCount, 1);

  const secondWeak = decideAuditTransition({
    stages: transitionStages,
    currentStageId: 'technical_core_stage',
    currentCompetencyId: 'technical_core',
    currentQuestionId: 'q_technical_1',
    stateVersion: 3,
    expectedStateVersion: 3,
    evidenceStrength: 'Weak',
    followUpCount: 1,
    studentAnswer: 'Still only basics.',
    followUpQuestion: 'What did you personally build?',
  });

  assert.equal(secondWeak.action, 'ADVANCE');
  assert.equal(secondWeak.nextStage, 'execution_stage');
  assert.equal(secondWeak.followUpCount, 0);
});

test('no-experience answers and explicit skip advance without follow-up', () => {
  assert.equal(isNoExperienceAnswer("I don't have experience"), true);
  assert.equal(isNoExperienceAnswer('ask me something else'), true);

  const noExperience = decideAuditTransition({
    stages: transitionStages,
    currentStageId: 'technical_core_stage',
    currentCompetencyId: 'technical_core',
    currentQuestionId: 'q_technical_1',
    stateVersion: 7,
    expectedStateVersion: 7,
    evidenceStrength: 'Weak',
    studentAnswer: "I haven't done this yet",
    followUpQuestion: 'Can you clarify?',
  });

  assert.equal(noExperience.evidenceStrength, 'None');
  assert.equal(noExperience.action, 'ADVANCE');
  assert.equal(noExperience.nextStage, 'execution_stage');

  const skipped = decideAuditTransition({
    stages: transitionStages,
    currentStageId: 'technical_core_stage',
    currentCompetencyId: 'technical_core',
    currentQuestionId: 'q_technical_1',
    stateVersion: 8,
    expectedStateVersion: 8,
    evidenceStrength: 'Strong',
    studentAnswer: 'skip',
    explicitSkip: true,
    followUpQuestion: 'Can you clarify?',
  });

  assert.equal(skipped.evidenceStrength, 'None');
  assert.equal(skipped.action, 'SKIP');
  assert.equal(skipped.nextStage, 'execution_stage');
});

test('audit transition rejects stale state and never regresses to a prior stage', () => {
  assert.throws(() =>
    decideAuditTransition({
      stages: transitionStages,
      currentStageId: 'technical_core_stage',
      currentCompetencyId: 'technical_core',
      currentQuestionId: 'q_technical_1',
      stateVersion: 3,
      expectedStateVersion: 2,
      evidenceStrength: 'Strong',
      studentAnswer: 'I built a project.',
    })
  );

  const result = decideAuditTransition({
    stages: transitionStages,
    currentStageId: 'execution_stage',
    currentCompetencyId: 'execution',
    currentQuestionId: 'q_execution_1',
    stateVersion: 4,
    expectedStateVersion: 4,
    evidenceStrength: 'Strong',
    studentAnswer: 'I can dedicate six hours weekly.',
    requestedNextStageId: 'clarity_stage',
  });

  assert.equal(result.action, 'COMPLETE');
  assert.equal(result.nextStage, 'execution_stage');
});
