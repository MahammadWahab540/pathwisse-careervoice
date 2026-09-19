import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export const CROSSWALK_COLUMNS = [
  'cv_role_id',
  'cv_role_slug',
  'cv_skill_slug',
  'cv_skill_name',
  'pw_career_path_id',
  'pw_career_path_slug',
  'pw_skill_id',
  'pw_skill_slug',
  'pw_skill_title',
  'pw_stage_ids_json',
  'role_score',
  'skill_score',
  'runner_up_score',
  'margin',
  'match_method',
  'catalog_source_id',
  'catalog_content_version',
  'catalog_content_checksum',
  'decision',
  'ambiguity_reason',
  'reviewer',
  'reviewed_at',
] as const;

export type CrosswalkDecision = 'APPROVED' | 'REVIEW' | 'UNMAPPED';

export interface CrosswalkManifestRow {
  cv_role_id: string;
  cv_role_slug: string;
  cv_skill_slug: string;
  cv_skill_name: string;
  pw_career_path_id: string | null;
  pw_career_path_slug: string | null;
  pw_skill_id: string | null;
  pw_skill_slug: string | null;
  pw_skill_title: string | null;
  pw_stage_ids_json: string[];
  role_score: number | null;
  skill_score: number | null;
  runner_up_score: number | null;
  margin: number | null;
  match_method: string | null;
  catalog_source_id: string | null;
  catalog_content_version: string | null;
  catalog_content_checksum: string | null;
  decision: CrosswalkDecision;
  ambiguity_reason: string | null;
  reviewer: string | null;
  reviewed_at: string | null;
}

export interface CrosswalkValidationError {
  code: string;
  message: string;
  row?: number;
}

export interface CrosswalkValidationResult {
  valid: boolean;
  errors: CrosswalkValidationError[];
}

export interface CrosswalkValidationOptions {
  inventory: unknown;
  catalogSnapshot?: unknown;
  trustedCatalogChecksum?: unknown;
}

interface CatalogPath {
  id: string;
  slug: string;
  title: string;
  career_voice_role_id: string;
  published: true;
}

interface CatalogSkill {
  id: string;
  career_path_id: string;
  slug: string;
  title: string;
  published: true;
}

interface CatalogStage {
  id: string;
  skill_id: string;
  slug: string;
  title: string;
  order_index: number;
  published: true;
}

interface ValidatedCatalogSnapshot {
  sourceId: string;
  contentVersion: string;
  contentChecksum: string;
  paths: Map<string, CatalogPath>;
  skills: Map<string, CatalogSkill>;
  stages: Map<string, CatalogStage>;
}

const EXPECTED_ROW_COUNT = 110;
const ALLOWED_DECISIONS = new Set<CrosswalkDecision>(['APPROVED', 'REVIEW', 'UNMAPPED']);
const TARGET_COLUMNS = [
  'pw_career_path_id',
  'pw_career_path_slug',
  'pw_skill_id',
  'pw_skill_slug',
  'pw_skill_title',
] as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const RFC3339_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const MATCH_METHOD_SCORE_CEILINGS: Readonly<Record<string, number>> = {
  exact_slug: 1,
  exact_canonical_title: 0.98,
  reviewed_alias: 0.95,
  exact_umbrella: 1,
  containment: 0.89,
  token_similarity: 0.89,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}

