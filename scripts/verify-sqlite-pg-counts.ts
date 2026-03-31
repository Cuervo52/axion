import path from 'node:path';
import Database from 'better-sqlite3';
import { Client } from 'pg';

type TableName =
  | 'users'
  | 'competitions'
  | 'squads'
  | 'squad_members'
  | 'matches'
  | 'stats'
  | 'tournament_organizers'
  | 'competition_members';

const TABLES: TableName[] = [
  'users',
  'competitions',
  'squads',
  'squad_members',
  'matches',
  'stats',
  'tournament_organizers',
  'competition_members',
];

const sqlitePath = process.env.SQLITE_PATH || path.resolve(process.cwd(), 'warzone.db');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Missing DATABASE_URL. Example: postgres://user:pass@host:5432/db');
  process.exit(1);
}

const main = async () => {
  const sqlite = new Database(sqlitePath, { readonly: true });
  const pg = new Client({
    connectionString: databaseUrl,
    ssl: process.env.PGSSL_NO_VERIFY === '1' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pg.connect();

    let hasMismatch = false;

    for (const table of TABLES) {
      const sqliteCount = Number((sqlite.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as any)?.c || 0);
      const pgRes = await pg.query<{ c: string }>(`SELECT COUNT(*)::text as c FROM "${table}"`);
      const pgCount = Number(pgRes.rows[0]?.c || 0);
      let ok = sqliteCount === pgCount;

      if (table === 'users' && !ok) {
        const pgNonLegacy = await pg.query<{ c: string }>(
          `SELECT COUNT(*)::text as c FROM "users" WHERE email IS NULL OR email NOT LIKE '%@legacy.local'`
        );
        const pgNonLegacyCount = Number(pgNonLegacy.rows[0]?.c || 0);
        if (sqliteCount === pgNonLegacyCount) {
          ok = true;
          console.log(`INFO users legacy placeholders: ${pgCount - pgNonLegacyCount}`);
        }
      }
      if (!ok) hasMismatch = true;
      console.log(`${ok ? 'OK   ' : 'DIFF '} ${table.padEnd(22)} sqlite=${String(sqliteCount).padStart(6)} pg=${String(pgCount).padStart(6)}`);
    }

    if (hasMismatch) {
      process.exitCode = 2;
      console.error('Count verification finished with differences.');
    } else {
      console.log('Count verification OK.');
    }
  } catch (error) {
    console.error('Verification failed:', error);
    process.exitCode = 1;
  } finally {
    sqlite.close();
    await pg.end();
  }
};

main();

