import fs from "node:fs";
import path from "node:path";
import type { PoolClient } from "pg";
// Shares the app's pool so DATABASE_URL and DB_SSL apply here exactly as in the API.
import { closeDb, getClient } from '../src/db/index.js';

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(client: PoolClient): Promise<Set<string>> {
  const res = await client.query("SELECT name FROM migrations ORDER BY id");
  return new Set(res.rows.map((r) => r.name as string));
}

async function runMigrations(client: PoolClient): Promise<void> {
  // Usamos import.meta.dirname para subir un nivel (..) y entrar a migrations/
  const migrationsDir = path.join(import.meta.dirname, '..', 'migrations');

  const files = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();

  await ensureMigrationsTable(client);
  const applied = await getAppliedMigrations(client);

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping already applied: ${file}`);
      continue;
    }

    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, "utf8");

    console.log(`Running migration: ${file}`);
    // The migration and its record commit together: a failure leaves neither behind,
    // so the next deploy retries it from a clean state instead of skipping or half-applying it.
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO migrations(name) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (err) {
      // If the connection is gone, ROLLBACK fails too; keep reporting the migration's own error.
      await client.query("ROLLBACK").catch(() => undefined);
      throw new Error(`Migration ${file} failed and was rolled back`, { cause: err });
    }
  }

  console.log("All migrations up to date");
}

async function main(): Promise<void> {
  let client: PoolClient | undefined;
  try {
    client = await getClient();
    await runMigrations(client);
  } catch (err) {
    console.error("❌ Migration failed");
    console.error(err);
    process.exitCode = 1;
  } finally {
    client?.release();
    await closeDb();
  }
}

main();
