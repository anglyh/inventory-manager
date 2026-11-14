import { Pool } from "pg";
import { env } from '../config.js';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DB_SSL
    ? { rejectUnauthorized: false }
    : undefined,
});

// Without a listener, a dropped idle connection (e.g. Postgres restarting) kills the process.
pool.on('error', err => {
  console.error('Idle database connection error', err);
});

export async function initDb() {
  try {
    await query("SELECT 1");
  } catch (err) {
    console.error("Error connecting to database", err);
    throw err;
  }
}

export function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export function getClient() {
  return pool.connect();
}

export function closeDb() {
  return pool.end();
}
