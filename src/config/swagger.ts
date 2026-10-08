import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Application } from 'express';
import { responseSchemas } from './swagger-schemas.js';
import { inventorySchemas, inventoryPaths } from './swagger-inventory.js';
import { generateOpenApiDocument, openApiInfo, openApiServers } from '../openapi/document.js';

// Transition: modules not yet migrated to Zod are still documented with JSDoc.
const options: swaggerJSDoc.Options = {
    failOnErrors: true,
    definition: {
        openapi: '3.0.0',
        info: openApiInfo,
        servers: openApiServers,
        components: {
            schemas: { ...responseSchemas, ...inventorySchemas },
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

/**
 * Merges the path maps of every documentation source into a new object. Operations on the same
 * path are combined, but two sources documenting the same path and method would silently
 * override each other, so that case fails fast instead.
 */
export const mergePaths = (...sources: Paths[]): Paths => {
    const merged: Paths = {};
    for (const source of sources) {
        for (const [path, operations] of Object.entries(source)) {
            const current = merged[path] ?? {};
            const duplicated = Object.keys(operations).filter(method => method in current);
            if (duplicated.length > 0) {
                const names = duplicated.map(method => `${method.toUpperCase()} ${path}`).join(', ');
                throw new Error(`OpenAPI operation documented by more than one source: ${names}`);
            }
            merged[path] = { ...current, ...operations };
        }
    }
    return merged;
};

const legacySpec = swaggerJSDoc(options) as Spec;
const generated = generateOpenApiDocument() as unknown as Spec & Record<string, unknown>;

const paths = mergePaths(legacySpec.paths, inventoryPaths, generated.paths);

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
