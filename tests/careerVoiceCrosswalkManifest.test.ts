import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  CROSSWALK_COLUMNS,
  validateCrosswalkManifest,
  type CrosswalkManifestRow,
} from '../scripts/validate-career-voice-crosswalk';

const uuid = (value: number) => `00000000-0000-4000-8000-${value.toString().padStart(12, '0')}`;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const catalogPayload = {
  source_id: 'pathwisse-production-export',
  content_version: '2026-09-15',
  paths: [{
    id: uuid(501),
    slug: 'approved-path',
    title: 'Approved Path',
    career_voice_role_id: uuid(1),
    published: true,
  }],
  skills: [{
    id: uuid(502),
    career_path_id: uuid(501),
    slug: 'approved-skill',
    title: 'Approved Skill',
    published: true,
  }],
  stages: [
    { id: uuid(504), skill_id: uuid(502), slug: 'advanced', title: 'Advanced', order_index: 2, published: true },
    { id: uuid(503), skill_id: uuid(502), slug: 'foundation', title: 'Foundation', order_index: 1, published: true },
  ],
};
const catalogChecksum = createHash('sha256').update(canonicalJson(catalogPayload)).digest('hex');

function catalogSnapshot(overrides: Record<string, unknown> = {}) {
  return { ...structuredClone(catalogPayload), content_checksum: catalogChecksum, ...overrides };
}

function unmappedRow(index: number): CrosswalkManifestRow {
  return {
    cv_role_id: uuid(index + 1),
    cv_role_slug: `role-${index}`,
    cv_skill_slug: `skill-${index}`,
    cv_skill_name: `Skill ${index}`,
    pw_career_path_id: null,
    pw_career_path_slug: null,
    pw_skill_id: null,
    pw_skill_slug: null,
    pw_skill_title: null,
    pw_stage_ids_json: [],
    role_score: null,
    skill_score: null,
    runner_up_score: null,
    margin: null,
    match_method: null,
    catalog_source_id: null,
    catalog_content_version: null,
    catalog_content_checksum: null,
    decision: 'UNMAPPED',
    ambiguity_reason: 'No approved catalog target',
    reviewer: null,
    reviewed_at: null,
  };
}

function validManifest(): CrosswalkManifestRow[] {
  return Array.from({ length: 110 }, (_, index) => unmappedRow(index));
}

function inventory(rows: CrosswalkManifestRow[] = validManifest()) {
  return rows.map(({ cv_role_id, cv_role_slug, cv_skill_slug, cv_skill_name }) => ({
    cv_role_id,
    cv_role_slug,
    cv_skill_slug,
    cv_skill_name,
  }));
}

function approvedRow(index = 0): CrosswalkManifestRow {
  return {
    ...unmappedRow(index),
    pw_career_path_id: uuid(501),
    pw_career_path_slug: 'approved-path',
    pw_skill_id: uuid(502),
    pw_skill_slug: 'approved-skill',
    pw_skill_title: 'Approved Skill',
    pw_stage_ids_json: [uuid(503), uuid(504)],
    role_score: 0.98,
    skill_score: 0.95,
    runner_up_score: 0.8,
    margin: 0.15,
    match_method: 'exact_canonical_title',
    catalog_source_id: 'pathwisse-production-export',
    catalog_content_version: '2026-09-15',
    catalog_content_checksum: catalogChecksum,
    decision: 'APPROVED',
    ambiguity_reason: null,
    reviewer: 'reviewer@example.com',
    reviewed_at: '2026-09-15T07:17:00.000Z',
  };
}

function errorCodes(rows: unknown): string[] {
  return validateCrosswalkManifest(rows, {
    inventory: inventory(),
    catalogSnapshot: catalogSnapshot(),
    trustedCatalogChecksum: catalogChecksum,
  }).errors.map((error) => error.code);
}

test('accepts a complete 110-row manifest with explicit UNMAPPED rows', () => {
  const rows = validManifest();
  assert.deepEqual(validateCrosswalkManifest(rows, {
    inventory: inventory(rows), catalogSnapshot: catalogSnapshot(), trustedCatalogChecksum: catalogChecksum,
  }), { valid: true, errors: [] });
});

