import 'dotenv/config';

const required = (name: string, fallback?: string) => {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') throw new Error(`Missing environment variable ${name}. Copy .env.example to .env and fill it in.`);
  return v;
};

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  isProd,
  isTest,
  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`).replace(/\/$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  db: {
    /** Supabase → Project Settings → Database → Connection string (session pooler or direct). */
    url: required('DATABASE_URL'),
    /** Postgres schema holding the tables. Kept out of `public` so Supabase's REST API doesn't expose them. */
    schema: required('DB_SCHEMA', isTest ? 'tumbuna_test' : 'tumbuna'),
  },
  jwt: {
    secret: isProd ? required('JWT_SECRET') : process.env.JWT_SECRET || 'dev-only-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  },
  supabase: {
    // Accepts the project URL with or without the /rest/v1 suffix the dashboard shows.
    url: (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '').replace(/\/rest\/v1$/, ''),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    bucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'tumbuna-media',
  },
  /** Business rules shared with the app. */
  rules: {
    commission: 0.1,
    permitFeeToea: 30_00,
    resetCodeMinutes: 15,
  },
};
