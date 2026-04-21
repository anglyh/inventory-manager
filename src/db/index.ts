import { Pool } from "pg";
import { env } from '../config.js';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DB_SSL
    ? { rejectUnauthorized: false }
    : undefined,
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
