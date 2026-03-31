/**
 * Adaptador de Base de Datos - Agnóstico SQLite/PostgreSQL
 * Abstrae las diferencias entre ambos drivers
 */

import sqlite from 'better-sqlite3';
import { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

export const isPgEnabled = () => process.env.DB_CORE_PG === '1' && Boolean(process.env.DATABASE_URL);

let pgPool: Pool | null = null;
let sqliteDb: sqlite.Database | null = null;

// Inicializar pool de PostgreSQL
export const initPgPool = async () => {
  if (pgPool || !isPgEnabled()) return;

  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL_NO_VERIFY === '1' ? { rejectUnauthorized: false } : undefined,
  });

  // Ejecutar schema
  const schemaPath = path.resolve(process.cwd(), 'scripts/pg-schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pgPool.query(schema);
    console.log('✅ PostgreSQL schema inicializado');
  }
};

// Obtener BD SQLite
export const getSqliteDb = () => {
  if (!sqliteDb) {
    sqliteDb = new sqlite('warzone.db');
    sqliteDb.pragma('foreign_keys = ON');
  }
  return sqliteDb;
};

/**
 * Interface para queries agnósticas
 */
export interface DbQuery {
  get: (sql: string, params?: any[]) => Promise<any>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  run: (sql: string, params?: any[]) => Promise<{ lastID?: number; changes?: number }>;
}

/**
 * Factory para retornar el adaptador correcto
 */
export const getDbAdapter = (): DbQuery => {
  if (isPgEnabled() && pgPool) {
    return createPgAdapter(pgPool);
  }
  return createSqliteAdapter(getSqliteDb());
};

/**
 * Adaptador PostgreSQL
 */
const createPgAdapter = (pool: Pool): DbQuery => {
  return {
    get: async (sql: string, params?: any[]) => {
      const res = await pool.query(sql, params);
      return res.rows[0] || null;
    },
    all: async (sql: string, params?: any[]) => {
      const res = await pool.query(sql, params);
      return res.rows;
    },
    run: async (sql: string, params?: any[]) => {
      const res = await pool.query(sql, params);
      return { changes: res.rowCount, lastID: undefined };
    },
  };
};

/**
 * Adaptador SQLite
 */
const createSqliteAdapter = (db: sqlite.Database): DbQuery => {
  return {
    get: async (sql: string, params?: any[]) => {
      return Promise.resolve(db.prepare(sql).get(...(params || [])));
    },
    all: async (sql: string, params?: any[]) => {
      return Promise.resolve(db.prepare(sql).all(...(params || [])));
    },
    run: async (sql: string, params?: any[]) => {
      const stmt = db.prepare(sql);
      const info = stmt.run(...(params || []));
      return Promise.resolve({ changes: info.changes, lastID: info.lastInsertRowid as number });
    },
  };
};

/**
 * Helper: Convertir placeholders ? a $1, $2, etc. para PostgreSQL
 */
export const convertSqlParams = (sql: string): string => {
  if (!isPgEnabled()) return sql;
  let counter = 1;
  return sql.replace(/\?/g, () => `$${counter++}`);
};

/**
 * Helper: Ejecutar una transacción
 */
export const withTransaction = async <T>(fn: (adapter: DbQuery) => Promise<T>): Promise<T> => {
  const adapter = getDbAdapter();

  if (isPgEnabled() && pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn({
        get: (sql, params) => client.query(sql, params).then(r => r.rows[0] || null),
        all: (sql, params) => client.query(sql, params).then(r => r.rows),
        run: (sql, params) => client.query(sql, params).then(r => ({ changes: r.rowCount, lastID: undefined })),
      });
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } else {
    const db = getSqliteDb();
    const transactionAdapter: DbQuery = {
      get: (sql, params) => Promise.resolve(db.prepare(sql).get(...(params || []))),
      all: (sql, params) => Promise.resolve(db.prepare(sql).all(...(params || []))),
      run: (sql, params) => {
        const info = db.prepare(sql).run(...(params || []));
        return Promise.resolve({ changes: info.changes, lastID: info.lastInsertRowid as number });
      },
    };
    const beginStmt = db.prepare('BEGIN');
    beginStmt.run();
    try {
      const result = await fn(transactionAdapter);
      db.prepare('COMMIT').run();
      return result;
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }
  }
};

