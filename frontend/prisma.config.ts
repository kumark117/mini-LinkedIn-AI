import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Use `process.env` (not `env()` from prisma/config) so unset DATABASE_URL does not throw
 * while loading this file. `prisma generate` works without a real DB; `migrate deploy` needs
 * DATABASE_URL — set it on Render for the Next.js service (same as runtime).
 */
const databaseUrl = process.env.DATABASE_URL?.trim() || '';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: databaseUrl
  }
});