function parseRfc3339(value: unknown): number | null {
  if (!nonemptyString(value)) return null;
  const match = RFC3339_PATTERN.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (
    month < 1 || month > 12 ||
    day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate() ||
    hour > 23 || minute > 59 || second > 59
  ) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function add(
  errors: CrosswalkValidationError[],
  code: string,
  message: string,
  row?: number,
): void {
  errors.push(row === undefined ? { code, message } : { code, message, row });
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function validateCatalogSnapshot(
  input: unknown,
  trustedChecksum: unknown,
  errors: CrosswalkValidationError[],
): ValidatedCatalogSnapshot | null {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, [
      'source_id',
      'content_version',
      'content_checksum',
      'paths',
      'skills',
      'stages',
    ]) ||
    !nonemptyString(input.source_id) ||
    !nonemptyString(input.content_version) ||
    !nonemptyString(input.content_checksum) ||
    !SHA256_PATTERN.test(input.content_checksum) ||
    !Array.isArray(input.paths) ||
    !Array.isArray(input.skills) ||
    !Array.isArray(input.stages)
  ) {
    add(errors, 'INVALID_CATALOG_SNAPSHOT', 'A complete Pathwisse catalog snapshot is required.');
    return null;
  }

  const paths = new Map<string, CatalogPath>();
  const rolePathBindings = new Set<string>();
  const skills = new Map<string, CatalogSkill>();
  const stages = new Map<string, CatalogStage>();
  let structurallyValid = true;

  for (const value of input.paths) {
    if (
      !isRecord(value) ||
      !hasExactKeys(value, ['id', 'slug', 'title', 'career_voice_role_id', 'published']) ||
      !nonemptyString(value.id) || !UUID_PATTERN.test(value.id) ||
      !nonemptyString(value.slug) ||
      !nonemptyString(value.title) ||
      !nonemptyString(value.career_voice_role_id) || !UUID_PATTERN.test(value.career_voice_role_id) ||
      value.published !== true ||
      paths.has(value.id) ||
      rolePathBindings.has(value.career_voice_role_id)
    ) {
      structurallyValid = false;
      continue;
    }
    paths.set(value.id, value as unknown as CatalogPath);
    rolePathBindings.add(value.career_voice_role_id);
  }

  for (const value of input.skills) {
    if (
      !isRecord(value) ||
      !hasExactKeys(value, ['id', 'career_path_id', 'slug', 'title', 'published']) ||
      !nonemptyString(value.id) || !UUID_PATTERN.test(value.id) ||
      !nonemptyString(value.career_path_id) || !UUID_PATTERN.test(value.career_path_id) ||
      !nonemptyString(value.slug) ||
      !nonemptyString(value.title) ||
      value.published !== true ||
      skills.has(value.id)
    ) {
      structurallyValid = false;
      continue;
    }
    skills.set(value.id, value as unknown as CatalogSkill);
  }

  for (const value of input.stages) {
    if (
      !isRecord(value) ||
      !hasExactKeys(value, ['id', 'skill_id', 'slug', 'title', 'order_index', 'published']) ||
      !nonemptyString(value.id) || !UUID_PATTERN.test(value.id) ||
      !nonemptyString(value.skill_id) || !UUID_PATTERN.test(value.skill_id) ||
      !nonemptyString(value.slug) ||
      !nonemptyString(value.title) ||
      !Number.isSafeInteger(value.order_index) || Number(value.order_index) < 0 ||
      value.published !== true ||
      stages.has(value.id)
    ) {
      structurallyValid = false;
      continue;
    }
    stages.set(value.id, value as unknown as CatalogStage);
  }

  if (
    [...skills.values()].some((skill) => !paths.has(skill.career_path_id)) ||
    [...stages.values()].some((stage) => !skills.has(stage.skill_id))
  ) {
    structurallyValid = false;
  }

  if (!structurallyValid) {
    add(
      errors,
      'INVALID_CATALOG_SNAPSHOT',
      'Catalog paths, skills, and stages must have unique UUIDs, published records, and valid parent references.',
    );
    return null;
  }

  const canonicalPayload = {
    source_id: input.source_id,
    content_version: input.content_version,
    paths: input.paths,
    skills: input.skills,
    stages: input.stages,
  };
  const calculatedChecksum = createHash('sha256').update(canonicalJson(canonicalPayload)).digest('hex');
  if (calculatedChecksum !== input.content_checksum.toLowerCase()) {
    add(errors, 'CATALOG_CHECKSUM_MISMATCH', 'Catalog checksum does not match its canonical payload.');
    return null;
  }
  if (
    !nonemptyString(trustedChecksum) ||
    !SHA256_PATTERN.test(trustedChecksum) ||
    calculatedChecksum !== trustedChecksum.toLowerCase()
  ) {
    add(
      errors,
      'UNTRUSTED_CATALOG_SNAPSHOT',
      'Catalog checksum must match an independently approved SHA-256 checksum.',
    );
    return null;
  }

  return {
    sourceId: input.source_id,
    contentVersion: input.content_version,
    contentChecksum: input.content_checksum.toLowerCase(),
    paths,
    skills,
    stages,
  };
}

