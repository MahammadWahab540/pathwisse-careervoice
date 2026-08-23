export type DiscoveryQuestionKey =
  | 'interests'
  | 'skills'
  | 'projects'
  | 'strengths'
  | 'workPreference'
  | 'itSwitch';

export type RecommendationDirection = 'Strong Direction' | 'Worth Exploring' | 'Alternative Path';

export interface CareerDiscoveryProfile {
  answers?: Array<{ questionKey: string; answer: string; answeredAt?: string }>;
  interests?: string[];
  skills?: string[];
  projects?: string[];
  strengths?: string[];
  workPreference?: string;
  wantsIT?: boolean;
  explicitCareerIntent?: string;
  completed?: boolean;
}

export interface DiscoveryStudentContext {
  branch?: string;
  academicYear?: number;
  careerIntent?: string;
  profile?: CareerDiscoveryProfile;
}

export interface DiscoveryQuestion {
  key: DiscoveryQuestionKey;
  prompt: string;
  suggestions: string[];
}

export interface DiscoveryRole {
  id: string;
  streamId: string;
  title: string;
  category?: string;
  description?: string;
  demandLevel?: string;
  status?: string;
  skills: string[];
}

export interface DiscoveryRecommendation extends DiscoveryRole {
  matchScore: number;
  direction: RecommendationDirection;
  fitBand: 'Strong Fit' | 'Good Fit' | 'Exploratory Fit' | 'Stretch Fit';
  fitReasons: string[];
  signalScores: {
    interests: number;
    skills: number;
    projects: number;
    branch: number;
    strengths: number;
    workPreference: number;
    careerIntent: number;
  };
}

const IT_TERMS = [
  'software',
  'frontend',
  'backend',
  'full stack',
  'web',
  'app',
  'api',
  'cloud',
  'devops',
  'data',
  'machine learning',
  'ai',
  'cyber',
  'security',
  'python',
  'java',
  'javascript',
  'react',
];

const MECHANICAL_TERMS = [
  'mechanical',
  'cad',
  'solidworks',
  'catia',
  'autocad',
  'thermal',
  'manufacturing',
  'hvac',
  'automobile',
  'robotics',
  'mechatronics',
  'cae',
  'ansys',
];

