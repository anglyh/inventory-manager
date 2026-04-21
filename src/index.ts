/**
 * Entrada para Vercel (Express serverless): exporta la app sin `listen()`.
 * Ver: https://vercel.com/docs/frameworks/backend/express
 */
import { initDb } from './db/index.js';
import { app } from './app.js';

await initDb();
export default app;