function validateCandidateAgainstCatalog(
  value: Record<string, unknown>,
  row: number,
  catalog: ValidatedCatalogSnapshot | null,
  errors: CrosswalkValidationError[],
): void {
  if (!catalog) return;

  if (
    value.catalog_source_id !== catalog.sourceId ||
    value.catalog_content_version !== catalog.contentVersion ||
    typeof value.catalog_content_checksum !== 'string' ||
    value.catalog_content_checksum.toLowerCase() !== catalog.contentChecksum
  ) {
    add(errors, 'CATALOG_PROVENANCE_MISMATCH', 'Candidate provenance must exactly match the validated catalog snapshot.', row);
  }

  const path = typeof value.pw_career_path_id === 'string'
    ? catalog.paths.get(value.pw_career_path_id)
    : undefined;
  if (
    !path ||
    path.slug !== value.pw_career_path_slug ||
    path.career_voice_role_id !== value.cv_role_id
  ) {
    add(errors, 'CATALOG_PATH_MISMATCH', 'Candidate path must match the snapshot and reviewed CareerVoice role binding.', row);
  }

  const skill = typeof value.pw_skill_id === 'string'
    ? catalog.skills.get(value.pw_skill_id)
    : undefined;
  if (
    !skill ||
    skill.career_path_id !== value.pw_career_path_id ||
    skill.slug !== value.pw_skill_slug ||
    skill.title !== value.pw_skill_title
  ) {
    add(errors, 'CATALOG_SKILL_MISMATCH', 'Candidate skill must be an exact labeled child of the selected path.', row);
  }

  if (!Array.isArray(value.pw_stage_ids_json)) return;
  const selectedStages = value.pw_stage_ids_json.map((stageId) =>
    typeof stageId === 'string' ? catalog.stages.get(stageId) : undefined,
  );
  const stagesMatch = selectedStages.every(
    (stage) => stage !== undefined && stage.skill_id === value.pw_skill_id,
  );
  const expectedOrder = selectedStages
    .filter((stage): stage is CatalogStage => stage !== undefined)
    .sort((left, right) => left.order_index - right.order_index || left.id.localeCompare(right.id))
    .map((stage) => stage.id);
  if (!stagesMatch || expectedOrder.some((stageId, index) => stageId !== value.pw_stage_ids_json[index])) {
    add(errors, 'CATALOG_STAGE_MISMATCH', 'Candidate stages must be published children ordered by order_index then UUID.', row);
  }
}