const BRANCH_DISCOVERY_COPY: Record<string, {
  label: string;
  interestPrompt: string;
  skillPrompt: string;
  projectPrompt: string;
  strengthsPrompt: string;
  workPreferencePrompt: string;
  fallbackSuggestions: string[];
}> = {
  mechanical: {
    label: 'Mechanical Engineering',
    interestPrompt:
      'Based on your Mechanical Engineering background, which direction feels closer to you right now: product design, manufacturing, thermal/HVAC, simulation, robotics/EV, or plant operations?',
    skillPrompt:
      'Which Mechanical tools or engineering skills can you already show with evidence: CAD, GD&T, manufacturing processes, thermal calculations, simulation, robotics, or automation?',
    projectPrompt:
      'Tell me about one Mechanical project, lab build, internship, design model, simulation, or prototype you can explain in detail.',
    strengthsPrompt:
      'What is your stronger Mechanical signal: visualizing parts, analyzing failures, improving processes, troubleshooting machines, doing calculations, or coordinating shop-floor work?',
    workPreferencePrompt:
      'What daily work would you prefer: CAD/design, CAE/CFD simulation, production and quality, HVAC/building systems, robotics/automation, EV systems, or field operations?',
    fallbackSuggestions: [
      'CAD Design Engineer',
      'Graduate Engineer Trainee',
      'HVAC Design Engineer',
      'FEA / CFD Simulation Trainee',
      'Robotics Software Engineer Trainee',
    ],
  },
  civil: {
    label: 'Civil Engineering',
    interestPrompt:
      'Based on your Civil Engineering background, which direction feels closer to you: site execution, structural design, BIM, quantity surveying, transportation, or project management?',
    skillPrompt:
      'Which Civil tools or skills can you show with evidence: AutoCAD, Revit, STAAD, surveying, concrete technology, estimation, or site supervision?',
    projectPrompt:
      'Tell me about one Civil project, site internship, drawing, estimate, survey, or structural model you can explain clearly.',
    strengthsPrompt:
      'What is your stronger Civil signal: field coordination, drawing/modeling, calculations, quality checks, planning, or contractor communication?',
    workPreferencePrompt:
      'What daily work would you prefer: site execution, design office work, BIM modeling, estimation, quality control, or project coordination?',
    fallbackSuggestions: ['Junior Site Engineer', 'BIM Modelling Trainee'],
  },
  ece: {
    label: 'Electronics / ECE',
    interestPrompt:
      'Based on your ECE background, which direction feels closer to you: embedded systems, VLSI, PCB design, telecom/RF, IoT, robotics, or software?',
    skillPrompt:
      'Which ECE tools or skills can you show with evidence: C, microcontrollers, Verilog, PCB design, communication protocols, MATLAB, or circuit debugging?',
    projectPrompt:
      'Tell me about one ECE project, circuit, firmware build, PCB, IoT prototype, or lab work you can explain in detail.',
    strengthsPrompt:
      'What is your stronger ECE signal: debugging hardware, writing firmware, understanding circuits, math/signal analysis, or building prototypes?',
    workPreferencePrompt:
      'What daily work would you prefer: firmware, hardware validation, chip design, PCB layout, telecom networks, robotics, or software tools?',
    fallbackSuggestions: ['Embedded Systems Engineer Trainee', 'VLSI Design Trainee', 'PCB Design Engineer Trainee', 'RF / Telecom Engineer Trainee'],
  },
  eee: {
    label: 'Electrical / EEE',
    interestPrompt:
      'Based on your Electrical background, which direction feels closer to you: power systems, electrical design, automation, EV, embedded control, or plant maintenance?',
    skillPrompt:
      'Which Electrical tools or skills can you show with evidence: load calculations, SLDs, PLCs, motors, power electronics, AutoCAD Electrical, or embedded control?',
    projectPrompt:
      'Tell me about one Electrical project, panel design, automation build, EV/power electronics work, or internship you can explain clearly.',
    strengthsPrompt:
      'What is your stronger Electrical signal: calculations, wiring/design, troubleshooting, automation logic, safety thinking, or field execution?',
    workPreferencePrompt:
      'What daily work would you prefer: electrical design, automation, power systems, EV systems, maintenance, testing, or embedded control?',
    fallbackSuggestions: ['Electrical Systems Design Trainee', 'PLC / SCADA Automation Trainee', 'Embedded Systems Engineer Trainee'],
  },
  software: {
    label: 'Computer Science / IT',
    interestPrompt:
      'Based on your Computer Science background, which software direction feels closer to you: frontend, backend, full stack, data, AI/ML, cybersecurity, cloud, or product engineering?',
    skillPrompt:
      'Which software skills can you already demonstrate with evidence: programming, React, APIs, SQL, Python, cloud, testing, data, or AI/ML?',
    projectPrompt:
      'Tell me about one software project, internship, GitHub build, data pipeline, model, or product feature you can explain in detail.',
    strengthsPrompt:
      'What is your stronger software signal: coding, debugging, system design, data thinking, UI building, security mindset, or learning new tools fast?',
    workPreferencePrompt:
      'What daily work would you prefer: product building, backend APIs, frontend UI, data analysis, ML experiments, security monitoring, or cloud operations?',
    fallbackSuggestions: ['Full Stack Developer (Junior)', 'Frontend Engineer', 'Data Analyst', 'Junior ML Engineer', 'SOC Analyst L1'],
  },
};

