import test from 'node:test';
import assert from 'node:assert/strict';
import { retrieveCareerCandidates } from '../src/domain/careerCandidateRetriever';
import { buildCareerRecommendationsV2, calculateCareerFitV2 } from '../src/domain/careerFitV2';
import { planNextBestCareerQuestion } from '../src/domain/careerQuestionPlanner';
import { buildFallbackCareerSignalProfile, normalizeCareerSignalProfile } from '../src/domain/careerSignals';
import type { PublishedCareerRoleGenome } from '../src/domain/careerRoleGenome';

const roles: PublishedCareerRoleGenome[] = [
  {
    roleId: 'mech_design',
    title: 'Mechanical Design Engineer',
    category: 'Mechanical Design',
    description: 'Creates CAD models, GD&T drawings, assemblies, and manufacturing-ready designs.',
    streamId: 'mechanical',
    status: 'published',
    domains: ['mechanical', 'design'],
    requiredSkills: [{ skill: 'SolidWorks', weight: 0.7 }, { skill: 'GD&T', weight: 0.6 }, { skill: 'CAD', weight: 0.6 }],
    preferredInterests: ['product design', 'CAD', 'mechanical design'],
    problemTypes: ['design and modelling'],
    workStyles: ['design office work'],
    environments: ['design studio environment'],
    preferredEvidence: ['CAD assembly', 'engineering drawing', 'design calculation'],
    prerequisites: ['CAD'],
    antiSignals: ['no design work'],
    adjacentRoleIds: ['cae'],
    transitionDifficulty: 3,
    marketDemandScore: 75,
    demandLevel: 'High',
  },
  {
    roleId: 'cae',
    title: 'CAE Simulation Engineer',
    category: 'Mechanical Simulation',
    description: 'Runs FEA and CFD simulations for stress, thermal, vibration, and load analysis.',
    streamId: 'mechanical',
    status: 'published',
    domains: ['mechanical', 'simulation'],
    requiredSkills: [{ skill: 'ANSYS', weight: 0.8 }, { skill: 'FEA', weight: 0.7 }, { skill: 'thermal analysis', weight: 0.5 }],
    preferredInterests: ['simulation', 'analysis', 'FEA', 'CFD'],
    problemTypes: ['analysis under stress heat vibration load'],
    workStyles: ['analytical desk work'],
    environments: ['engineering analysis environment'],
    preferredEvidence: ['FEA report', 'CFD simulation', 'thermal analysis'],
    prerequisites: ['mechanics of materials'],
    antiSignals: ['no calculations'],
    adjacentRoleIds: ['mech_design'],
    transitionDifficulty: 4,
    marketDemandScore: 72,
    demandLevel: 'High',
  },
  {
    roleId: 'manufacturing',
    title: 'Manufacturing Quality Engineer',
    category: 'Manufacturing',
    description: 'Improves production processes, quality checks, shop-floor systems, and root-cause analysis.',
    streamId: 'mechanical',
    status: 'published',
    domains: ['mechanical', 'manufacturing'],
    requiredSkills: [{ skill: 'manufacturing processes', weight: 0.7 }, { skill: 'quality audits', weight: 0.6 }],
    preferredInterests: ['manufacturing', 'quality', 'plant operations'],
    problemTypes: ['field execution and process improvement'],
    workStyles: ['operations and coordination'],
    environments: ['field or plant environment'],
    preferredEvidence: ['manufacturing internship', 'quality checklist', 'process improvement'],
    prerequisites: ['manufacturing processes'],
    antiSignals: ['no field work'],
    adjacentRoleIds: ['mech_design'],
    transitionDifficulty: 3,
    marketDemandScore: 70,
    demandLevel: 'High',
  },
  {
    roleId: 'software',
    title: 'Full Stack Developer',
    category: 'Software Engineering',
    description: 'Builds React frontend, APIs, databases, and deployed web applications.',
    streamId: 'software',
    status: 'published',
    domains: ['software', 'web'],
    requiredSkills: [{ skill: 'React', weight: 0.8 }, { skill: 'APIs', weight: 0.7 }, { skill: 'SQL', weight: 0.5 }],
    preferredInterests: ['software', 'web applications', 'frontend'],
    problemTypes: ['building and debugging systems'],
    workStyles: ['product engineering'],
    environments: ['software team environment'],
    preferredEvidence: ['deployed React application', 'GitHub repository', 'API integration'],
    prerequisites: ['programming'],
    antiSignals: ['dislikes coding'],
    adjacentRoleIds: ['data'],
    transitionDifficulty: 7,
    marketDemandScore: 82,
    demandLevel: 'High',
  },
  {
    roleId: 'frontend',
    title: 'Frontend Engineer',
    category: 'Software Engineering',
    description: 'Builds responsive React user interfaces and frontend product flows.',
    streamId: 'software',
    status: 'published',
    domains: ['software', 'frontend'],
    requiredSkills: [{ skill: 'React', weight: 0.8 }, { skill: 'TypeScript', weight: 0.5 }],
    preferredInterests: ['frontend', 'UI', 'React'],
    problemTypes: ['building user interfaces'],
    workStyles: ['product engineering'],
    environments: ['software team environment'],
    preferredEvidence: ['deployed React application', 'responsive UI'],
    prerequisites: ['programming'],
    antiSignals: ['dislikes coding'],
    adjacentRoleIds: ['software'],
    transitionDifficulty: 6,
    marketDemandScore: 78,
    demandLevel: 'High',
  },
  {
    roleId: 'data',
    title: 'Data Analyst',
    category: 'Analytics',
    description: 'Uses SQL, Python, dashboards, and statistics to analyze product or business data.',
    streamId: 'software',
    status: 'published',
    domains: ['software', 'data'],
    requiredSkills: [{ skill: 'SQL', weight: 0.8 }, { skill: 'Python', weight: 0.6 }, { skill: 'dashboards', weight: 0.5 }],
    preferredInterests: ['data', 'analytics', 'dashboards'],
    problemTypes: ['analysis and pattern discovery'],
    workStyles: ['analytical desk work'],
    environments: ['software team environment'],
    preferredEvidence: ['dashboard project', 'SQL analysis', 'Python notebook'],
    prerequisites: ['statistics'],
    antiSignals: [],
    adjacentRoleIds: ['software'],
    transitionDifficulty: 5,
    marketDemandScore: 80,
    demandLevel: 'High',
  },
  {
    roleId: 'embedded',
    title: 'Embedded Systems Engineer',
    category: 'Hardware & Embedded',
    description: 'Programs microcontrollers and debugs firmware, sensors, and connected devices.',
    streamId: 'ece',
    status: 'published',
    domains: ['electronics', 'embedded'],
    requiredSkills: [{ skill: 'Embedded C', weight: 0.8 }, { skill: 'ESP32', weight: 0.6 }, { skill: 'I2C', weight: 0.5 }],
    preferredInterests: ['embedded systems', 'IoT', 'microcontrollers'],
    problemTypes: ['building and debugging systems'],
    workStyles: ['lab debugging'],
    environments: ['lab and engineering environment'],
    preferredEvidence: ['working prototype', 'firmware', 'sensor interfacing'],
    prerequisites: ['C programming'],
    antiSignals: [],
    adjacentRoleIds: ['software'],
    transitionDifficulty: 3,
    marketDemandScore: 76,
    demandLevel: 'High',
  },
  {
    roleId: 'bim',
    title: 'BIM Modelling Engineer',
    category: 'Civil BIM',
    description: 'Creates Revit BIM models, drawings, and coordination documents for civil projects.',
    streamId: 'civil',
    status: 'published',
    domains: ['civil', 'bim'],
    requiredSkills: [{ skill: 'Revit', weight: 0.8 }, { skill: 'AutoCAD', weight: 0.5 }],
    preferredInterests: ['BIM', 'civil modelling', 'drawings'],
    problemTypes: ['design and modelling'],
    workStyles: ['design office work'],
    environments: ['design studio environment'],
    preferredEvidence: ['Revit model', 'AutoCAD drawing', 'site plan'],
    prerequisites: ['civil drawings'],
    antiSignals: [],
    adjacentRoleIds: [],
    transitionDifficulty: 3,
    marketDemandScore: 72,
    demandLevel: 'High',
  },
  {
    roleId: 'draft_role',
    title: 'Unpublished Secret Role',
    category: 'Draft',
    description: 'Should never be recommended.',
    status: 'draft' as never,
    domains: ['software'],
    requiredSkills: [{ skill: 'React', weight: 1 }],
    preferredInterests: ['software'],
    problemTypes: [],
    workStyles: [],
    environments: [],
    preferredEvidence: [],
    prerequisites: [],
    antiSignals: [],
    adjacentRoleIds: [],
    transitionDifficulty: 1,
  },
];

