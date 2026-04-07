import { query, getClient } from './src/db/index.js';

async function resetDb() {
  console.log("Truncating tables...");
  await query('TRUNCATE TABLE "user" CASCADE');
  await query('TRUNCATE TABLE "category" CASCADE');
  await query('TRUNCATE TABLE "product" CASCADE');
  console.log("Database reset complete.");
  process.exit(0);
}

resetDb();
