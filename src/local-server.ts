/**
 * Solo para desarrollo / proceso largo (Docker, Render…): abre el puerto.
 * Vercel no usa este archivo (no coincide con los nombres que auto-detecta).
 */
import app from './index.js';
import { env } from './config.js';

app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});