function recommend(profileInput: unknown) {
  const profile = normalizeCareerSignalProfile(profileInput);
  const candidates = retrieveCareerCandidates(profile, roles);
  const results = candidates.map((role) => calculateCareerFitV2(profile, role));
  return buildCareerRecommendationsV2(results);
}

test('Mechanical design evidence ranks Mechanical Design first', () => {
  const recommendations = recommend({
    branch: 'Mechanical Engineering',
    interests: ['product design', 'CAD'],
    demonstratedSkills: [{ name: 'SolidWorks', confidence: 85, source: 'CAD assembly', evidenceLevel: 'DEMONSTRATED' }],
    projects: [{ name: 'gearbox CAD assembly', confidence: 90, source: 'built gearbox CAD assembly with drawings', evidenceLevel: 'DEMONSTRATED' }],
    workPreferences: ['design office work'],
    extractionConfidence: 80,
  });
  assert.equal(recommendations[0].roleId, 'mech_design');
});

test('Mechanical simulation evidence ranks CAE first', () => {
  const recommendations = recommend({
    branch: 'Mechanical Engineering',
    interests: ['simulation', 'FEA analysis'],
    demonstratedSkills: [{ name: 'ANSYS FEA thermal analysis', confidence: 85, source: 'FEA report', evidenceLevel: 'DEMONSTRATED' }],
    projects: [{ name: 'stress and vibration simulation', confidence: 88, source: 'ran ANSYS stress simulation', evidenceLevel: 'DEMONSTRATED' }],
    problemSolvingStyle: ['analysis under stress heat vibration load'],
    extractionConfidence: 80,
  });
  assert.equal(recommendations[0].roleId, 'cae');
});

