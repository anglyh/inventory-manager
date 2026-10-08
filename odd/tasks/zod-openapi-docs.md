# Feature: zod-openapi-docs

Locator: `odd/tasks/zod-openapi-docs.md` · Branch: `feat/zod-openapi-docs` · Base: `main` (7558e57)

## Objective

Generate the OpenAPI spec from the Zod schemas so validation and documentation share a single
source of truth, and the frontend can generate reliable types from `/api-docs.json`.

## Problem / Why

Swagger is hand-written (JSDoc in routes + `src/config/swagger-schemas.ts` +
`src/config/swagger-inventory.ts`) and is not connected to the Zod schemas that validate requests.
They already drift (e.g. `notes` max 500 and `quantity` max are not documented). Response shapes
exist only in Swagger, not in Zod.

## Scope

- In: request schemas (body/params/query) and response schemas for every documented endpoint,
  OpenAPI generation with `@asteasolutions/zod-to-openapi` v9 (peer `zod ^4`), removal of
  `swagger-jsdoc` and hand-written Swagger, a test guarding the generated spec.
- Out: changing endpoint behavior or validation rules, frontend changes, response validation at runtime.

## Constraints

- Keep `/api-docs` (UI) and `/api-docs.json` working at the end of every task; non-production only.
- Keep exported `swaggerSpec` name (used by route tests) until cleanup decides otherwise.
- Response schemas live next to request schemas in `src/schemas/*.schema.ts`.
- Money values are strings in responses (Postgres NUMERIC).
- Delivery strategy: `ask-on-risk`. Forecast ~1000-1400 authored lines → exceeds 400; ask chain strategy before PR.

## Tasks

- [x] T1 Remove seed endpoint — route: inline (3 mechanical files) — commit 0da550a — assess: medium, under_budget
- [x] T2 Infra (registry, generator, swagger.ts merges generated paths) + migrate inventory-movement — route: delegated writer (mapping+writer trigger: 11 files) — commit 8517522 — tsc ok, vitest 7 known failures only, spec inventory 39/39 identical (parent spot check)
  - Decision: no `extendZodWithOpenApi`; schemas named via Zod 4 `.meta({ id })`, which zod-to-openapi v9 reads. Unreferenced schemas registered via `registerSchema()` (`{ type: 'schema', schema }`).
  - Gotchas: library drops `.multipleOf()` → documented via `.meta({ multipleOf })`; query param docs via `.meta({ param: { description } })`.
  - Shared error responses now in `src/openapi/responses.ts` (`errorRef(name)` typed helper); `ApiError` lives there (T5 may move it).
- [x] T3 Spec guard test (operation inventory fixture + every $ref resolves) moved here from T5 (review R3-merged-spec-unasserted); mergePaths fails on duplicate path+method (review R3-silent-path-override); migrate cash-register, supplier, store-user — route: delegated writer (writer trigger: 15+ files) — commits e4687f9, 0febe0d, e647228 — tsc ok, vitest 7 known only, spec test 6/6 (parent spot check)
  - Cash-register `components.parameters` replaced by inline params (zod-to-openapi `.meta({id})` would collide with schema ids). `createStoreUserSchema = createUserSchema.strict()`.
  - Review main..e647228 slice (a723844..e647228): granted → approved, acknowledged (lineage review-4c0b693aed089458). Reviewed boundary = e647228.
- [x] T4 Full-spec snapshot test guarding component shapes (review R3-schema-shape-unasserted, WARNING); mergePaths duplicate check limited to HTTP methods (review R3-merge-pathlevel-keys); migrate product, category, user/auth, report — route: delegated writer — commits a661612, eb1c53a, 1239024, 4c603b4 — tsc ok, vitest 7 known only, spec tests 9/9, no `@swagger` left (parent spot check)
  - Review of e647228..4c603b4 refused: `lens_context_budget_exceeded` (4.3k-line generated snapshot). Split: a661612..4c603b4 (high, auth hot path) granted → 4 lenses → approved, acknowledged (lineage review-6cdf625c15305831). Snapshot commit a661612 alone left unreviewed (generated JSON + test; would exceed budget).
  - Findings → T5: R2-product-get-by-id-inconsistent (WARNING, align GET /product/{id} with file pattern), R2-money-schema-duplicated, R2-empty-transition-module, R2-errors-naming-inconsistent.
  - Findings → user decision: R2-coerce-nullable-doc + R3-001 (WARNING): `z.coerce.number()` accepts `null` → saved as 0 (reproduced: `createProductSchema.safeParse({ name, salePrice: null, minStock: null })` → success, 0/0); docs now show `nullable: true`.
- [x] T4b fix(product): body salePrice/minStock use z.number() (no coercion of null/""/booleans) — route: inline (1 schema + tests) — commit df34af0 — RED 9 failing → GREEN; snapshot drops 4 `nullable: true`; old test asserting string coercion updated (frontend sends numbers via type=number, verified) — assess: medium, under_budget
- [ ] T5 Cleanup: remove swagger-jsdoc, merge plumbing, swagger-schemas.ts; T4 readability findings — route: delegated writer

## Acceptance criteria

- `/api-docs.json` is generated only from Zod-registered paths (no JSDoc source).
- Every endpoint present before the migration is present after it, with same methods, params, status codes.
- `tsc --noEmit` passes; vitest has no new failures.

## Checks

- `./node_modules/.bin/tsc --noEmit`
- `npx vitest run`
- Spec smoke: fetch `/api-docs.json`, compare path+method inventory against the pre-migration spec.

## Known failing tests on base (pre-existing)

`src/tests/routes/inventory-movement.routes.test.ts`: 5 × "registers '<op>' with an empty 204 matching Swagger",
"removes the old /entries route…", "removes the old /exits route…".

## Progress

- 2026-10-08: pending work committed on main (7558e57); branch created; T1 done.
- 2026-10-08: T2 done (8517522). Generated content diff vs baseline: equivalent; `notes` now shows maxLength 500, `quantity` shows max — drift fixed.

- 2026-10-08: native review of main..a723844 (medium, slice_budget_reached): granted → approved, acknowledged (lineage review-aefdd18e95f8733a). Reviewed boundary = a723844. Findings: 1 WARNING (no spec guard test) + 1 SUGGESTION (silent path override) → folded into T3. `.atl/` added to local `.git/info/exclude`.

## Follow-ups (out of scope, faithful migration)

- Read-only list ops (`GET /api/supplier`, `GET /api/store-user`) document 404/409/422 they cannot return (pre-existing in baseline; review R3-list-ops-conflict-errors).

## Next step

T5.
