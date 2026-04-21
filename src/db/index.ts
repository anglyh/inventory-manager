import { Pool } from "pg";
import { env } from '../config.js';

/** Supabase / hosted Postgres suelen exigir TLS aunque `DB_SSL` no esté en Vercel. */
function poolSsl():
  | { rejectUnauthorized: boolean }
  | undefined {
  if (env.DB_SSL) return { rejectUnauthorized: false };
  const u = env.DATABASE_URL.toLowerCase();
  const needsSsl =
    u.includes("sslmode=require") ||
    u.includes("sslmode=verify") ||
    u.includes(".supabase.co") ||
    u.includes(".pooler.supabase.com");
  return needsSsl ? { rejectUnauthorized: false } : undefined;
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: poolSsl(),
})

export async function initDb() {
  try {
    await query("SELECT 1")
    console.log("Connected to database")
  } catch (err) {
    console.error("Error connecting to dabase", err)
    throw err
  }
}

export function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export function getClient() {
  return pool.connect();
}