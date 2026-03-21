import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7’s `env('DATABASE_URL')` throws if unset — that breaks `prisma generate` in CI
 * when the var isn’t loaded yet. Use a placeholder only so generate can run; `migrate deploy`
 * still needs the real URL (set DATABASE_URL on Render for the Next.js service).
 */
const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  'postgresql://build:build@127.0.0.1:5432/prisma_placeholder';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: databaseUrl
  }
});