test('Mechanical manufacturing evidence ranks Manufacturing first', () => {
  const recommendations = recommend({
    branch: 'Mechanical Engineering',
    interests: ['manufacturing', 'quality'],
    demonstratedSkills: ['manufacturing processes', 'quality audits'],
    internships: [{ name: 'manufacturing internship', confidence: 90, source: 'quality checklist and root cause analysis', evidenceLevel: 'VERIFIED' }],
    workPreferences: ['plant operations'],
    extractionConfidence: 80,
  });
  assert.equal(recommendations[0].roleId, 'manufacturing');
});

test('Mechanical software switch is eligible only with explicit switch intent', () => {
  const switchRecommendations = recommend({
    branch: 'Mechanical Engineering',
    explicitCareerIntent: 'I want to switch to software developer roles',
    willingToSwitchDomain: true,
    interests: ['software', 'web applications'],
    demonstratedSkills: ['React', 'APIs', 'SQL'],
    projects: [{ name: 'deployed React application', confidence: 90, source: 'deployed React API dashboard', evidenceLevel: 'DEMONSTRATED' }],
    extractionConfidence: 85,
  });
  assert.equal(switchRecommendations[0].roleId, 'software');

  const coreRecommendations = recommend({
    branch: 'Mechanical Engineering',
    interests: ['CAD', 'manufacturing'],
    claimedSkills: ['React'],
    projects: ['CAD model'],
    extractionConfidence: 60,
  });
  assert.notEqual(coreRecommendations[0].roleId, 'software');
});

test('ECE embedded and software switch both route correctly', () => {
  assert.equal(recommend({
    branch: 'ECE',
    interests: ['embedded systems', 'IoT'],
    demonstratedSkills: ['Embedded C', 'ESP32', 'I2C'],
    projects: ['working prototype firmware sensor interfacing'],
    extractionConfidence: 85,
  })[0].roleId, 'embedded');

  assert.equal(recommend({
    branch: 'ECE',
    explicitCareerIntent: 'software switch',
    willingToSwitchDomain: true,
    interests: ['frontend', 'React'],
    demonstratedSkills: ['React', 'TypeScript'],
    projects: ['deployed React application responsive UI'],
    extractionConfidence: 85,
  })[0].roleId, 'frontend');
});

