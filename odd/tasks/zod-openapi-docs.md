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
- [ ] T3 Migrate cash-register, supplier, store-user — route: delegated writer
- [ ] T4 Migrate product, category, user/auth, report — route: delegated writer
- [ ] T5 Cleanup: remove swagger-jsdoc, JSDoc blocks, swagger-schemas.ts, swagger-inventory.ts; add spec test — route: delegated writer

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

## Next step

T3.