const CORE_BY_BRANCH: Record<string, string[]> = {
  mechanical: MECHANICAL_TERMS,
  mech: MECHANICAL_TERMS,
  civil: ['civil', 'structural', 'construction', 'surveying', 'autocad', 'bim'],
  ece: ['embedded', 'vlsi', 'electronics', 'iot', 'signal', 'communication', 'pcb'],
  eee: ['electrical', 'power', 'embedded', 'ev', 'automation', 'plc'],
};

function normalizeText(value: unknown): string {
  return String(value || '').toLowerCase();
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((value) => String(value).trim()).filter(Boolean);
}

function wordsFrom(...values: Array<string | string[] | undefined>): string[] {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value || '']))
    .join(' ')
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((word) => word.length >= 2);
}

function hasAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function termOverlap(source: string[], target: string[]): number {
  if (source.length === 0 || target.length === 0) return 0;
  const targetText = target.join(' ').toLowerCase();
  const hits = source.filter((term) => targetText.includes(term.toLowerCase())).length;
  return Math.min(100, Math.round((hits / Math.min(source.length, 6)) * 100));
}

export function isMechanicalBranch(branch?: string): boolean {
  return /mechanical|mech/i.test(branch || '');
}

function branchFamily(branch?: string): keyof typeof BRANCH_DISCOVERY_COPY {
  const normalized = normalizeText(branch);
  if (/mechanical|mech/.test(normalized)) return 'mechanical';
  if (/civil/.test(normalized)) return 'civil';
  if (/ece|electronics|communication/.test(normalized)) return 'ece';
  if (/eee|electrical/.test(normalized)) return 'eee';
  if (/computer|software|information|it|cse|cs/.test(normalized)) return 'software';
  return 'software';
}

function roleText(role: DiscoveryRole): string {
  return `${role.title} ${role.category || ''} ${role.description || ''} ${role.skills.join(' ')}`;
}

function branchRelevantRoles(branch: string | undefined, roles: DiscoveryRole[] = [], includeIT = false): DiscoveryRole[] {
  const family = branchFamily(branch);
  const branchTerms = CORE_BY_BRANCH[family] || CORE_BY_BRANCH[normalizeText(branch)] || [];
  return roles
    .filter((role) => {
      const text = normalizeText(roleText(role));
      const isIT = hasAny(text, IT_TERMS);
      if (family === 'software') return isIT || hasAny(text, ['software', 'data', 'ai', 'cyber', 'frontend', 'backend']);
      if (includeIT && isIT) return true;
      return hasAny(text, branchTerms);
    })
    .sort((a, b) => {
      const aText = normalizeText(roleText(a));
      const bText = normalizeText(roleText(b));
      const aIT = hasAny(aText, IT_TERMS) ? 1 : 0;
      const bIT = hasAny(bText, IT_TERMS) ? 1 : 0;
      return aIT - bIT || a.title.localeCompare(b.title);
    });
}

function roleSuggestions(branch: string | undefined, roles: DiscoveryRole[] | undefined, fallback: string[], includeIT = false): string[] {
  const titles = branchRelevantRoles(branch, roles, includeIT).map((role) => role.title);
  return [...new Set([...titles, ...fallback])].slice(0, 5);
}

export function wantsITSwitch(context: DiscoveryStudentContext): boolean {
  const profile = context.profile || {};
  if (profile.wantsIT === true) return true;
  const combined = wordsFrom(
    context.careerIntent,
    profile.explicitCareerIntent,
    profile.interests,
    profile.skills,
    profile.projects,
    profile.answers?.map((answer) => answer.answer) || [],
  ).join(' ');
  return hasAny(combined, IT_TERMS);
}