test('requires exactly the documented columns and exactly 110 rows', () => {
  const short = validManifest().slice(0, 109);
  delete (short[0] as unknown as Record<string, unknown>)[CROSSWALK_COLUMNS[0]];
  (short[1] as unknown as Record<string, unknown>).unexpected = true;

  const codes = errorCodes(short);
  assert.ok(codes.includes('ROW_COUNT'));
  assert.ok(codes.includes('MISSING_COLUMN'));
  assert.ok(codes.includes('UNKNOWN_COLUMN'));
});

test('rejects malformed CareerVoice identity and stage fields', () => {
  const rows = validManifest();
  rows[0].cv_role_id = 'not-a-uuid';
  rows[1].cv_skill_name = '';
  (rows[2] as unknown as Record<string, unknown>).pw_stage_ids_json = '[]';

  assert.ok(errorCodes(rows).includes('INVALID_FIELD'));
});

test('rejects duplicate CareerVoice role-skill composite keys', () => {
  const rows = validManifest();
  rows[1].cv_role_id = rows[0].cv_role_id;
  rows[1].cv_skill_slug = rows[0].cv_skill_slug;

  assert.ok(errorCodes(rows).includes('DUPLICATE_CV_KEY'));
});

test('allows only APPROVED, REVIEW, and UNMAPPED decisions', () => {
  const rows = validManifest();
  (rows[0] as unknown as Record<string, unknown>).decision = 'MAPPED';

  assert.ok(errorCodes(rows).includes('INVALID_DECISION'));
});

test('requires APPROVED targets to use UUIDs, nonempty unique stages, reviewer, and catalog provenance', () => {
  const rows = validManifest();
  rows[0] = {
    ...approvedRow(),
    pw_skill_id: 'invented-id',
    pw_stage_ids_json: [uuid(503), uuid(503)],
    reviewer: ' ',
    catalog_content_checksum: 'not-a-sha256',
  };

  const codes = errorCodes(rows);
  assert.ok(codes.includes('INVALID_UUID'));
  assert.ok(codes.includes('DUPLICATE_STAGE_ID'));
  assert.ok(codes.includes('MISSING_REVIEWER'));
  assert.ok(codes.includes('INVALID_PROVENANCE'));
});

test('accepts an APPROVED row with reviewed target UUIDs, stages, reviewer, and provenance', () => {
  const rows = validManifest();
  rows[0] = approvedRow();

  assert.deepEqual(validateCrosswalkManifest(rows, {
    inventory: inventory(rows), catalogSnapshot: catalogSnapshot(), trustedCatalogChecksum: catalogChecksum,
  }), { valid: true, errors: [] });
});

test('enforces the runbook approval score gates and a valid review timestamp', () => {
  const rows = validManifest();
  rows[0] = {
    ...approvedRow(),
    role_score: 0.89,
    skill_score: 0.94,
    runner_up_score: 0.9,
    margin: 0.04,
    reviewed_at: 'yesterday',
  };

  const codes = errorCodes(rows);
  assert.ok(codes.includes('APPROVAL_SCORE_GATE'));
  assert.ok(codes.includes('INVALID_REVIEWED_AT'));
});

test('recomputes the approval margin instead of trusting the manifest value', () => {
  const rows = validManifest();
  rows[0] = { ...approvedRow(), margin: 0.12 };

  assert.ok(errorCodes(rows).includes('MARGIN_MISMATCH'));
});

test('requires nonempty APPROVED target labels and match method', () => {
  const rows = validManifest();
  rows[0] = { ...approvedRow(), pw_skill_slug: '', match_method: null };

  assert.ok(errorCodes(rows).includes('MISSING_APPROVED_TARGET'));
});

test('requires APPROVED stages to be nonempty UUID arrays', () => {
  const rows = validManifest();
  rows[0] = { ...approvedRow(), pw_stage_ids_json: [] };
  rows[1] = { ...approvedRow(1), pw_stage_ids_json: ['stage-one'] };

  const codes = errorCodes(rows);
  assert.ok(codes.includes('MISSING_STAGE_IDS'));
  assert.ok(codes.includes('INVALID_UUID'));
});

test('requires every UNMAPPED row to keep all Pathwisse targets null and stages empty', () => {
  const rows = validManifest();
  rows[0].pw_skill_id = uuid(800);
  rows[0].pw_stage_ids_json = [uuid(801)];

  assert.ok(errorCodes(rows).includes('UNMAPPED_TARGET'));
});

