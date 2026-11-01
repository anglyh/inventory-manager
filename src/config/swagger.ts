import { isDeepStrictEqual } from 'node:util';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Application } from 'express';
import { responseSchemas } from './swagger-schemas.js';
import { generateOpenApiDocument, openApiInfo, openApiServers } from '../openapi/document.js';

// Transition: modules not yet migrated to Zod are still documented with JSDoc.
const options: swaggerJSDoc.Options = {
    failOnErrors: true,
    definition: {
        openapi: '3.0.0',
        info: openApiInfo,
        servers: openApiServers,
        components: {
            schemas: responseSchemas,
        },
    },
    // Rutas donde Swagger buscará los comentarios de documentación
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export type Paths = Record<string, Record<string, unknown>>;

type Spec = {
    paths: Paths;
    components: Record<string, Record<string, unknown>>;
    tags?: { name: string }[];
};

const httpMethods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

/**
 * Merges the path maps of every documentation source into a new object. Operations on the same
 * path are combined, but two sources documenting the same path and method would silently
 * override each other, so that case fails fast instead. Path-level fields (parameters, summary,
 * description, servers...) may be repeated only with identical values; conflicting values fail
 * with their own error.
 */
export const mergePaths = (...sources: Paths[]): Paths => {
    const merged: Paths = {};
    for (const source of sources) {
        for (const [path, item] of Object.entries(source)) {
            const current = merged[path] ?? {};
            const repeated = Object.keys(item).filter(key => key in current);
            const duplicated = repeated.filter(key => httpMethods.has(key));
            if (duplicated.length > 0) {
                const names = duplicated.map(method => `${method.toUpperCase()} ${path}`).join(', ');
                throw new Error(`OpenAPI operation documented by more than one source: ${names}`);
            }
            const conflicting = repeated.filter(key => !isDeepStrictEqual(current[key], item[key]));
            if (conflicting.length > 0) {
                throw new Error(`OpenAPI path-level fields of ${path} differ between sources: ${conflicting.join(', ')}`);
            }
            merged[path] = { ...current, ...item };
        }
    }
    return merged;
};

const legacySpec = swaggerJSDoc(options) as Spec;
const generated = generateOpenApiDocument() as unknown as Spec & Record<string, unknown>;

const paths = mergePaths(legacySpec.paths, generated.paths);

// Generated components (security schemes, shared responses, Zod schemas) take precedence.
for (const [type, entries] of Object.entries(generated.components)) {
    legacySpec.components[type] = { ...legacySpec.components[type], ...entries };
}

const tags = [...(legacySpec.tags ?? []), ...(generated.tags ?? [])]
    .filter((tag, index, all) => all.findIndex(other => other.name === tag.name) === index)
    .sort((a, b) => a.name.localeCompare(b.name));

export const swaggerSpec: object = {
    openapi: generated.openapi,
    info: generated.info,
    servers: generated.servers,
    components: legacySpec.components,
    security: generated.security,
    paths,
    tags,
};

export const setupSwagger = (app: Application) => {
    // Spec en JSON para generar tipos del frontend (p. ej. con openapi-typescript).
    app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log('Docs available at http://localhost:3000/api-docs');
    console.log('OpenAPI spec available at http://localhost:3000/api-docs.json');
};
