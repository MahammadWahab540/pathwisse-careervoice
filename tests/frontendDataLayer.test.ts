import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClientError } from '../src/api/client';
import { calculateRoleFit, readinessStatusForScore } from '../src/domain/careerAudit';

test('ApiClientError correctly captures status, code, and details', () => {
  const err = new ApiClientError('AI service down', 503, 'AI_UNAVAILABLE', { provider: 'gemini' });
  assert.equal(err.name, 'ApiClientError');
  assert.equal(err.status, 503);
  assert.equal(err.code, 'AI_UNAVAILABLE');
  assert.deepEqual(err.details, { provider: 'gemini' });
});

test('Universal role recommendations work across diverse disciplines without role switches', () => {
  const roles = [
    { roleId: 'r_ml', title: 'Junior ML Engineer', category: 'AI & Data Science', keySkills: ['Python', 'PyTorch'] },
    { roleId: 'r_hvac', title: 'HVAC Design Engineer', category: 'Building Services', keySkills: ['Thermodynamics', 'AutoCAD'] },
    { roleId: 'r_soc', title: 'SOC Analyst L1', category: 'Cybersecurity', keySkills: ['Network Security', 'Linux'] },
    { roleId: 'r_cad', title: 'CAD Design Engineer', category: 'Mechanical Design', keySkills: ['SolidWorks', 'GD&T'] },
    { roleId: 'r_embedded', title: 'Embedded Systems Engineer', category: 'Embedded Systems', keySkills: ['Embedded C', 'STM32'] },
  ];

  for (const role of roles) {
    const fit = calculateRoleFit(
      {
        careerIntent: `I am interested in ${role.title.toLowerCase()} and using ${role.keySkills[0].toLowerCase()}`,
        branch: role.category,
        knownSkills: role.keySkills,
      },
      role
    );

    assert.ok(fit.matchScore >= 60, `Expected strong match for ${role.title}`);
    assert.ok(['Strong Fit', 'Good Fit'].includes(fit.fitBand));
    assert.ok(fit.fitReasons.length > 0);
  }
});

test('Evidence coverage distinguishes Weak Evidence from Insufficient Evidence', () => {
  const getEvidenceStatus = (strength: string) => {
    if (strength === 'Strong') return 'Strong Evidence';
    if (strength === 'Moderate') return 'Moderate Evidence';
    if (strength === 'Weak') return 'Weak Evidence';
    return 'Insufficient Evidence';
  };

  assert.equal(getEvidenceStatus('Strong'), 'Strong Evidence');
  assert.equal(getEvidenceStatus('Moderate'), 'Moderate Evidence');
  assert.equal(getEvidenceStatus('Weak'), 'Weak Evidence');
  assert.equal(getEvidenceStatus('None'), 'Insufficient Evidence');
  assert.equal(getEvidenceStatus(''), 'Insufficient Evidence');
});

test('Pathwisse roadmap handoff preserves UNMAPPED state without generating fake stage IDs', () => {
  const gaps = [
    {
      gapId: 'gap_1',
      skillId: 'react',
      skillName: 'React & TypeScript',
      expectedScore: 80,
      demonstratedScore: 40,
      gapScore: 40,
      priority: 'High' as const,
      mappingStatus: 'MAPPED' as const,
      recommendedPathwisseSkillId: 'pw_skill_react_3',
      recommendedStageIds: ['3', '4'],
      evidenceIds: ['ev_1'],
    },
    {
      gapId: 'gap_2',
      skillId: 'custom_dsp',
      skillName: 'Digital Signal Processing',
      expectedScore: 75,
      demonstratedScore: 30,
      gapScore: 45,
      priority: 'Critical' as const,
      mappingStatus: 'UNMAPPED' as const,
      recommendedPathwisseSkillId: undefined,
      recommendedStageIds: [],
      evidenceIds: ['ev_2'],
    },
  ];

  const mapped = gaps.filter((g) => g.mappingStatus === 'MAPPED');
  const unmapped = gaps.filter((g) => g.mappingStatus === 'UNMAPPED');

  assert.equal(mapped.length, 1);
  assert.equal(mapped[0].recommendedPathwisseSkillId, 'pw_skill_react_3');
  assert.deepEqual(mapped[0].recommendedStageIds, ['3', '4']);

  assert.equal(unmapped.length, 1);
  assert.equal(unmapped[0].recommendedPathwisseSkillId, undefined);
  assert.equal(unmapped[0].recommendedStageIds.length, 0);
});
