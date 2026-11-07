/**
 * Creates the schema if needed and applies sql/*.sql files in order, once each.
 *   npm run db:migrate            apply pending migrations
 *   npm run db:migrate -- --reset drop and recreate the schema first (destroys all data)
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import pg from 'pg';

import { config } from '../config';
import { createPool } from '../db';

const SQL_DIR = path.resolve(import.meta.dirname, '../../sql');

export async function migrate({ reset = false, schema = config.db.schema, quiet = false } = {}) {
  const log = (m: string) => { if (!quiet) console.log(m); };
  if (schema === 'public') throw new Error('Use a dedicated DB_SCHEMA, not public: Supabase exposes public through its REST API.');
  const pool = createPool(schema);
  const db = await pool.connect();
  const id = pg.escapeIdentifier(schema);
  try {
    if (reset) {
      log(`[migrate] dropping schema ${schema}`);
      await db.query(`DROP SCHEMA IF EXISTS ${id} CASCADE`);
    }
    // Supabase's anon/authenticated roles get nothing here; only this API (the connection's own role) reads and writes.
    await db.query(`CREATE SCHEMA IF NOT EXISTS ${id}`);
    await db.query('CREATE TABLE IF NOT EXISTS SchemaMigrations (Name VARCHAR(200) PRIMARY KEY, AppliedAt TIMESTAMPTZ NOT NULL DEFAULT now())');
    const done = new Set((await db.query<{ name: string }>('SELECT Name FROM SchemaMigrations')).rows.map((r) => r.name));
    const files = (await readdir(SQL_DIR)).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (done.has(f)) continue;
      const text = await readFile(path.join(SQL_DIR, f), 'utf8');
      await db.query('BEGIN');
      try {
        await db.query(text);
        await db.query('INSERT INTO SchemaMigrations (Name) VALUES ($1)', [f]);
        await db.query('COMMIT');
        log(`[migrate] applied ${f}`);
      } catch (e) {
        await db.query('ROLLBACK');
        throw new Error(`Migration ${f} failed: ${(e as Error).message}`);
      }
    }
    log(`[migrate] schema ${schema} up to date`);
  } finally {
    db.release();
    await pool.end();
  }
}

if (process.argv[1]?.endsWith('migrate.ts')) {
  migrate({ reset: process.argv.includes('--reset') }).catch((e) => { console.error(`[migrate] ${e.message}`); process.exit(1); });
}
