import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Application } from 'express';
import { cashRegisterParameters, responseSchemas } from './swagger-schemas.js';
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
            parameters: cashRegisterParameters,
            schemas: { ...responseSchemas, ...inventorySchemas },
        },
    },
    // Rutas donde Swagger buscará los comentarios de documentación
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

type Spec = {
    paths: Record<string, Record<string, unknown>>;
    components: Record<string, Record<string, unknown>>;
    tags?: { name: string }[];
};

const legacySpec = swaggerJSDoc(options) as Spec;
const generated = generateOpenApiDocument() as unknown as Spec & Record<string, unknown>;

// Añadir operaciones sin reemplazar los PUT/DELETE ya documentados en las mismas rutas.
const mergePaths = (target: Spec['paths'], source: Spec['paths']) => {
    for (const [path, operations] of Object.entries(source)) {
        target[path] = { ...target[path], ...operations };
    }
};
mergePaths(legacySpec.paths, inventoryPaths);
mergePaths(legacySpec.paths, generated.paths);

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
    paths: legacySpec.paths,
    tags,
};

export const setupSwagger = (app: Application) => {
    // Spec en JSON para generar tipos del frontend (p. ej. con openapi-typescript).
    app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log('Docs available at http://localhost:3000/api-docs');
    console.log('OpenAPI spec available at http://localhost:3000/api-docs.json');
};
