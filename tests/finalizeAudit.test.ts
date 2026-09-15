import test from 'node:test';
import assert from 'node:assert/strict';
import { AiUnavailableError } from '../src/server/gemini';
import {
  AuditFinalizationError,
  finalizeCareerAudit,
  persistFinalClassification,
} from '../src/server/finalizeAudit';

const classification = {
  competencySignals: [{
    skillId: 'skill-1',
    evidenceId: 'evidence-1',
    extractedLevel: 'Intermediate',
    confidenceScore: 80,
    evidenceStrength: 'Moderate',
    contradictory: false,
  }],
  dimensionSignals: [
    ...['careerClarity', 'projectReadiness', 'communication', 'placementReadiness', 'executionReadiness'].map(
      (dimension) => ({
        dimension,
        evidenceId: 'evidence-1',
        extractedLevel: 'Intermediate',
        confidenceScore: 80,
        evidenceStrength: 'Moderate',
      })
    ),
  ],
};

function createPrePersistenceSupabase() {
  const writes: string[] = [];
  const rows: Record<string, unknown> = {
    audit_reports: null,
    audit_sessions: {
      id: 'audit-1', user_id: 'user-1', target_role_id: 'role-1', status: 'in_progress', context: {},
    },
    career_roles: {
      id: 'role-1', title: 'Backend Engineer', category: 'Engineering', description: 'Build backend services', status: 'published',
    },
    role_competencies: {
      role_id: 'role-1',
      minimum_readiness_benchmark: 75,
      clarity_weight: 1,
      technical_weight: 1,
      project_weight: 1,
      communication_weight: 1,
      placement_weight: 1,
      execution_weight: 1,
      core_competencies: [{
        skillId: 'skill-1', skillSlug: 'api_design', skillName: 'API Design', category: 'Technical',
        expectedScore: 70, importanceWeight: 1, dependencyWeight: 1, employabilityWeight: 1,
        description: 'Design reliable APIs',
      }],
    },
    audit_evidence: [{
      id: 'evidence-1', evidence_type: 'text', raw_text: 'I designed and shipped a versioned API.', source: 'text',
    }],
    audit_messages: [],
    career_voice_pathwisse_mappings: [],
  };

  const supabase = {
    from(table: string) {
      let operation: 'read' | 'update' = 'read';
      const result = () => Promise.resolve({ data: operation === 'read' ? rows[table] : null, error: null });
      const query: Record<string, unknown> = {
        select: () => query,
        eq: () => query,
        order: () => result(),
        maybeSingle: () => result(),
        update: () => {
          operation = 'update';
          writes.push(table);
          return query;
        },
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          result().then(resolve, reject),
      };
      return query;
    },
  };

  return { supabase: supabase as any, writes };
}

test('explanation failure happens before classification, score, or gap persistence', async () => {
  const { supabase, writes } = createPrePersistenceSupabase();
  let generationCall = 0;

  await assert.rejects(
    finalizeCareerAudit(supabase, 'audit-1', {
      generateStructuredJson: async () => {
        generationCall += 1;
        if (generationCall === 1) return classification as any;
        throw new Error('malformed explanation');
      },
    }),
    (error: unknown) =>
      error instanceof AuditFinalizationError && error.code === 'AI_RESPONSE_INVALID' && error.status === 502
  );

  assert.equal(generationCall, 2);
  assert.deepEqual(writes, ['audit_sessions']);
});

test('AI provider outage is surfaced as AI_UNAVAILABLE with HTTP 503', async () => {
  const { supabase, writes } = createPrePersistenceSupabase();

  await assert.rejects(
    finalizeCareerAudit(supabase, 'audit-1', {
      generateStructuredJson: async () => {
        throw new AiUnavailableError('provider outage');
      },
    }),
    (error: unknown) =>
      error instanceof AuditFinalizationError &&
      error.code === 'AI_UNAVAILABLE' &&
      error.status === 503 &&
      error.message === 'provider outage'
  );

  assert.deepEqual(writes, ['audit_sessions']);
});

test('explanation provider outage is surfaced as 503 before score persistence', async () => {
  const { supabase, writes } = createPrePersistenceSupabase();
  let generationCall = 0;

  await assert.rejects(
    finalizeCareerAudit(supabase, 'audit-1', {
      generateStructuredJson: async () => {
        generationCall += 1;
        if (generationCall === 1) return classification as any;
        throw new AiUnavailableError('explanation provider outage');
      },
    }),
    (error: unknown) =>
      error instanceof AuditFinalizationError &&
      error.code === 'AI_UNAVAILABLE' &&
      error.status === 503 &&
      error.message === 'explanation provider outage'
  );

  assert.equal(generationCall, 2);
  assert.deepEqual(writes, ['audit_sessions']);
});

test('retry updates an existing final signal before score and gap upserts', async () => {
  let updatedPayload: Record<string, unknown> | null = null;
  let updatedId: string | null = null;
  const supabase = {
    from() {
      const lookup = Promise.resolve({ data: { id: 'signal-existing' }, error: null });
      const updateResult = Promise.resolve({ data: null, error: null });
      const query: Record<string, any> = {
        select: () => query,
        eq: (field: string, value: string) => {
          if (field === 'id') updatedId = value;
          return updatedPayload ? updateResult : query;
        },
        maybeSingle: () => lookup,
        update: (payload: Record<string, unknown>) => {
          updatedPayload = payload;
          return query;
        },
      };
      return query;
    },
  };

  const signalId = await persistFinalClassification(supabase as any, {
    auditId: 'audit-1',
    studentId: 'user-1',
    roleId: 'role-1',
    competency: {
      skillId: 'skill-1',
      skillSlug: 'api_design',
      skillName: 'API Design',
      category: 'Technical',
      expectedScore: 70,
      importanceWeight: 1,
      dependencyWeight: 1,
      employabilityWeight: 1,
      description: 'Design reliable APIs',
    },
    classification: {
      skillId: 'skill-1',
      skillName: 'API Design',
      evidenceId: 'evidence-2',
      extractedLevel: 'Advanced',
      confidenceScore: 92,
      evidenceStrength: 'Strong',
      contradictory: false,
    },
    evidence: {
      id: 'evidence-2',
      evidence_type: 'text',
      raw_text: 'Updated evidence',
      source: 'typed_probe',
    },
  });

  assert.equal(signalId, 'signal-existing');
  assert.equal(updatedId, 'signal-existing');
  assert.equal(updatedPayload?.evidence_id, 'evidence-2');
  assert.equal(updatedPayload?.confidence_score, 92);
  assert.equal(updatedPayload?.extracted_level, 'Advanced');
});