export function nextDiscoveryQuestion(context: DiscoveryStudentContext, roles: DiscoveryRole[] = []): DiscoveryQuestion | null {
  const profile = context.profile || {};
  const branch = context.branch || 'engineering';
  const mechanical = isMechanicalBranch(branch);
  const copy = BRANCH_DISCOVERY_COPY[branchFamily(branch)];

  if (normalizeList(profile.interests).length === 0) {
    return {
      key: 'interests',
      prompt: copy.interestPrompt,
      suggestions: mechanical
        ? copy.fallbackSuggestions
        : roleSuggestions(branch, roles, copy.fallbackSuggestions, false),
    };
  }

  if (normalizeList(profile.skills).length === 0) {
    return {
      key: 'skills',
      prompt: copy.skillPrompt,
      suggestions: mechanical
        ? ['SolidWorks / Creo, AutoCAD, GD&T', 'Manufacturing processes and quality audits', 'ANSYS / Abaqus, meshing, stress or CFD analysis', 'PLC, sensors, robotics or EV systems']
        : roleSuggestions(branch, roles, copy.fallbackSuggestions, branchFamily(branch) === 'software'),
    };
  }

  if (normalizeList(profile.projects).length === 0) {
    return {
      key: 'projects',
      prompt: copy.projectPrompt,
      suggestions: mechanical
        ? ['CAD model or assembly drawing', 'FEA/CFD or thermal analysis', 'Manufacturing/quality internship work', 'Robotics, automation, or EV prototype']
        : ['Academic project', 'Internship work', 'Portfolio project', 'Certification or lab proof'],
    };
  }

  if (mechanical && profile.wantsIT === undefined && !wantsITSwitch(context)) {
    return {
      key: 'itSwitch',
      prompt: 'Before I recommend roles, do you want to stay closer to Mechanical/core and hybrid careers, or should I also explore IT/software jobs for you?',
      suggestions: ['Stay closer to Mechanical/core roles', 'Explore hybrid Mechanical + robotics/data roles', 'I want to explore IT/software jobs'],
    };
  }

  if (normalizeList(profile.strengths).length === 0) {
    return {
      key: 'strengths',
      prompt: copy.strengthsPrompt,
      suggestions: mechanical
        ? ['Design visualization and drawings', 'Failure analysis and calculations', 'Troubleshooting machines or systems', 'Process improvement and coordination']
        : ['Analysis and problem solving', 'Building and debugging', 'Communication and coordination', 'Learning tools fast'],
    };
  }

  if (!profile.workPreference) {
    return {
      key: 'workPreference',
      prompt: copy.workPreferencePrompt,
      suggestions: mechanical
        ? ['CAD/design office work', 'Simulation and analysis', 'Production, quality, or plant operations', 'Robotics, automation, or EV systems']
        : ['Product building', 'Design and simulation', 'Field or operations work', 'Data analysis and decision support'],
    };
  }

  return null;
}

export function mergeDiscoveryAnswer(
  profile: CareerDiscoveryProfile,
  questionKey: DiscoveryQuestionKey,
  answer: string,
  answeredAt = new Date().toISOString(),
): CareerDiscoveryProfile {
  const next: CareerDiscoveryProfile = {
    ...profile,
    answers: [...(profile.answers || []), { questionKey, answer, answeredAt }],
  };
  const text = answer.trim();
  const parts = text.split(/[,;/]|\band\b/gi).map((part) => part.trim()).filter(Boolean);
  if (questionKey === 'interests') next.interests = [...new Set([...(profile.interests || []), ...parts])];
  if (questionKey === 'skills') next.skills = [...new Set([...(profile.skills || []), ...parts])];
  if (questionKey === 'projects') next.projects = [...new Set([...(profile.projects || []), text])];
  if (questionKey === 'strengths') next.strengths = [...new Set([...(profile.strengths || []), ...parts])];
  if (questionKey === 'workPreference') next.workPreference = text;
  if (questionKey === 'itSwitch') {
    next.wantsIT = hasAny(text, IT_TERMS) || /explore it|software careers|want it/i.test(text);
  }
  return next;
}

