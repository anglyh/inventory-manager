import { env } from '../src/config.js';

// Refuse before touching the database: this script wipes every table and row.
if (env.NODE_ENV === 'production') {
  console.error('❌ db:reset is disabled in production: it would drop every table and its data.');
  process.exit(1);
}

const { query } = await import('../src/db/index.js');

async function resetDb() {
  console.log("🔥 Destruyendo la base de datos...");
  // DROP SCHEMA CASCADE borra absolutamente todo
  await query('DROP SCHEMA public CASCADE;');

  console.log("✨ Creando un esquema nuevo y limpio...");
  await query('CREATE SCHEMA public;');

  console.log("✅ Reset completo. La base de datos está vacía.");
  process.exit(0);
}

resetDb();