export function validateCrosswalkManifest(
  input: unknown,
  options?: CrosswalkValidationOptions,
): CrosswalkValidationResult {
  const errors: CrosswalkValidationError[] = [];
  if (!Array.isArray(input)) {
    add(errors, 'INVALID_MANIFEST', 'Manifest must be a JSON array.');
    return { valid: false, errors };
  }

  if (input.length !== EXPECTED_ROW_COUNT) {
    add(errors, 'ROW_COUNT', `Manifest must contain exactly ${EXPECTED_ROW_COUNT} rows.`);
  }

  const catalog = validateCatalogSnapshot(
    options?.catalogSnapshot,
    options?.trustedCatalogChecksum,
    errors,
  );

  const expectedColumns = new Set<string>(CROSSWALK_COLUMNS);
  const seenKeys = new Map<string, number>();
  const manifestKeys = new Set<string>();
  const approvedCatalogSnapshots = new Set<string>();

  input.forEach((value, row) => {
    if (!isRecord(value)) {
      add(errors, 'INVALID_ROW', 'Manifest row must be an object.', row);
      return;
    }

    for (const column of CROSSWALK_COLUMNS) {
      if (!Object.hasOwn(value, column)) {
        add(errors, 'MISSING_COLUMN', `Missing required column ${column}.`, row);
      }
    }
    for (const column of Object.keys(value)) {
      if (!expectedColumns.has(column)) {
        add(errors, 'UNKNOWN_COLUMN', `Unknown column ${column}.`, row);
      }
    }


    const identityValid =
      nonemptyString(value.cv_role_id) && UUID_PATTERN.test(value.cv_role_id) &&
      nonemptyString(value.cv_role_slug) &&
      nonemptyString(value.cv_skill_slug) &&
      nonemptyString(value.cv_skill_name) &&
      Array.isArray(value.pw_stage_ids_json);
    if (!identityValid) {
      add(errors, 'INVALID_FIELD', 'CareerVoice identity fields and pw_stage_ids_json have invalid values.', row);
    }

    if (nonemptyString(value.cv_role_id) && nonemptyString(value.cv_skill_slug)) {
      const key = `${value.cv_role_id}\u0000${value.cv_skill_slug}`;
      manifestKeys.add(key);
      const firstRow = seenKeys.get(key);
      if (firstRow !== undefined) {
        add(errors, 'DUPLICATE_CV_KEY', `Duplicate CareerVoice key first appears at row ${firstRow}.`, row);
      } else {
        seenKeys.set(key, row);
      }
    }

    if (!ALLOWED_DECISIONS.has(value.decision as CrosswalkDecision)) {
      add(errors, 'INVALID_DECISION', 'Decision must be APPROVED, REVIEW, or UNMAPPED.', row);
      return;
    }

    if (value.decision === 'UNMAPPED') {
      const populatedTarget = TARGET_COLUMNS.some((column) => value[column] !== null);
      const stagesAreEmpty = Array.isArray(value.pw_stage_ids_json) && value.pw_stage_ids_json.length === 0;
      if (populatedTarget || !stagesAreEmpty) {
        add(errors, 'UNMAPPED_TARGET', 'UNMAPPED rows must have null Pathwisse targets and no stage IDs.', row);
      }
      return;
    }

    if (value.decision === 'REVIEW') {
      const hasCandidateEvidence =
        TARGET_COLUMNS.some((column) => value[column] !== null) ||
        (Array.isArray(value.pw_stage_ids_json) && value.pw_stage_ids_json.length > 0) ||
        [
          value.role_score,
          value.skill_score,
          value.runner_up_score,
          value.margin,
          value.match_method,
          value.catalog_source_id,
          value.catalog_content_version,
          value.catalog_content_checksum,
        ].some((candidate) => candidate !== null);
      if (!hasCandidateEvidence) return;

      const candidateScores = [value.role_score, value.skill_score, value.runner_up_score, value.margin];
      const candidateIsComplete =
        TARGET_COLUMNS.every((column) => nonemptyString(value[column])) &&
        Array.isArray(value.pw_stage_ids_json) && value.pw_stage_ids_json.length > 0 &&
        candidateScores.every((score) => typeof score === 'number' && score >= 0 && score <= 1) &&
        nonemptyString(value.ambiguity_reason);
      if (!candidateIsComplete) {
        add(errors, 'INVALID_REVIEW_CANDIDATE', 'REVIEW candidate evidence must be complete and use bounded scores.', row);
      }
      if (
        typeof value.skill_score === 'number' &&
        typeof value.runner_up_score === 'number' &&
        value.skill_score <= value.runner_up_score
      ) {
        add(errors, 'REVIEW_TOP_CANDIDATE_INVALID', 'REVIEW selected candidate must score above its runner-up.', row);
      }
      if (
        typeof value.margin === 'number' &&
        typeof value.skill_score === 'number' &&
        typeof value.runner_up_score === 'number' &&
        Math.abs(value.margin - (value.skill_score - value.runner_up_score)) > 1e-9
      ) {
        add(errors, 'MARGIN_MISMATCH', 'Margin must equal skill_score minus runner_up_score.', row);
      }

      if (
        !nonemptyString(value.pw_career_path_id) || !UUID_PATTERN.test(value.pw_career_path_id) ||
        !nonemptyString(value.pw_skill_id) || !UUID_PATTERN.test(value.pw_skill_id) ||
        !Array.isArray(value.pw_stage_ids_json) ||
        value.pw_stage_ids_json.some((stage) => !nonemptyString(stage) || !UUID_PATTERN.test(stage))
      ) {
        add(errors, 'INVALID_UUID', 'REVIEW candidate path, skill, and stage IDs must be UUIDs.', row);
      }
      if (
        Array.isArray(value.pw_stage_ids_json) &&
        new Set(value.pw_stage_ids_json).size !== value.pw_stage_ids_json.length
      ) {
        add(errors, 'DUPLICATE_STAGE_ID', 'REVIEW candidate stage IDs must be unique.', row);
      }

      if (!nonemptyString(value.match_method) || MATCH_METHOD_SCORE_CEILINGS[value.match_method] === undefined) {
        add(errors, 'INVALID_MATCH_METHOD', 'REVIEW candidate match method is not recognized.', row);
      } else if (
        typeof value.skill_score === 'number' &&
        value.skill_score > MATCH_METHOD_SCORE_CEILINGS[value.match_method]
      ) {
        add(errors, 'MATCH_METHOD_SCORE_CEILING', 'REVIEW candidate score exceeds its match-method ceiling.', row);
      }

      if (
        !nonemptyString(value.catalog_source_id) ||
        !nonemptyString(value.catalog_content_version) ||
        !nonemptyString(value.catalog_content_checksum) ||
        !SHA256_PATTERN.test(value.catalog_content_checksum)
      ) {
        add(errors, 'INVALID_PROVENANCE', 'REVIEW candidate requires catalog source, version, and SHA-256 checksum.', row);
      }
      validateCandidateAgainstCatalog(value, row, catalog, errors);
      return;
    }

    if (value.decision !== 'APPROVED') return;

    if (
      !nonemptyString(value.pw_career_path_slug) ||
      !nonemptyString(value.pw_skill_slug) ||
      !nonemptyString(value.pw_skill_title) ||
      !nonemptyString(value.match_method)
    ) {
      add(errors, 'MISSING_APPROVED_TARGET', 'APPROVED rows require nonempty target labels and match method.', row);
    }

    if (nonemptyString(value.match_method)) {
      const scoreCeiling = MATCH_METHOD_SCORE_CEILINGS[value.match_method];
      if (scoreCeiling === undefined) {
        add(errors, 'INVALID_MATCH_METHOD', 'APPROVED match method is not recognized.', row);
      } else if (typeof value.skill_score === 'number' && value.skill_score > scoreCeiling) {
        add(errors, 'MATCH_METHOD_SCORE_CEILING', 'Skill score exceeds the runbook ceiling for its match method.', row);
      }
    }

    const uuidTargets = [value.pw_career_path_id, value.pw_skill_id];
    for (const target of uuidTargets) {
      if (!nonemptyString(target) || !UUID_PATTERN.test(target)) {
        add(errors, 'INVALID_UUID', 'APPROVED path and skill IDs must be UUIDs.', row);
        break;
      }
    }

    if (!Array.isArray(value.pw_stage_ids_json) || value.pw_stage_ids_json.length === 0) {
      add(errors, 'MISSING_STAGE_IDS', 'APPROVED rows require at least one stage ID.', row);
    } else {
      const stages = value.pw_stage_ids_json;
      if (stages.some((stage) => !nonemptyString(stage) || !UUID_PATTERN.test(stage))) {
        add(errors, 'INVALID_UUID', 'Every APPROVED stage ID must be a UUID.', row);
      }
      if (new Set(stages).size !== stages.length) {
        add(errors, 'DUPLICATE_STAGE_ID', 'APPROVED stage IDs must be unique.', row);
      }
    }

    if (!nonemptyString(value.reviewer)) {
      add(errors, 'MISSING_REVIEWER', 'APPROVED rows require a human reviewer.', row);
    }
    const reviewedAt = parseRfc3339(value.reviewed_at);
    if (reviewedAt === null || reviewedAt > Date.now()) {
      add(errors, 'INVALID_REVIEWED_AT', 'APPROVED rows require a valid review timestamp.', row);
    }

    const provenanceValid =
      nonemptyString(value.catalog_source_id) &&
      nonemptyString(value.catalog_content_version) &&
      nonemptyString(value.catalog_content_checksum) &&
      SHA256_PATTERN.test(value.catalog_content_checksum);
    if (!provenanceValid) {
      add(errors, 'INVALID_PROVENANCE', 'APPROVED rows require catalog source, version, and SHA-256 checksum.', row);
    } else {
      approvedCatalogSnapshots.add(
        `${value.catalog_source_id}\u0000${value.catalog_content_version}\u0000${value.catalog_content_checksum}`,
      );
    }

    const scoresValid =
      typeof value.role_score === 'number' && value.role_score >= 0.9 && value.role_score <= 1 &&
      typeof value.skill_score === 'number' && value.skill_score >= 0.95 && value.skill_score <= 1 &&
      typeof value.runner_up_score === 'number' && value.runner_up_score >= 0 && value.runner_up_score <= 1 &&
      typeof value.margin === 'number' && value.margin >= 0.12 && value.margin <= 1 &&
      value.skill_score > value.runner_up_score;
    if (!scoresValid) {
      add(errors, 'APPROVAL_SCORE_GATE', 'APPROVED rows must satisfy all runbook score and margin gates.', row);
    } else if (
      typeof value.margin === 'number' &&
      typeof value.skill_score === 'number' &&
      typeof value.runner_up_score === 'number' &&
      Math.abs(value.margin - (value.skill_score - value.runner_up_score)) > 1e-9
    ) {
      add(errors, 'MARGIN_MISMATCH', 'Margin must equal skill_score minus runner_up_score.', row);
    }

    if (/[/&]/.test(String(value.cv_skill_name)) && value.match_method !== 'exact_umbrella') {
      add(errors, 'COMPOUND_NOT_UMBRELLA', 'Compound labels may only be APPROVED with match_method exact_umbrella.', row);
    }
    validateCandidateAgainstCatalog(value, row, catalog, errors);
  });

  if (approvedCatalogSnapshots.size > 1) {
    add(errors, 'MIXED_CATALOG_SNAPSHOT', 'All APPROVED rows must reference the same catalog snapshot.');
  }

  if (!options || !Array.isArray(options.inventory)) {
    add(errors, 'INVALID_INVENTORY', 'A published CareerVoice inventory array is required.');
  } else {
    const inventoryKeys = new Set<string>();
    const inventoryByKey = new Map<string, { cv_role_slug: string; cv_skill_name: string }>();
    let inventoryIsValid = options.inventory.length === EXPECTED_ROW_COUNT;
    for (const item of options.inventory) {
      if (
        !isRecord(item) ||
        !nonemptyString(item.cv_role_id) ||
        !UUID_PATTERN.test(item.cv_role_id) ||
        !nonemptyString(item.cv_role_slug) ||
        !nonemptyString(item.cv_skill_slug) ||
        !nonemptyString(item.cv_skill_name)
      ) {
        inventoryIsValid = false;
        continue;
      }
      const key = `${item.cv_role_id}\u0000${item.cv_skill_slug}`;
      if (inventoryKeys.has(key)) inventoryIsValid = false;
      inventoryKeys.add(key);
      inventoryByKey.set(key, {
        cv_role_slug: item.cv_role_slug,
        cv_skill_name: item.cv_skill_name,
      });
    }
    if (!inventoryIsValid || inventoryKeys.size !== EXPECTED_ROW_COUNT) {
      add(errors, 'INVALID_INVENTORY', `Published inventory must contain ${EXPECTED_ROW_COUNT} unique keys.`);
    }
    for (const key of manifestKeys) {
      if (!inventoryKeys.has(key)) add(errors, 'KEY_NOT_IN_INVENTORY', 'Manifest key is absent from published inventory.');
    }
    for (const key of inventoryKeys) {
      if (!manifestKeys.has(key)) add(errors, 'INVENTORY_KEY_MISSING', 'Published inventory key is absent from manifest.');
    }
    input.forEach((value, row) => {
      if (!isRecord(value) || !nonemptyString(value.cv_role_id) || !nonemptyString(value.cv_skill_slug)) return;
      const expected = inventoryByKey.get(`${value.cv_role_id}\u0000${value.cv_skill_slug}`);
      if (
        expected &&
        (value.cv_role_slug !== expected.cv_role_slug || value.cv_skill_name !== expected.cv_skill_name)
      ) {
        add(
          errors,
          'INVENTORY_VALUE_MISMATCH',
          'Manifest role slug and skill name must exactly match the published inventory.',
          row,
        );
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

async function runCli(): Promise<void> {
  const manifestPath = process.argv[2];
  const inventoryPath = process.argv[3];
  const catalogSnapshotPath = process.argv[4];
  const trustedCatalogChecksum = process.argv[5];
  if (!manifestPath || !inventoryPath || !catalogSnapshotPath || !trustedCatalogChecksum) {
    console.error(
      'Usage: npm run validate:careervoice-crosswalk-structure -- ' +
      '<manifest.json> <published-inventory.json> <catalog-snapshot.json> <trusted-catalog-sha256>',
    );
    process.exitCode = 2;
    return;
  }

  try {
    const [manifest, inventory, catalogSnapshot] = await Promise.all([
      readFile(manifestPath, 'utf8').then((contents) => JSON.parse(contents) as unknown),
      readFile(inventoryPath, 'utf8').then((contents) => JSON.parse(contents) as unknown),
      readFile(catalogSnapshotPath, 'utf8').then((contents) => JSON.parse(contents) as unknown),
    ]);
    const result = validateCrosswalkManifest(manifest, {
      inventory,
      catalogSnapshot,
      trustedCatalogChecksum,
    });
    if (result.valid) {
      console.log(
        `Valid CareerVoice crosswalk manifest (${EXPECTED_ROW_COUNT} rows) with catalog digest and hierarchy checks. ` +
        'Independent approval of the snapshot and semantic crosswalk is still required.',
      );
      return;
    }
    for (const error of result.errors) {
      console.error(`${error.code}${error.row === undefined ? '' : ` row ${error.row}`}: ${error.message}`);
    }
    process.exitCode = 1;
  } catch (error) {
    console.error(`Unable to validate manifest: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
