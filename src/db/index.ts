import { Pool, types } from "pg";
import { env } from '../config.js';

types.setTypeParser(1700, val => parseFloat(val));

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DB_SSL
    ? { rejectUnauthorized: false }
    : undefined
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