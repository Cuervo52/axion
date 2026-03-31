import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const pgCoreFlag = process.env.DB_CORE_PG === '1';

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.PGSSL_NO_VERIFY === '1' ? { rejectUnauthorized: false } : undefined,
    })
  : null;

let schemaReady = false;

export const isPgCoreEnabled = () => Boolean(pool && pgCoreFlag);

export const initPgSchema = async () => {
  if (!isPgCoreEnabled() || schemaReady || !pool) return;

  const schemaPath = path.resolve(process.cwd(), 'scripts/pg-schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`PG schema file not found: ${schemaPath}`);
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  schemaReady = true;
};

export const pgQuery = async <T = any>(text: string, params: any[] = []) => {
  if (!pool) throw new Error('PostgreSQL pool is not configured');
  return pool.query<T>(text, params);
};

