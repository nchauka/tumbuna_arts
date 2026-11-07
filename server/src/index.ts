import { createApp } from './app';
import { config } from './config';
import { closePool, getPool } from './db';

const app = createApp();

getPool().query('SELECT current_database() AS db')
  .then((r) => console.log(`[db] connected to ${new URL(config.db.url).hostname}/${r.rows[0].db}, schema ${config.db.schema}`))
  .catch((e) => console.error(`[db] could not connect: ${e.message}. Check DATABASE_URL in .env.`));

const server = app.listen(config.port, () => console.log(`[api] Tumbuna Arts API on http://localhost:${config.port}/api/v1`));

const shutdown = () => server.close(() => closePool().finally(() => process.exit(0)));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
