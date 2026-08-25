import type { CareerFitV2Result } from './careerFitV2';

export interface CareerNextQuestion {
  prompt: string;
  dimension: string;
  roleIds: string[];
  informationGain: number;
}

function difference(left: string[], right: string[]): string[] {
  const rightText = right.join(' ').toLowerCase();
  return left.filter((item) => !rightText.includes(item.toLowerCase())).slice(0, 4);
}

export function planNextBestCareerQuestion(results: CareerFitV2Result[]): CareerNextQuestion | null {
  const [first, second] = [...results].sort((a, b) => b.fitScore - a.fitScore).slice(0, 2);
  if (!first || !second) return null;
  if (first.fitScore >= 70 && first.confidenceScore >= 70 && first.fitScore - second.fitScore >= 8) return null;

  const dimensions = [
    {
      name: 'work style',
      a: difference(first.role.workStyles, second.role.workStyles),
      b: difference(second.role.workStyles, first.role.workStyles),
    },
    {
      name: 'problem type',
      a: difference(first.role.problemTypes, second.role.problemTypes),
      b: difference(second.role.problemTypes, first.role.problemTypes),
    },
    {
      name: 'evidence',
      a: difference(first.role.preferredEvidence, second.role.preferredEvidence),
      b: difference(second.role.preferredEvidence, first.role.preferredEvidence),
    },
    {
      name: 'skill evidence',
      a: difference(first.role.requiredSkills.map((skill) => skill.skill), second.role.requiredSkills.map((skill) => skill.skill)),
      b: difference(second.role.requiredSkills.map((skill) => skill.skill), first.role.requiredSkills.map((skill) => skill.skill)),
    },
  ]
    .map((dimension) => ({ ...dimension, gain: dimension.a.length + dimension.b.length }))
    .sort((a, b) => b.gain - a.gain)[0];

  if (!dimensions || dimensions.gain === 0) {
    return {
      prompt: `Can you share one concrete project or internship example where you personally owned the work, including tools used and outcome?`,
      dimension: 'evidence coverage',
      roleIds: [first.role.roleId, second.role.roleId],
      informationGain: 1,
    };
  }

  const left = dimensions.a.join(', ') || first.role.title;
  const right = dimensions.b.join(', ') || second.role.title;
  return {
    prompt: `Which sounds more satisfying to you: ${left}, or ${right}? Share one example if you have tried either.`,
    dimension: dimensions.name,
    roleIds: [first.role.roleId, second.role.roleId],
    informationGain: dimensions.gain,
  };
}
