'use strict';

/**
 * Creates the database named in DATABASE_URL if it does not exist.
 * Connects via the same host/user/password but to the maintenance DB `postgres`.
 *
 * Usage (from frontend/):  npm run db:create
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set in frontend/.env');
  process.exit(1);
}

function parseTargetAndAdminUrl(url) {
  const normalized = url.trim().replace(/^postgresql:/i, 'http:');
  const u = new URL(normalized);
  const segment = (u.pathname || '/').replace(/^\//, '').split('/')[0] || '';
  const targetDb = decodeURIComponent(segment);
  if (!targetDb) {
    throw new Error('No database name in DATABASE_URL (path after host:port)');
  }
  u.pathname = '/postgres';
  const adminUrl = 'postgresql:' + u.toString().slice('http:'.length);
  return { targetDb, adminUrl };
}

function quoteIdent(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

async function main() {
  const { targetDb, adminUrl } = parseTargetAndAdminUrl(databaseUrl);

  const client = new Client({
    connectionString: adminUrl,
    connectionTimeoutMillis: 20000
  });

  await client.connect();

  const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDb]);
  if (rows.length > 0) {
    console.log('Database already exists:', targetDb);
    await client.end();
    return;
  }

  await client.query(`CREATE DATABASE ${quoteIdent(targetDb)}`);
  console.log('Created database:', targetDb);
  await client.end();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