test('does not approve compound CareerVoice labels without the exact umbrella method', () => {
  const rows = validManifest();
  rows[0] = { ...approvedRow(), cv_skill_name: 'React / TypeScript' };
  rows[1] = {
    ...approvedRow(1),
    cv_skill_name: 'Safety & Compliance',
    match_method: 'exact_umbrella',
  };

  const result = validateCrosswalkManifest(rows, {
    inventory: inventory(rows), catalogSnapshot: catalogSnapshot(), trustedCatalogChecksum: catalogChecksum,
  });
  assert.equal(result.errors.filter((error) => error.code === 'COMPOUND_NOT_UMBRELLA').length, 1);
  assert.equal(result.errors.find((error) => error.code === 'COMPOUND_NOT_UMBRELLA')?.row, 0);
});

test('requires exact manifest key equality with the supplied published inventory', () => {
  const rows = validManifest();
  const publishedInventory = inventory(rows);
  publishedInventory[0] = {
    ...publishedInventory[0],
    cv_role_id: uuid(999),
    cv_skill_slug: 'different-skill',
  };

  const codes = validateCrosswalkManifest(rows, {
    inventory: publishedInventory, catalogSnapshot: catalogSnapshot(), trustedCatalogChecksum: catalogChecksum,
  }).errors.map((error) => error.code);
  assert.ok(codes.includes('KEY_NOT_IN_INVENTORY'));
  assert.ok(codes.includes('INVENTORY_KEY_MISSING'));
});

test('rejects manifest role slugs and skill names that drift from the published inventory', () => {
  const rows = validManifest();
  const publishedInventory = inventory(rows);
  rows[0].cv_role_slug = 'different-role';
  rows[1].cv_skill_name = 'Different skill name';

  const errors = validateCrosswalkManifest(rows, {
    inventory: publishedInventory, catalogSnapshot: catalogSnapshot(), trustedCatalogChecksum: catalogChecksum,
  }).errors;
  assert.equal(errors.filter((error) => error.code === 'INVENTORY_VALUE_MISMATCH').length, 2);
});

test('requires an RFC3339 review timestamp that is not in the future', () => {
  const rows = validManifest();
  rows[0] = { ...approvedRow(), reviewed_at: '09/15/2026 07:17' };
  rows[1] = { ...approvedRow(1), reviewed_at: '2999-01-01T00:00:00Z' };
  rows[2] = { ...approvedRow(2), reviewed_at: '2026-02-30T00:00:00Z' };

  const errors = validateCrosswalkManifest(rows, {
    inventory: inventory(rows), catalogSnapshot: catalogSnapshot(), trustedCatalogChecksum: catalogChecksum,
  }).errors;
  assert.equal(errors.filter((error) => error.code === 'INVALID_REVIEWED_AT').length, 3);
});

test('rejects unsupported match methods and enforces their score ceilings', () => {
  const rows = validManifest();
  rows[0] = { ...approvedRow(), match_method: 'containment' };
  rows[1] = { ...approvedRow(1), match_method: 'invented_method' };

  const errors = validateCrosswalkManifest(rows, {
    inventory: inventory(rows), catalogSnapshot: catalogSnapshot(), trustedCatalogChecksum: catalogChecksum,
  }).errors;
  assert.ok(errors.some((error) => error.code === 'MATCH_METHOD_SCORE_CEILING' && error.row === 0));
  assert.ok(errors.some((error) => error.code === 'INVALID_MATCH_METHOD' && error.row === 1));
});

test('validates retained REVIEW candidate evidence without requiring approval', () => {
  const rows = validManifest();
  rows[0] = {
    ...approvedRow(),
    decision: 'REVIEW',
    pw_skill_id: 'not-a-uuid',
    pw_stage_ids_json: [uuid(503), uuid(503)],
    skill_score: 99,
    match_method: 'invented_method',
    catalog_content_checksum: 'not-a-sha256',
    reviewer: null,
    reviewed_at: null,
  };

  const codes = validateCrosswalkManifest(rows, {
    inventory: inventory(rows), catalogSnapshot: catalogSnapshot(), trustedCatalogChecksum: catalogChecksum,
  }).errors.map((error) => error.code);
  assert.ok(codes.includes('INVALID_REVIEW_CANDIDATE'));
  assert.ok(codes.includes('INVALID_UUID'));
  assert.ok(codes.includes('DUPLICATE_STAGE_ID'));
  assert.ok(codes.includes('INVALID_MATCH_METHOD'));
  assert.ok(codes.includes('INVALID_PROVENANCE'));
});

