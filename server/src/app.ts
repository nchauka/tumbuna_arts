import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { config } from './config';
import { one } from './db';
import { errorHandler, notFound } from './http';
import { authRouter } from './routes/auth';
import { catalogRouter } from './routes/catalog';
import { certificatesRouter } from './routes/certificates';
import { meRouter } from './routes/me';
import { adminRouter, supportRouter, uploadsRouter } from './routes/misc';
import { ordersRouter } from './routes/orders';
import { studioRouter } from './routes/studio';
import { UPLOAD_DIR } from './services/storage';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // Native apps send no Origin header; browsers (Expo web) must be listed in CORS_ORIGINS.
  app.use(cors({ origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin) || !config.isProd) }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '365d', immutable: true }));

  app.get('/health', async (_req, res) => {
    const db = await one<{ ok: number }>('SELECT 1 AS ok').then(() => 'up', () => 'down');
    res.status(db === 'up' ? 200 : 503).json({ status: db === 'up' ? 'ok' : 'degraded', db });
  });

  const api = express.Router();
  api.use('/auth', authRouter);
  api.use('/me', meRouter);
  api.use('/', catalogRouter);
  api.use('/', ordersRouter);
  api.use('/studio', studioRouter);
  api.use('/certificates', certificatesRouter);
  api.use('/uploads', uploadsRouter);
  api.use('/support', supportRouter);
  api.use('/admin', adminRouter);
  app.use('/api/v1', api);

  app.use((_req, _res, next) => next(notFound('Endpoint')));
  app.use(errorHandler);
  return app;
}