test('Civil BIM, CSE Data, and CSE Frontend route correctly', () => {
  assert.equal(recommend({
    branch: 'Civil Engineering',
    interests: ['BIM', 'civil modelling'],
    demonstratedSkills: ['Revit', 'AutoCAD'],
    projects: ['Revit model AutoCAD drawing'],
    extractionConfidence: 85,
  })[0].roleId, 'bim');

  assert.equal(recommend({
    branch: 'CSE',
    interests: ['data analytics', 'dashboards'],
    demonstratedSkills: ['SQL', 'Python', 'dashboards'],
    projects: ['SQL dashboard project Python notebook'],
    extractionConfidence: 85,
  })[0].roleId, 'data');

  assert.equal(recommend({
    branch: 'CSE',
    interests: ['frontend', 'UI'],
    demonstratedSkills: ['React', 'TypeScript'],
    projects: ['deployed React application responsive UI'],
    extractionConfidence: 85,
  })[0].roleId, 'frontend');
});

test('Claimed skills score lower than demonstrated project evidence', () => {
  const claimed = calculateCareerFitV2(normalizeCareerSignalProfile({
    branch: 'CSE',
    claimedSkills: ['React'],
    interests: ['frontend'],
    extractionConfidence: 50,
  }), roles.find((role) => role.roleId === 'frontend')!);
  const demonstrated = calculateCareerFitV2(normalizeCareerSignalProfile({
    branch: 'CSE',
    demonstratedSkills: ['React'],
    projects: ['deployed React application responsive UI'],
    interests: ['frontend'],
    extractionConfidence: 80,
  }), roles.find((role) => role.roleId === 'frontend')!);
  assert.ok(demonstrated.fitScore > claimed.fitScore);
  assert.ok(demonstrated.confidenceScore > claimed.confidenceScore);
});

test('Explicit coding dislike penalizes software recommendation', () => {
  const recommendations = recommend({
    branch: 'CSE',
    interests: ['software', 'frontend'],
    demonstratedSkills: ['React', 'SQL'],
    projects: ['deployed React application'],
    dislikedWork: ['coding'],
    extractionConfidence: 80,
  });
  assert.notEqual(recommendations[0].roleId, 'software');
});

test('Contradictory or insufficient evidence triggers next-best question and no premature confidence', () => {
  const profile = normalizeCareerSignalProfile({
    branch: 'Mechanical Engineering',
    interests: ['design', 'simulation'],
    claimedSkills: ['SolidWorks', 'ANSYS'],
    extractionConfidence: 45,
  });
  const candidates = retrieveCareerCandidates(profile, roles);
  const results = candidates.map((role) => calculateCareerFitV2(profile, role));
  const question = planNextBestCareerQuestion(results);
  assert.ok(question);
  assert.match(question!.prompt, /Which sounds|project|internship/i);
  assert.ok(results[0].confidenceScore < 70);
});

test('Unpublished roles are rejected during candidate retrieval', () => {
  const candidates = retrieveCareerCandidates(normalizeCareerSignalProfile({
    branch: 'CSE',
    interests: ['software'],
    demonstratedSkills: ['React'],
    extractionConfidence: 80,
  }), roles);
  assert.ok(!candidates.some((role) => role.roleId === 'draft_role'));
});

test('Malformed model-like output normalizes safely through fallback extraction', () => {
  const normalized = normalizeCareerSignalProfile({ interests: [null, 'frontend'], extractionConfidence: 'bad' });
  assert.equal(normalized.interests.length, 1);
  assert.equal(normalized.extractionConfidence, 45);

  const fallback = buildFallbackCareerSignalProfile({
    branch: 'CSE',
    careerIntent: 'frontend',
    discoveryProfile: { skills: ['React'], projects: ['I built and deployed a React app'] },
  });
  assert.equal(fallback.claimedSkills[0].name, 'React');
  assert.equal(fallback.projects[0].evidenceLevel, 'DEMONSTRATED');
});

test('Recommendation calculation stays inside latency budget with mocked data', () => {
  const started = Date.now();
  for (let index = 0; index < 250; index += 1) {
    recommend({
      branch: 'CSE',
      interests: ['frontend', 'data'],
      demonstratedSkills: ['React', 'SQL'],
      projects: ['deployed React application SQL dashboard'],
      extractionConfidence: 80,
    });
  }
  assert.ok(Date.now() - started < 1000);
});
