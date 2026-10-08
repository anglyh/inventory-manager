import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mergePaths, swaggerSpec } from '../../config/swagger.js';

type Operation = { summary?: string; tags?: string[]; responses?: Record<string, unknown> };
type Spec = { paths: Record<string, Record<string, Operation>> };

const spec = swaggerSpec as Spec;
const httpMethods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

const operations = () => Object.entries(spec.paths).flatMap(([path, item]) => Object.entries(item)
  .filter(([method]) => httpMethods.has(method))
  .map(([method, operation]) => ({ path, method, operation })));

/** Recursively sorts object keys so the snapshot does not depend on generation order. */
const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys((value as Record<string, unknown>)[key])]));
};

describe('generated OpenAPI spec', () => {
  it('documents exactly the expected operations and status codes', () => {
    // Fixture lines: `METHOD path [sorted status codes]`, sorted. Update it only for intended API changes.
    const expected = readFileSync(new URL('./spec-inventory.txt', import.meta.url), 'utf8')
      .split(/\r?\n/).filter(line => line.trim() !== '');
    const actual = operations()
      .map(({ path, method, operation }) => `${method.toUpperCase()} ${path} [${Object.keys(operation.responses ?? {}).sort().join(',')}]`)
      .sort();

    expect(actual).toEqual(expected);
  });

  it('resolves every $ref to an existing component', () => {
    const unresolved: string[] = [];
    const visit = (value: unknown) => {
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (key !== '$ref') {
          visit(child);
          continue;
        }
        const match = typeof child === 'string' ? /^#\/components\/([^/]+)\/([^/]+)$/.exec(child) : null;
        const components = (swaggerSpec as { components?: Record<string, Record<string, unknown>> }).components;
        if (!match || !components?.[match[1]!]?.[match[2]!]) unresolved.push(String(child));
      }
    };
    visit(swaggerSpec);

    expect(unresolved).toEqual([]);
  });

  it('matches the reviewed spec snapshot', async () => {
    // Any change to schemas, parameters, defaults, required fields or responses shows up as a diff
    // of this file. Review it, then update it with `npx vitest run -u`.
    await expect(`${JSON.stringify(sortKeys(swaggerSpec), null, 2)}\n`)
      .toMatchFileSnapshot('./__snapshots__/openapi-spec.json');
  });

  it('gives every operation a summary and at least one tag', () => {
    const incomplete = operations()
      .filter(({ operation }) => !operation.summary?.trim() || !operation.tags?.length)
      .map(({ path, method }) => `${method.toUpperCase()} ${path}`);

    expect(incomplete).toEqual([]);
  });
});

describe('mergePaths', () => {
  it('combines different methods documented for the same path', () => {
    const merged = mergePaths({ '/a': { get: { summary: 'list' } } }, { '/a': { post: { summary: 'create' } } }, { '/b': { get: {} } });

    expect(merged).toEqual({ '/a': { get: { summary: 'list' }, post: { summary: 'create' } }, '/b': { get: {} } });
  });

  it('fails when two sources document the same path and method', () => {
    expect(() => mergePaths({ '/a': { get: {} } }, { '/a': { get: {}, post: {} } }))
      .toThrow('OpenAPI operation documented by more than one source: GET /a');
  });

  it('accepts identical path-level fields repeated by different sources', () => {
    const parameters = [{ in: 'path', name: 'id', required: true }];
    const merged = mergePaths({ '/a/{id}': { parameters, get: {} } }, { '/a/{id}': { parameters, summary: 'A', post: {} } });

    expect(merged).toEqual({ '/a/{id}': { parameters, summary: 'A', get: {}, post: {} } });
  });

  it('fails with a distinct error when path-level fields differ between sources', () => {
    expect(() => mergePaths({ '/a': { summary: 'A', get: {} } }, { '/a': { summary: 'B', post: {} } }))
      .toThrow('OpenAPI path-level fields of /a differ between sources: summary');
  });

  it('does not mutate its sources', () => {
    const first = { '/a': { get: {} } };
    mergePaths(first, { '/a': { post: {} } });

    expect(first).toEqual({ '/a': { get: {} } });
  });
});