test('validates REVIEW candidate provenance and hierarchy against the trusted catalog', () => {
  const rows = validManifest();
  rows[0] = {
    ...approvedRow(),
    decision: 'REVIEW',
    ambiguity_reason: 'Candidate requires semantic review',
    reviewer: null,
    reviewed_at: null,
    catalog_content_version: 'drifted-version',
    pw_stage_ids_json: [uuid(504), uuid(503)],
  };

  const codes = validateCrosswalkManifest(rows, {
    inventory: inventory(rows),
    catalogSnapshot: catalogSnapshot(),
    trustedCatalogChecksum: catalogChecksum,
  }).errors.map((error) => error.code);

  assert.ok(codes.includes('CATALOG_PROVENANCE_MISMATCH'));
  assert.ok(codes.includes('CATALOG_STAGE_MISMATCH'));
});

test('requires APPROVED rows to reference one catalog snapshot', () => {
  const rows = validManifest();
  rows[0] = approvedRow();
  rows[1] = {
    ...approvedRow(1),
    catalog_content_checksum: 'b'.repeat(64),
  };

  assert.ok(
    validateCrosswalkManifest(rows, {
      inventory: inventory(rows), catalogSnapshot: catalogSnapshot(), trustedCatalogChecksum: catalogChecksum,
    }).errors
      .some((error) => error.code === 'MIXED_CATALOG_SNAPSHOT'),
  );
});

test('requires REVIEW candidate scores and margins to remain internally consistent', () => {
  const rows = validManifest();
  rows[0] = {
    ...approvedRow(),
    decision: 'REVIEW',
    skill_score: 0.6,
    runner_up_score: 0.7,
    margin: 0.9,
    match_method: 'token_similarity',
    ambiguity_reason: 'Runner-up exceeds selected candidate',
    reviewer: null,
    reviewed_at: null,
  };

  const codes = validateCrosswalkManifest(rows, {
    inventory: inventory(rows), catalogSnapshot: catalogSnapshot(), trustedCatalogChecksum: catalogChecksum,
  }).errors.map((error) => error.code);
  assert.ok(codes.includes('MARGIN_MISMATCH'));
  assert.ok(codes.includes('REVIEW_TOP_CANDIDATE_INVALID'));
});

test('fails closed when the authoritative catalog snapshot is absent', () => {
  const rows = validManifest();

  const codes = validateCrosswalkManifest(rows, { inventory: inventory(rows) }).errors.map((error) => error.code);

  assert.ok(codes.includes('INVALID_CATALOG_SNAPSHOT'));
});

test('rejects a malformed catalog snapshot and duplicate catalog IDs', () => {
  const rows = validManifest();
  const malformed = catalogSnapshot({
    paths: [
      ...catalogPayload.paths,
      { ...catalogPayload.paths[0], career_voice_role_id: 'not-a-uuid' },
    ],
  });

  const codes = validateCrosswalkManifest(rows, {
    inventory: inventory(rows),
    catalogSnapshot: malformed,
    trustedCatalogChecksum: catalogChecksum,
  }).errors.map((error) => error.code);

  assert.ok(codes.includes('INVALID_CATALOG_SNAPSHOT'));
});

test('rejects catalog fields outside the canonical digested schema', () => {
  const rows = validManifest();
  const snapshot = { ...catalogSnapshot(), unsigned_note: 'outside the digest' };

  const codes = validateCrosswalkManifest(rows, {
    inventory: inventory(rows),
    catalogSnapshot: snapshot,
    trustedCatalogChecksum: catalogChecksum,
  }).errors.map((error) => error.code);

  assert.ok(codes.includes('INVALID_CATALOG_SNAPSHOT'));
});

test('requires each CareerVoice role binding to resolve to exactly one catalog path', () => {
  const rows = validManifest();
  const duplicateRolePayload = {
    ...structuredClone(catalogPayload),
    paths: [
      ...structuredClone(catalogPayload.paths),
      {
        id: uuid(505),
        slug: 'second-path',
        title: 'Second Path',
        career_voice_role_id: uuid(1),
        published: true,
      },
    ],
  };
  const checksum = createHash('sha256').update(canonicalJson(duplicateRolePayload)).digest('hex');

  const codes = validateCrosswalkManifest(rows, {
    inventory: inventory(rows),
    catalogSnapshot: { ...duplicateRolePayload, content_checksum: checksum },
    trustedCatalogChecksum: checksum,
  }).errors.map((error) => error.code);

  assert.ok(codes.includes('INVALID_CATALOG_SNAPSHOT'));
});

