import type { GoogleGenAI } from '@google/genai';
import { getSupabase } from '../lib/supabase';
import { SEED_ROLE_COMPETENCIES } from '../lib/seedData';
import {
  QALAM_ADAPTIVE_UI_INSTRUCTION,
  QALAM_TOOL_DECLARATIONS,
  normalizeQalamToolCall,
  type QalamToolCall,
  type QalamToolSource,
  type RoleBenchmarkContext,
} from './qalamTools';

export const QALAM_GEMINI_TOOLS = [
  { functionDeclarations: QALAM_TOOL_DECLARATIONS as any },
];

export function normalizeGeminiFunctionCalls(
  functionCalls: Array<{ id?: string; name?: string; args?: Record<string, unknown> }> | undefined,
  source: QalamToolSource,
): QalamToolCall[] {
  return (functionCalls || [])
    .map((functionCall) => normalizeQalamToolCall({
      id: functionCall.id,
      name: functionCall.name,
      args: functionCall.args,
    }, source))
    .filter((call): call is QalamToolCall => Boolean(call));
}

export async function loadRoleBenchmarkContext(roleId?: string): Promise<RoleBenchmarkContext | null> {
  if (!roleId) return null;

  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('role_competencies')
      .select('minimum_readiness_benchmark')
      .eq('role_id', roleId)
      .limit(1);

    if (!error && data?.[0]?.minimum_readiness_benchmark != null) {
      return {
        minimumReadinessBenchmark: Number(data[0].minimum_readiness_benchmark),
      };
    }
  }

  const seeded = SEED_ROLE_COMPETENCIES.find((competency) => competency.role_id === roleId);
  if (seeded?.minimum_readiness_benchmark != null) {
    return { minimumReadinessBenchmark: Number(seeded.minimum_readiness_benchmark) };
  }

  return null;
}

interface PlanAdaptiveToolCallsInput {
  userText: string;
  history?: unknown[];
  studentContext?: Record<string, unknown>;
  targetRole: string;
  targetRoleId?: string;
  currentStage: string;
  evidenceStrengthHint?: string;
}

export async function planAdaptiveToolCalls(
  ai: GoogleGenAI,
  input: PlanAdaptiveToolCallsInput,
): Promise<QalamToolCall[]> {
  const benchmarkContext = await loadRoleBenchmarkContext(input.targetRoleId);
  const benchmarkText = benchmarkContext
    ? JSON.stringify(benchmarkContext)
    : 'No verified role benchmark is available for this turn.';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Decide whether the student's latest audit turn benefits from adaptive UI.

Student response: ${JSON.stringify(input.userText)}
Recent history: ${JSON.stringify((input.history || []).slice(-6))}
Academic context: ${JSON.stringify(input.studentContext || {})}
Target role: ${input.targetRole}
Audit stage: ${input.currentStage}
Verified role benchmark context: ${benchmarkText}
Evidence strength hint: ${input.evidenceStrengthHint || 'not supplied'}

If a visual/interactive surface adds material value, call one or at most two tools. If it does not, answer with a brief statement and call no tool. Do not manufacture scores or benchmarks.`,
      config: {
        systemInstruction: `You are Qalam's adaptive UI planner. ${QALAM_ADAPTIVE_UI_INSTRUCTION}`,
        tools: QALAM_GEMINI_TOOLS,
      },
    });

    return normalizeGeminiFunctionCalls(response.functionCalls, 'chat');
  } catch (error) {
    console.warn('Qalam adaptive UI planner notice:', error);
    return [];
  }
}
