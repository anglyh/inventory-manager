import { env } from '../src/config.js';

const CONFIRM_FLAG = '--yes-drop-everything';

// Refuse before touching the database: this script wipes every table and row.
if (env.NODE_ENV === 'production') {
  console.error('❌ db:reset is disabled in production: it would drop every table and its data.');
  process.exit(1);
}

// NODE_ENV only says where this process runs, not which database DATABASE_URL points at.
// Show the target and require an explicit flag so a copied production URL is never wiped by accident.
const target = describeTarget(env.DATABASE_URL);
if (!process.argv.includes(CONFIRM_FLAG)) {
  console.error(`❌ This drops every table and row in ${target}.`);
  console.error(`   If that is really what you want, run it again with ${CONFIRM_FLAG}`);
  process.exit(1);
}

const { query } = await import('../src/db/index.js');

async function resetDb() {
  console.log(`🔥 Destruyendo la base de datos ${target}...`);
  // DROP SCHEMA CASCADE borra absolutamente todo
  await query('DROP SCHEMA public CASCADE;');

  console.log("✨ Creando un esquema nuevo y limpio...");
  await query('CREATE SCHEMA public;');

  console.log("✅ Reset completo. La base de datos está vacía.");
  process.exit(0);
}

/** "db_name on host:port" without the credentials, or a generic label if the URL is unusual. */
function describeTarget(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    return `"${url.pathname.slice(1)}" on ${url.host}`;
  } catch {
    return 'the database in DATABASE_URL';
  }
}

resetDb();
