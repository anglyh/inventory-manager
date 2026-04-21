import { initDb } from './db/index.js';
import { app } from './app.js';
import { env } from './config.js';

(async () => {
  try {
    await initDb();
    app.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT}`);
    });
  } catch (err) {
    console.error("Error on DB startup:", err);
    process.exit(1);
  }
})();
