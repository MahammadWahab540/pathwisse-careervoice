export type EvidenceLevel = 'INTEREST' | 'CLAIMED' | 'DEMONSTRATED' | 'VERIFIED';

export interface CareerSignal {
  name: string;
  confidence: number;
  source: string;
  evidenceLevel: EvidenceLevel;
}

export interface EvidenceSignal extends CareerSignal {
  description?: string;
}

export interface StudentCareerSignalProfile {
  branch?: string;
  academicYear?: number;
  interests: CareerSignal[];
  demonstratedSkills: CareerSignal[];
  claimedSkills: CareerSignal[];
  projects: EvidenceSignal[];
  internships: EvidenceSignal[];
  strengths: CareerSignal[];
  problemSolvingStyle: CareerSignal[];
  workPreferences: CareerSignal[];
  dislikedWork: CareerSignal[];
  preferredEnvironment: CareerSignal[];
  explicitCareerIntent?: string;
  willingToSwitchDomain?: boolean;
  learningWillingness?: number;
  constraints: CareerSignal[];
  extractionConfidence: number;
}

const EVIDENCE_LEVELS = new Set<EvidenceLevel>(['INTEREST', 'CLAIMED', 'DEMONSTRATED', 'VERIFIED']);

export function clampCareerScore(value: unknown, fallback = 0): number {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEvidenceLevel(value: unknown, fallback: EvidenceLevel): EvidenceLevel {
  const normalized = asString(value).toUpperCase() as EvidenceLevel;
  return EVIDENCE_LEVELS.has(normalized) ? normalized : fallback;
}

function signalFromUnknown(value: unknown, fallbackLevel: EvidenceLevel): CareerSignal | null {
  if (typeof value === 'string') {
    const name = value.trim();
    return name ? { name, confidence: 55, source: name, evidenceLevel: fallbackLevel } : null;
  }
  const record = asRecord(value);
  const name = asString(record.name);
  if (!name) return null;
  return {
    name,
    confidence: clampCareerScore(record.confidence, 55),
    source: asString(record.source) || name,
    evidenceLevel: normalizeEvidenceLevel(record.evidenceLevel, fallbackLevel),
  };
}

function evidenceFromUnknown(value: unknown, fallbackLevel: EvidenceLevel): EvidenceSignal | null {
  const signal = signalFromUnknown(value, fallbackLevel);
  if (!signal) return null;
  const description = asString(asRecord(value).description);
  return description ? { ...signal, description } : signal;
}

function signalList(value: unknown, fallbackLevel: EvidenceLevel): CareerSignal[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => signalFromUnknown(item, fallbackLevel))
    .filter((item): item is CareerSignal => Boolean(item));
}

function evidenceList(value: unknown, fallbackLevel: EvidenceLevel): EvidenceSignal[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => evidenceFromUnknown(item, fallbackLevel))
    .filter((item): item is EvidenceSignal => Boolean(item));
}

export function normalizeCareerSignalProfile(value: unknown): StudentCareerSignalProfile {
  const record = asRecord(value);
  const learningWillingness = record.learningWillingness == null
    ? undefined
    : clampCareerScore(record.learningWillingness);
  return {
    branch: asString(record.branch) || undefined,
    academicYear: record.academicYear == null ? undefined : Math.max(1, Math.min(8, Math.round(Number(record.academicYear)))),
    interests: signalList(record.interests, 'INTEREST'),
    demonstratedSkills: signalList(record.demonstratedSkills, 'DEMONSTRATED'),
    claimedSkills: signalList(record.claimedSkills, 'CLAIMED'),
    projects: evidenceList(record.projects, 'DEMONSTRATED'),
    internships: evidenceList(record.internships, 'VERIFIED'),
    strengths: signalList(record.strengths, 'CLAIMED'),
    problemSolvingStyle: signalList(record.problemSolvingStyle, 'INTEREST'),
    workPreferences: signalList(record.workPreferences, 'INTEREST'),
    dislikedWork: signalList(record.dislikedWork, 'INTEREST'),
    preferredEnvironment: signalList(record.preferredEnvironment, 'INTEREST'),
    explicitCareerIntent: asString(record.explicitCareerIntent) || undefined,
    willingToSwitchDomain: typeof record.willingToSwitchDomain === 'boolean' ? record.willingToSwitchDomain : undefined,
    learningWillingness,
    constraints: signalList(record.constraints, 'INTEREST'),
    extractionConfidence: clampCareerScore(record.extractionConfidence, 45),
  };
}

export function buildFallbackCareerSignalProfile(input: {
  branch?: string;
  academicYear?: number;
  careerIntent?: string;
  discoveryProfile?: Record<string, unknown>;
  conversationText?: string[];
}): StudentCareerSignalProfile {
  const profile = input.discoveryProfile || {};
  const source = [...(input.conversationText || []), JSON.stringify(profile)].join('\n').slice(0, 1200);
  const list = (key: string) => Array.isArray(profile[key])
    ? (profile[key] as unknown[]).map(String).filter(Boolean)
    : [];
  const toSignals = (items: string[], evidenceLevel: EvidenceLevel) =>
    items.map((name) => ({ name, confidence: 55, source: name, evidenceLevel }));
  const toEvidence = (items: string[]) =>
    items.map((name) => ({ name, description: name, confidence: /built|deployed|created|designed|tested|intern/i.test(name) ? 68 : 50, source: name, evidenceLevel: 'DEMONSTRATED' as const }));
  const explicitIntent = String(profile.explicitCareerIntent || input.careerIntent || '').trim();
  const hasExplicitSwitchIntent = Boolean(profile.wantsIT) ||
    /(switch|shift|move|change|transition|become|pursue|want|interested).*(software|data|developer|coding|programming|it|ai|ml|cloud|cyber)/i.test(explicitIntent);
  const dislikedWork = /dislike|hate|avoid|not interested in coding|no coding/i.test(source)
    ? [{ name: source.match(/(?:dislike|hate|avoid|not interested in|no)\s+([^.,;]+)/i)?.[1]?.trim() || 'stated dislike', confidence: 70, source, evidenceLevel: 'INTEREST' as const }]
    : [];

  return normalizeCareerSignalProfile({
    branch: input.branch,
    academicYear: input.academicYear,
    interests: toSignals(list('interests'), 'INTEREST'),
    claimedSkills: toSignals(list('skills'), 'CLAIMED'),
    demonstratedSkills: toSignals(list('demonstratedSkills'), 'DEMONSTRATED'),
    projects: toEvidence(list('projects')),
    internships: toEvidence(list('internships')),
    strengths: toSignals(list('strengths'), 'CLAIMED'),
    workPreferences: [
      ...(profile.workPreference ? [String(profile.workPreference)] : []),
      ...list('workPreferences'),
    ].length
      ? toSignals([...(profile.workPreference ? [String(profile.workPreference)] : []), ...list('workPreferences')], 'INTEREST')
      : [],
    dislikedWork: [...toSignals(list('dislikedWork'), 'INTEREST'), ...dislikedWork],
    problemSolvingStyle: toSignals(list('problemSolvingStyle'), 'INTEREST'),
    preferredEnvironment: toSignals(list('preferredEnvironment'), 'INTEREST'),
    explicitCareerIntent: explicitIntent || undefined,
    willingToSwitchDomain: hasExplicitSwitchIntent,
    learningWillingness: /learn|ready|willing|switch/i.test(source) ? 70 : 50,
    constraints: toSignals(list('constraints'), 'INTEREST'),
    extractionConfidence: source.trim().length > 200 ? 62 : 42,
  });
}
