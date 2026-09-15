# CareerVoice Task 2 Pathwisse crosswalk runbook

## Purpose

This runbook defines the evidence required to replace explicit `UNMAPPED` rows in
`career_voice_pathwisse_mappings`. It does not authorize access to, or mutation of,
any Supabase project. Catalog data must be supplied through an approved read-only
export or explicitly authorized connection.

## Current inventory

- 23 published CareerVoice roles
- 110 published role-skill rows
- 106 distinct skill slugs
- Four slugs occur under more than one role: `autocad`, `gd_t`, `python`, and `sql`
- 28 skill names contain `/` or `&` and require compound-skill review

These facts make a global skill-name join unsafe. Every decision must be scoped by
the CareerVoice role and the approved Pathwisse career path.

## Required catalog export

Export only published rows and include the stable identifiers and provenance used
to prove parentage:

1. Career paths: ID, slug, title, role ID, published status, source ID, content version, and checksum.
2. Roadmap skills: ID, career-path ID, slug, title, published status, source ID, content version, and checksum.
3. Skill stages: ID, roadmap-skill ID, slug, title, order index, published status, source ID, content version, and checksum.

Record a SHA-256 digest for the complete export using a documented canonical byte
format. Do not copy service-role keys or other credentials into the repository.

## Candidate generation

1. Resolve and review the CareerVoice role to exactly one published career path.
2. Generate skill candidates only within that approved career path.
3. Normalize with NFKC, lowercase, trimmed whitespace, and collapsed punctuation,
   while preserving semantic tokens such as `C++`, `C#`, `5G`, and `Node.js`.
4. Use these maximum scores:
   - exact slug: `1.00`
   - exact canonical title: `0.98`
   - version-controlled reviewed alias: `0.95`
   - containment or token similarity: at most `0.89`
5. A row may become an approval candidate only when role score is at least `0.90`,
   skill score is at least `0.95`, the top candidate is unique, the runner-up margin
   is at least `0.12`, and the selected skill has at least one published stage.
6. Retain the complete candidate set, or its digest and reproducible scoring inputs,
   so candidate uniqueness can be independently checked.
7. A human reviewer must approve every final row. A high score alone is not approval.

Compound CareerVoice skills remain `UNMAPPED` unless Pathwisse contains an exact
umbrella skill. The current schema cannot truthfully represent one CareerVoice skill
as several Pathwisse skills.

## Review manifest

Use one row per CareerVoice role-skill key with these columns:

`cv_role_id | cv_role_slug | cv_skill_slug | cv_skill_name | pw_career_path_id | pw_career_path_slug | pw_skill_id | pw_skill_slug | pw_skill_title | pw_stage_ids_json | role_score | skill_score | runner_up_score | margin | match_method | catalog_source_id | catalog_content_version | catalog_content_checksum | decision | ambiguity_reason | reviewer | reviewed_at`

The catalog triplet identifies the immutable export snapshot. Path, skill, and stage
provenance remains in that digested snapshot and is verified by hierarchical ID
lookup; it must not be collapsed into an unverifiable row-level assertion.

Allowed decisions are `APPROVED`, `REVIEW`, and `UNMAPPED`. `REVIEW` may retain
candidate evidence in the manifest but must persist to the database as `UNMAPPED`
until approved. Stage IDs must be
published children of the selected skill, unique, nonempty for `APPROVED` rows, and
ordered by `(order_index, id)`.

## Migration safeguards

### Structural preflight

Run `npm run validate:careervoice-crosswalk-structure -- <manifest.json>
<published-inventory.json>` before catalog review. This offline preflight validates
the exact 110-row inventory set, decision-state shape, UUID syntax, score and margin
gates, compound-label handling, reviewer timestamps, and snapshot provenance fields.
It deliberately does not claim that supplied Pathwisse IDs exist or have correct
parentage. A preflight pass is not catalog approval and cannot make Task 2 Done.

Authoritative catalog parentage, published status, stage order, and the snapshot
digest must still be validated against the approved catalog export described above.

Generate the migration with `supabase migration new` after the manifest is reviewed.
The migration must use fixed reviewed values and update rows by the stable composite
key `(role_id, career_voice_skill_slug)`. It must:

- assert set equality with the signed CareerVoice inventory, with exactly 110 rows
  required only for the current rollout snapshot, and no duplicate keys;
- assert every manifest key exists and its role slug and skill name exactly match
  the published CareerVoice inventory;
- validate UUID syntax, path/skill/stage parentage, published status, and catalog checksum/version;
- set `MAPPED` only for `APPROVED` rows and preserve null/empty explicit `UNMAPPED` state otherwise;
- include the manifest digest, catalog digest, scoring version, reviewer, and review time in metadata;
- assert the affected-row count equals the approved-row count; and
- pass `scripts/validate-career-voice-mappings.sql` after application in an isolated/test environment.

Do not deploy the migration to production until independent QA validates the exact
manifest and the migration against the same catalog snapshot.
