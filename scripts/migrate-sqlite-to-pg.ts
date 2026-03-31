import fs from 'node:fs';
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
const schemaPath = path.resolve(process.cwd(), 'scripts/pg-schema.sql');
const batchSize = Number(process.env.MIGRATION_BATCH_SIZE || 500);

if (!databaseUrl) {
  console.error('Missing DATABASE_URL. Example: postgres://user:pass@host:5432/db');
  process.exit(1);
}

if (!fs.existsSync(sqlitePath)) {
  console.error(`SQLite file not found: ${sqlitePath}`);
  process.exit(1);
}

if (!fs.existsSync(schemaPath)) {
  console.error(`Schema file not found: ${schemaPath}`);
  process.exit(1);
}

const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

const tableExists = (sqlite: Database.Database, table: string): boolean => {
  const row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  return Boolean(row);
};

const splitBatches = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

const insertRows = async (pg: Client, table: string, rows: Array<Record<string, unknown>>) => {
  if (rows.length === 0) return;

  const pgColsRes = await pg.query<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
    [table]
  );
  const allowedCols = new Set(pgColsRes.rows.map((r) => r.column_name));

  const columns = Object.keys(rows[0]).filter((col) => allowedCols.has(col));
  if (columns.length === 0) {
    console.log(`[SKIP] No compatible columns for table ${table}`);
    return;
  }
  const colList = columns.map(quoteIdent).join(', ');

  for (const chunk of splitBatches(rows, batchSize)) {
    const values: unknown[] = [];
    const rowSql = chunk.map((row, rowIdx) => {
      const placeholder = columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ');
      for (const col of columns) values.push(row[col] ?? null);
      return `(${placeholder})`;
    }).join(', ');

    const sql = `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES ${rowSql}`;
    await pg.query(sql, values);
  }
};

const resetTargetTables = async (pg: Client) => {
  await pg.query(`
    TRUNCATE TABLE
      competition_members,
      tournament_organizers,
      stats,
      matches,
      squad_members,
      squads,
      competitions,
      users
    RESTART IDENTITY CASCADE
  `);
};

const alignIdentitySequences = async (pg: Client) => {
  const sequenceTables = ['competitions', 'squads', 'stats'];
  for (const table of sequenceTables) {
    const seqRes = await pg.query<{ seq_name: string | null }>(
      `SELECT pg_get_serial_sequence($1, 'id') AS seq_name`,
      [table]
    );
    const seqName = seqRes.rows[0]?.seq_name;
    if (!seqName) continue;

    const maxRes = await pg.query<{ max_id: number | null }>(`SELECT MAX(id) AS max_id FROM ${quoteIdent(table)}`);
    const maxId = Number(maxRes.rows[0]?.max_id || 0);
    await pg.query(`SELECT setval($1, $2, true)`, [seqName, maxId > 0 ? maxId : 1]);
  }
};

const main = async () => {
  const sqlite = new Database(sqlitePath, { readonly: true });
  const pg = new Client({
    connectionString: databaseUrl,
    ssl: process.env.PGSSL_NO_VERIFY === '1' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pg.connect();
    console.log(`[PG] Connected: ${databaseUrl.split('@').pop()}`);

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await pg.query(schemaSql);
    console.log('[PG] Schema ensured.');

    const tableRows: Partial<Record<TableName, Array<Record<string, unknown>>>> = {};
    for (const table of TABLES) {
      if (!tableExists(sqlite, table)) {
        console.log(`[SKIP] Table not found in SQLite: ${table}`);
        tableRows[table] = [];
        continue;
      }
      tableRows[table] = sqlite.prepare(`SELECT * FROM ${table}`).all() as Array<Record<string, unknown>>;
    }

    const usersRows = (tableRows.users || []).map((r) => ({ ...r }));
    const userIdSet = new Set(usersRows.map((r) => String(r.google_id || '')));

    const ensureUser = (idValue: unknown) => {
      const id = String(idValue || '').trim();
      if (!id || userIdSet.has(id)) return;

      userIdSet.add(id);
      usersRows.push({
        google_id: id,
        email: `${id.replace(/[^a-zA-Z0-9_.-]/g, '_')}@legacy.local`,
        gamertag: `Legacy-${id}`,
        avatar_url: null,
        phone: null,
        role: 'PLAYER',
        created_at: null,
      });
    };

    const userFkTables: Array<{ name: TableName; fields: string[] }> = [
      { name: 'competitions', fields: ['admin_id'] },
      { name: 'squads', fields: ['leader_id'] },
      { name: 'squad_members', fields: ['user_id'] },
      { name: 'matches', fields: ['submitted_by'] },
      { name: 'stats', fields: ['user_id'] },
      { name: 'tournament_organizers', fields: ['user_id'] },
      { name: 'competition_members', fields: ['user_id'] },
    ];

    for (const item of userFkTables) {
      const rows = tableRows[item.name] || [];
      for (const row of rows) {
        for (const field of item.fields) {
          ensureUser(row[field]);
        }
      }
    }

    tableRows.users = usersRows;

    await pg.query('BEGIN');

    await resetTargetTables(pg);
    console.log('[PG] Target tables truncated.');

    for (const table of TABLES) {
      const rows = (tableRows[table] || []) as Array<Record<string, unknown>>;
      await insertRows(pg, table, rows);
      console.log(`[COPY] ${table}: ${rows.length} row(s)`);
    }

    await alignIdentitySequences(pg);
    await pg.query('COMMIT');

    console.log('[DONE] SQLite -> PostgreSQL migration completed.');
  } catch (error) {
    try {
      await pg.query('ROLLBACK');
    } catch {
      // no-op
    }
    console.error('[ERROR] Migration failed:', error);
    process.exitCode = 1;
  } finally {
    sqlite.close();
    await pg.end();
  }
};

main();

