import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Application } from 'express';
import { errorResponses, responseSchemas } from './swagger-schemas.js';

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
            schemas: responseSchemas,
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

export const setupSwagger = (app: Application) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log('Docs available at http://localhost:3000/api-docs');
};