test('recomputes the declared snapshot SHA-256 from the canonical payload', () => {
  const rows = validManifest();
  const tampered = catalogSnapshot();
  tampered.skills[0].title = 'Tampered after export';

  const errors = validateCrosswalkManifest(rows, {
    inventory: inventory(rows),
    catalogSnapshot: tampered,
    trustedCatalogChecksum: catalogChecksum,
  }).errors;

  assert.ok(errors.some((error) => error.code === 'CATALOG_CHECKSUM_MISMATCH'));
});

test('requires APPROVED provenance to exactly match the validated snapshot', () => {
  const rows = validManifest();
  rows[0] = { ...approvedRow(), catalog_content_version: 'other-version' };

  const errors = validateCrosswalkManifest(rows, {
    inventory: inventory(rows),
    catalogSnapshot: catalogSnapshot(),
    trustedCatalogChecksum: catalogChecksum,
  }).errors;

  assert.ok(errors.some((error) => error.code === 'CATALOG_PROVENANCE_MISMATCH' && error.row === 0));
});

test('requires the APPROVED path to exist with its exact slug and reviewed CareerVoice role', () => {
  const rows = validManifest();
  rows[0] = { ...approvedRow(), pw_career_path_slug: 'drifted-path-label' };
  const wrongRoleSnapshot = catalogSnapshot();
  wrongRoleSnapshot.paths[0].career_voice_role_id = uuid(99);
  const wrongRolePayload = { ...wrongRoleSnapshot };
  delete (wrongRolePayload as Partial<typeof wrongRoleSnapshot>).content_checksum;
  wrongRoleSnapshot.content_checksum = createHash('sha256').update(canonicalJson(wrongRolePayload)).digest('hex');
  rows[0].catalog_content_checksum = wrongRoleSnapshot.content_checksum;

  const errors = validateCrosswalkManifest(rows, {
    inventory: inventory(rows),
    catalogSnapshot: wrongRoleSnapshot,
    trustedCatalogChecksum: wrongRoleSnapshot.content_checksum,
  }).errors;

  assert.ok(errors.some((error) => error.code === 'CATALOG_PATH_MISMATCH' && error.row === 0));
});

test('requires the APPROVED skill to be an exact labeled child of its path', () => {
  const rows = validManifest();
  rows[0] = { ...approvedRow(), pw_skill_title: 'Drifted title' };

  const errors = validateCrosswalkManifest(rows, {
    inventory: inventory(rows),
    catalogSnapshot: catalogSnapshot(),
    trustedCatalogChecksum: catalogChecksum,
  }).errors;

  assert.ok(errors.some((error) => error.code === 'CATALOG_SKILL_MISMATCH' && error.row === 0));
});

test('requires selected published child stages in order_index then UUID order', () => {
  const rows = validManifest();
  rows[0] = { ...approvedRow(), pw_stage_ids_json: [uuid(504), uuid(503)] };

  const errors = validateCrosswalkManifest(rows, {
    inventory: inventory(rows),
    catalogSnapshot: catalogSnapshot(),
    trustedCatalogChecksum: catalogChecksum,
  }).errors;

  assert.ok(errors.some((error) => error.code === 'CATALOG_STAGE_MISMATCH' && error.row === 0));
});

test('rejects a self-consistent snapshot that does not match the externally trusted checksum', () => {
  const rows = validManifest();
  const forgedSnapshot = catalogSnapshot();
  forgedSnapshot.skills[0].title = 'Forged approved title';
  const forgedPayload = { ...forgedSnapshot };
  delete (forgedPayload as Partial<typeof forgedSnapshot>).content_checksum;
  forgedSnapshot.content_checksum = createHash('sha256').update(canonicalJson(forgedPayload)).digest('hex');
  rows[0] = {
    ...approvedRow(),
    pw_skill_title: 'Forged approved title',
    catalog_content_checksum: forgedSnapshot.content_checksum,
  };

  const errors = validateCrosswalkManifest(rows, {
    inventory: inventory(rows),
    catalogSnapshot: forgedSnapshot,
    trustedCatalogChecksum: catalogChecksum,
  }).errors;

  assert.ok(errors.some((error) => error.code === 'UNTRUSTED_CATALOG_SNAPSHOT'));
});