function branchScore(context: DiscoveryStudentContext, role: DiscoveryRole, wantsIT: boolean): number {
  const branch = normalizeText(context.branch);
  const roleText = normalizeText(`${role.title} ${role.category} ${role.description} ${role.skills.join(' ')}`);
  if (!branch) return 35;

  const coreTerms = Object.entries(CORE_BY_BRANCH).find(([key]) => branch.includes(key))?.[1] || [branch];
  const coreOverlap = hasAny(roleText, coreTerms) ? 100 : 20;
  const itRole = hasAny(roleText, IT_TERMS);

  if (isMechanicalBranch(branch) && wantsIT && itRole) return 55;
  if (isMechanicalBranch(branch) && !wantsIT && itRole) return 20;
  return coreOverlap;
}

export function buildDiscoveryRecommendations(
  context: DiscoveryStudentContext,
  roles: DiscoveryRole[],
  limit = 5,
): DiscoveryRecommendation[] {
  const profile = context.profile || {};
  const wantsIT = wantsITSwitch(context);
  const interestTerms = wordsFrom(profile.interests, context.careerIntent, profile.explicitCareerIntent);
  const skillTerms = wordsFrom(profile.skills);
  const projectTerms = wordsFrom(profile.projects);
  const strengthTerms = wordsFrom(profile.strengths);
  const preferenceTerms = wordsFrom(profile.workPreference);
  const intentTerms = wordsFrom(context.careerIntent, profile.explicitCareerIntent);

  const enoughSignals =
    interestTerms.length + skillTerms.length + projectTerms.length + strengthTerms.length + preferenceTerms.length + intentTerms.length >= 3;
  if (!enoughSignals) return [];

  return roles
    .map((role) => {
      const roleTerms = wordsFrom(role.title, role.category, role.description, role.skills);
      const roleIsIT = hasAny(normalizeText(roleText(role)), IT_TERMS);
      const mechanicalITSwitch = wantsIT && isMechanicalBranch(context.branch) && roleIsIT;
      const signalScores = {
        interests: termOverlap(interestTerms, roleTerms),
        skills: termOverlap(skillTerms, roleTerms),
        projects: termOverlap(projectTerms, roleTerms),
        branch: branchScore(context, role, wantsIT),
        strengths: termOverlap(strengthTerms, roleTerms),
        workPreference: termOverlap(preferenceTerms, roleTerms),
        careerIntent: termOverlap(intentTerms, roleTerms),
      };
      const matchScore = Math.round(
        signalScores.interests * 0.2 +
          signalScores.skills * 0.2 +
          signalScores.projects * 0.15 +
          signalScores.branch * 0.15 +
          signalScores.strengths * 0.1 +
          signalScores.workPreference * 0.1 +
          signalScores.careerIntent * 0.1,
      );
      const direction: RecommendationDirection =
        matchScore >= 65 ? 'Strong Direction' : matchScore >= 42 ? 'Worth Exploring' : 'Alternative Path';
      const fitBand: DiscoveryRecommendation['fitBand'] =
        direction === 'Strong Direction'
          ? 'Strong Fit'
          : direction === 'Worth Exploring'
          ? 'Exploratory Fit'
          : 'Stretch Fit';
      const fitReasons = [
        mechanicalITSwitch
          ? 'Branch switch intent detected: IT/software roles remain eligible with reduced branch weight.'
          : signalScores.branch >= 55
          ? `Branch relevance: ${context.branch || 'engineering'} background has usable overlap.`
          : 'Branch relevance is lower, but not excluded.',
        signalScores.skills > 0 ? 'Required skills overlap with demonstrated skills.' : 'Skill evidence needs validation during audit.',
        signalScores.projects > 0 ? 'Project evidence points toward this role family.' : 'Add stronger project proof to confirm fit.',
        mechanicalITSwitch ? 'Software switch was allowed; the role was not excluded because the student explicitly asked for IT.' : '',
      ].filter(Boolean);
      return { ...role, matchScore, direction, fitBand, fitReasons, signalScores };
    })
    .filter((role) => role.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.title.localeCompare(b.title))
    .slice(0, Math.max(3, Math.min(5, limit)));
}
