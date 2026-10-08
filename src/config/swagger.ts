import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Application } from 'express';
import { cashRegisterParameters, errorResponses, responseSchemas } from './swagger-schemas.js';
import { inventorySchemas, inventoryPaths, inventoryHistoryParameters } from './swagger-inventory.js';

const options: swaggerJSDoc.Options = {
    failOnErrors: true,
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Hostal API',
            version: '1.0.0',
            description: 'API del proyecto Hostal. Cada petición recibe una sola de las respuestas documentadas. Un 204 confirma el éxito sin cuerpo; los ejemplos JSON de errores solo se devuelven cuando ocurre el error correspondiente.',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            parameters: cashRegisterParameters,
            schemas: { ...responseSchemas, ...inventorySchemas },
            responses: errorResponses,
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    // Rutas donde Swagger buscará los comentarios de documentación
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);

// Añadir operaciones sin reemplazar los PUT/DELETE ya documentados en las mismas rutas.
const paths = (swaggerSpec as { paths: Record<string, Record<string, any>> }).paths;
for (const [path, operations] of Object.entries(inventoryPaths)) {
    paths[path] = { ...paths[path], ...operations };
}
paths['/api/inventory-movement']!.get.parameters.push(...inventoryHistoryParameters);

export const setupSwagger = (app: Application) => {
    // Spec en JSON para generar tipos del frontend (p. ej. con openapi-typescript).
    app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log('Docs available at http://localhost:3000/api-docs');
    console.log('OpenAPI spec available at http://localhost:3000/api-docs.json');
};
