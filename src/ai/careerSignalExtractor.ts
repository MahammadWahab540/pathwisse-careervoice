import { Type } from '@google/genai';
import { buildFallbackCareerSignalProfile, normalizeCareerSignalProfile, type StudentCareerSignalProfile } from '../domain/careerSignals';
import { serverConfig } from '../server/config';
import { AiResponseValidationError, generateStructuredJson } from '../server/gemini';

export interface CareerSignalExtractionInput {
  studentProfile?: Record<string, unknown>;
  branch?: string;
  academicYear?: number;
  careerIntent?: string;
  discoveryAnswers?: Array<{ questionKey?: string; answer?: string }>;
  projectDescriptions?: string[];
  internships?: string[];
  conversationText?: string[];
}

export async function extractCareerSignals(input: CareerSignalExtractionInput): Promise<StudentCareerSignalProfile> {
  const fallback = buildFallbackCareerSignalProfile({
    branch: input.branch,
    academicYear: input.academicYear,
    careerIntent: input.careerIntent,
    discoveryProfile: {
      ...(input.studentProfile || {}),
      projects: input.projectDescriptions || input.studentProfile?.projects,
      internships: input.internships || input.studentProfile?.internships,
    },
    conversationText: [
      ...(input.conversationText || []),
      ...(input.discoveryAnswers || []).map((answer) => answer.answer || ''),
    ],
  });

  if (!serverConfig.geminiConfigured) return fallback;

  try {
    return await generateStructuredJson<StudentCareerSignalProfile>({
      model: serverConfig.geminiEvaluationModel,
      prompt: JSON.stringify(input),
      systemInstruction: `Extract a Pathwisse StudentCareerSignalProfile from the supplied student data. Never invent experience. Claimed skills stay claimed unless project, internship, deployment, testing, or ownership evidence demonstrates them. Preserve short source snippets. Return only roles signals, never career recommendations.`,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          branch: { type: Type.STRING },
          academicYear: { type: Type.NUMBER },
          interests: { type: Type.ARRAY, items: signalSchema(Type) },
          demonstratedSkills: { type: Type.ARRAY, items: signalSchema(Type) },
          claimedSkills: { type: Type.ARRAY, items: signalSchema(Type) },
          projects: { type: Type.ARRAY, items: signalSchema(Type) },
          internships: { type: Type.ARRAY, items: signalSchema(Type) },
          strengths: { type: Type.ARRAY, items: signalSchema(Type) },
          problemSolvingStyle: { type: Type.ARRAY, items: signalSchema(Type) },
          workPreferences: { type: Type.ARRAY, items: signalSchema(Type) },
          dislikedWork: { type: Type.ARRAY, items: signalSchema(Type) },
          preferredEnvironment: { type: Type.ARRAY, items: signalSchema(Type) },
          explicitCareerIntent: { type: Type.STRING },
          willingToSwitchDomain: { type: Type.BOOLEAN },
          learningWillingness: { type: Type.NUMBER },
          constraints: { type: Type.ARRAY, items: signalSchema(Type) },
          extractionConfidence: { type: Type.NUMBER },
        },
        required: [
          'interests',
          'demonstratedSkills',
          'claimedSkills',
          'projects',
          'internships',
          'strengths',
          'problemSolvingStyle',
          'workPreferences',
          'dislikedWork',
          'preferredEnvironment',
          'constraints',
          'extractionConfidence',
        ],
      },
      validate: (value) => {
        const normalized = normalizeCareerSignalProfile(value);
        if (normalized.extractionConfidence < 0) throw new AiResponseValidationError('Invalid extraction confidence.');
        if (normalized.extractionConfidence < 50) return fallback;
        return normalized;
      },
    });
  } catch {
    return fallback;
  }
}

function signalSchema(type: typeof Type) {
  return {
    type: type.OBJECT,
    properties: {
      name: { type: type.STRING },
      confidence: { type: type.NUMBER },
      source: { type: type.STRING },
      evidenceLevel: { type: type.STRING, enum: ['INTEREST', 'CLAIMED', 'DEMONSTRATED', 'VERIFIED'] },
      description: { type: type.STRING },
    },
    required: ['name', 'confidence', 'source', 'evidenceLevel'],
  };
}
