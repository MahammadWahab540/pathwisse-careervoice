import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDiscoveryRecommendations,
  mergeDiscoveryAnswer,
  nextDiscoveryQuestion,
  type DiscoveryRole,
} from '../src/domain/careerDiscovery';

const roles: DiscoveryRole[] = [
  {
    id: 'cad',
    streamId: 'mechanical',
    title: 'CAD Design Engineer',
    category: 'Mechanical Design',
    description: 'Creates product designs, GD&T drawings, SolidWorks models and manufacturing-ready CAD.',
    skills: ['SolidWorks', 'AutoCAD', 'GD&T', 'manufacturing'],
  },
  {
    id: 'hvac',
    streamId: 'mechanical',
    title: 'HVAC Design Engineer',
    category: 'Thermal Systems',
    description: 'Designs thermal, HVAC and energy systems using heat-load calculations.',
    skills: ['Thermodynamics', 'AutoCAD', 'HVAC'],
  },
  {
    id: 'fullstack',
    streamId: 'software',
    title: 'Full Stack Software Engineer',
    category: 'Software Engineering',
    description: 'Builds React frontend, APIs, databases and production web applications.',
    skills: ['React', 'JavaScript', 'APIs', 'SQL'],
  },
  {
    id: 'data',
    streamId: 'data',
    title: 'Data Analyst',
    category: 'Data Analytics',
    description: 'Uses SQL, Python and dashboards to analyze business and product data.',
    skills: ['SQL', 'Python', 'Excel', 'dashboards'],
  },
];

test('Mechanical discovery starts with core and hybrid paths', () => {
  const question = nextDiscoveryQuestion({ branch: 'Mechanical Engineering', academicYear: 3, profile: {} }, roles);
  assert.equal(question?.key, 'interests');
  assert.match(question?.prompt || '', /Mechanical/);
  assert.ok(question?.suggestions.some((item) => /CAD|HVAC|Graduate Engineer|robotics/i.test(item)));
  assert.ok(!question?.suggestions.some((item) => /full stack|\bAI\b|data analyst/i.test(item)));
});

test('Mechanical recommendations prefer core roles before IT switch', () => {
  const recommendations = buildDiscoveryRecommendations(
    {
      branch: 'Mechanical Engineering',
      careerIntent: 'I like product design and manufacturing',
      profile: {
        interests: ['CAD product design', 'manufacturing'],
        skills: ['SolidWorks', 'AutoCAD'],
        projects: ['Designed a gearbox CAD assembly'],
        strengths: ['design', 'analysis'],
        workPreference: 'design and simulation',
      },
    },
    roles,
  );
  assert.equal(recommendations[0].id, 'cad');
  assert.equal(recommendations[0].direction, 'Strong Direction');
});

test('Mechanical to IT switch reduces branch weight without excluding software', () => {
  const profile = mergeDiscoveryAnswer(
    {
      interests: ['software products', 'web applications'],
      skills: ['React', 'JavaScript', 'SQL'],
      projects: ['Built a React dashboard with API integration'],
      strengths: ['coding', 'debugging'],
      workPreference: 'product building',
    },
    'itSwitch',
    'I want to explore IT/software careers',
  );
  const recommendations = buildDiscoveryRecommendations(
    { branch: 'Mechanical Engineering', careerIntent: 'software developer', profile },
    roles,
  );
  assert.equal(recommendations[0].id, 'fullstack');
  assert.ok(recommendations.some((role) => role.id === 'fullstack'));
  assert.ok(recommendations[0].fitReasons.some((reason) => /switch intent|not excluded/i.test(reason)));
});

test('Undecided student receives the next missing-signal question', () => {
  const question = nextDiscoveryQuestion({
    branch: 'ECE',
    profile: {
      interests: ['embedded systems'],
    },
  });
  assert.equal(question?.key, 'skills');
});

test('Insufficient data returns no recommendations until more signals exist', () => {
  const recommendations = buildDiscoveryRecommendations(
    { branch: 'Mechanical Engineering', profile: { interests: ['not sure'] } },
    roles,
  );
  assert.equal(recommendations.length, 0);
});
