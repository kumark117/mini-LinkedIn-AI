'use strict';

/**
 * npm run dev:
 * - If DATABASE_URL is unreachable → create DB if needed, then `prisma migrate deploy`.
 * - If DB is reachable → `prisma migrate deploy` only (applies pending migrations; does not wipe data).
 * - Start the custom server (tsx server.ts).
 *
 * Full purge + migrations: use /admin/reset-db or `npx prisma migrate reset --force` manually.
 */
const path = require('path');
const { spawnSync, spawn } = require('child_process');
const { Client } = require('pg');

const root = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });

function logDev(...parts) {
  console.log('[dev]', ...parts);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is missing in frontend/.env');
  process.exit(1);
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: process.env
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

async function canConnect() {
  const c = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000
  });
  try {
    await c.connect();
    await c.query('SELECT 1');
    await c.end();
    return true;
  } catch {
    try {
      await c.end();
    } catch {
      /* ignore */
    }
    return false;
  }
}

async function main() {
  const ok = await canConnect();

  if (!ok) {
    logDev('Database unreachable or missing — creating database if needed, then applying all migrations…');
    run('node', ['scripts/create-database.cjs']);
    run('npx', ['prisma', 'migrate', 'deploy']);
  } else {
    logDev('Database online — applying pending migrations (if any)…');
    run('npx', ['prisma', 'migrate', 'deploy']);
  }

  logDev('Starting server…');
  const child = spawn('npx', ['tsx', 'server.ts'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: process.env
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
