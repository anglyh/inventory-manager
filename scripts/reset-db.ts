import { query } from '../src/db/index.js';

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