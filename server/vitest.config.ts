import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Uploads go to ./uploads in tests, so the Supabase Storage keys are blanked.
    env: { NODE_ENV: 'test', DB_SCHEMA: 'tumbuna_test', PUBLIC_URL: 'http://localhost:4000', SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' },
    testTimeout: 30_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
