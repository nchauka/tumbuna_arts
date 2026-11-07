import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import pg from 'pg';

import { config } from './config';

// COUNT/SUM return BIGINT and AVG/DECIMAL return NUMERIC, which pg hands back as strings. Every value here fits a JS number.
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => Number(v));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => Number(v));

export type Runner = pg.Pool | pg.PoolClient;
type Params = Record<string, unknown>;

/**
 * Connection settings whose sessions resolve unqualified table names in `schema` (set at startup, which
 * Supabase's session pooler honours). Supabase needs TLS; its pooler certificate isn't in Node's default CA bundle.
 */
export function poolConfig(schema = config.db.schema): pg.PoolConfig {
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error(`DB_SCHEMA must be a lowercase identifier, got "${schema}"`);
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(config.db.url);
  return { connectionString: config.db.url, ssl: local ? undefined : { rejectUnauthorized: false }, options: `-c search_path=${schema}`, max: 10, idleTimeoutMillis: 30_000 };
}

export function createPool(schema = config.db.schema) {
  const pool = new pg.Pool(poolConfig(schema));
  pool.on('error', (e) => console.error(`[db] idle client error: ${e.message}`));
  return pool;
}

let pool: pg.Pool | null = null;

export function getPool() {
  pool ??= createPool();
  return pool;
}

export async function closePool() {
  if (pool) {
    const p = pool;
    pool = null;
    await p.end();
  }
}

// ——— identifier case ———
// Postgres folds unquoted identifiers to lowercase, but rows are read as `row.ArtistId`. Column names are
// collected from the migrations, and `AS Alias` names from each query, to restore the original casing.

const SCHEMA_COLUMNS = new Map<string, string>();
const SQL_DIR = path.resolve(import.meta.dirname, '../sql');
for (const f of readdirSync(SQL_DIR).filter((f) => f.endsWith('.sql'))) {
  for (const m of readFileSync(path.join(SQL_DIR, f), 'utf8').matchAll(/^\s+"?([A-Za-z]\w*)"?\s+(?:VARCHAR|TEXT|INT|SMALLINT|BOOLEAN|TIMESTAMPTZ|NUMERIC|CHAR|UUID)\b/gm)) {
    const name = m[1] === 'where' ? 'Where' : m[1];
    SCHEMA_COLUMNS.set(name.toLowerCase(), name);
  }
}

const caseCache = new Map<string, Map<string, string>>();
function caseMap(text: string) {
  let map = caseCache.get(text);
  if (!map) {
    map = new Map(SCHEMA_COLUMNS);
    for (const m of text.matchAll(/\bAS\s+([A-Za-z]\w*)/gi)) map.set(m[1].toLowerCase(), m[1]);
    caseCache.set(text, map);
  }
  return map;
}

/** Rewrites `@name` parameters to `$n`, reusing the same position for repeated names. */
const compiled = new Map<string, { text: string; names: string[] }>();
function compile(text: string) {
  let c = compiled.get(text);
  if (!c) {
    const names: string[] = [];
    const out = text.replace(/@([A-Za-z_]\w*)/g, (_, name: string) => {
      let i = names.indexOf(name);
      if (i < 0) i = names.push(name) - 1;
      return `$${i + 1}`;
    });
    c = { text: out, names };
    compiled.set(text, c);
  }
  return c;
}

async function run(text: string, params: Params, runner?: Runner) {
  const c = compile(text);
  const values = c.names.map((n) => {
    if (!(n in params)) throw new Error(`Missing SQL parameter @${n}`);
    const v = params[n];
    return v === undefined ? null : v;
  });
  return (runner ?? getPool()).query(c.text, values);
}

export async function query<T = Record<string, unknown>>(text: string, params: Params = {}, runner?: Runner): Promise<T[]> {
  const res = await run(text, params, runner);
  if (!res.rows.length) return [];
  const map = caseMap(text);
  const keys = res.fields.map((f) => [f.name, map.get(f.name) ?? f.name] as const);
  return res.rows.map((r) => Object.fromEntries(keys.map(([from, to]) => [to, r[from]])) as T);
}

export async function one<T = Record<string, unknown>>(text: string, params: Params = {}, runner?: Runner): Promise<T | undefined> {
  return (await query<T>(text, params, runner))[0];
}

export async function exec(text: string, params: Params = {}, runner?: Runner): Promise<number> {
  return (await run(text, params, runner)).rowCount ?? 0;
}

/** Runs `fn` in a transaction (READ COMMITTED); rolls back on any thrown error. Queries on it must be sequential. */
export async function tx<T>(fn: (t: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* connection lost */ }
    throw e;
  } finally {
    client.release();
  }
}

/** Builds `@p0, @p1…` placeholders for an IN list and merges them into params. */
export function inList(values: readonly unknown[], params: Params, prefix = 'p') {
  return values.map((v, i) => { params[`${prefix}${i}`] = v; return `@${prefix}${i}`; }).join(', ');
}
