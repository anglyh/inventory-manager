import { config } from 'dotenv';
import { resolve } from 'path';
import { cwd } from 'process';

const envFile = process.env.NODE_ENV === "production"
  ? ".env.production"
  : ".env.development";

config({ path: resolve(cwd(), envFile) })

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 3000,
  DATABASE_URL: requireEnv('DATABASE_URL'),
  DB_SSL: process.env.DB_SSL === 'true',
  JWT_SECRET: requireEnv('JWT_SECRET')
}