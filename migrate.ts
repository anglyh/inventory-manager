import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { env } from './src/config.js';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const res = await pool.query("SELECT name FROM migrations ORDER BY id");
  return new Set(res.rows.map((r) => r.name as string));
}

async function runMigrations(): Promise<void> {
  const migrationsDir = path.resolve(process.cwd(), "migrations");

  const files = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping already applied: ${file}`);
      continue;
    }

    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, "utf8");

    console.log(`Running migration: ${file}`);
    await pool.query(sql);
    await pool.query("INSERT INTO migrations(name) VALUES ($1)", [file]);
  }

  console.log("All migrations up to date");
}

async function main(): Promise<void> {
  try {
    await runMigrations();
  } catch (err) {
    console.error("❌ Migration failed");
    console.error(err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
