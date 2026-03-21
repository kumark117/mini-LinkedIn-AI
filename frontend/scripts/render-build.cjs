'use strict';

/**
 * Render build: install → generate client → require DATABASE_URL → migrate → next build.
 * Prisma 7 needs DATABASE_URL for `migrate deploy`; it must be set on the Next.js service
 * (link Postgres or paste Internal Database URL in Environment).
 */

const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    cwd: root,
    env: process.env
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run('npm', ['install']);
run('npx', ['prisma', 'generate']);

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    '\n[render-build] DATABASE_URL is missing.\n' +
      'In Render → your Next.js Web Service → Environment:\n' +
      '  • Add DATABASE_URL using your PostgreSQL “Internal Database URL”, or\n' +
      '  • Use “Link database” to attach the same Postgres instance.\n' +
      'Save, then redeploy. (Blueprint users: confirm mini-linkedin-web has DATABASE_URL from the database.)\n'
  );
  process.exit(1);
}

run('npx', ['prisma', 'migrate', 'deploy']);
run('npm', ['run', 'build']);
