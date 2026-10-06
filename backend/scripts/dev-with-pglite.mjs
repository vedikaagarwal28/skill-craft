import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectDir = path.resolve(backendDir, '..');
const dataDir = path.join(backendDir, '.test-db', 'marketplace-v2');
await mkdir(path.dirname(dataDir), { recursive: true });
const db = await PGlite.create(dataDir);

const existing = await db.query("SELECT to_regclass('public.users') AS users");
if (!existing.rows[0].users) {
  for (const file of ['01_schema.sql', '02_03_views_triggers_procedures.sql', '05_seed_data.sql', '06_proposal_note.sql', '08_unique_contracts.sql']) {
    await db.exec(await readFile(path.join(projectDir, 'database', file), 'utf8'));
  }
  console.log('Loaded SkillCraft schema and sample accounts.');
} else {
  await db.exec(await readFile(path.join(projectDir, 'database', '06_proposal_note.sql'), 'utf8'));
  await db.exec(await readFile(path.join(projectDir, 'database', '08_unique_contracts.sql'), 'utf8'));
  await db.exec(await readFile(path.join(projectDir, 'database', '02_03_views_triggers_procedures.sql'), 'utf8'));
  await db.query('SELECT recalculate_trust_score(Artisan_ID) FROM ARTISANS');
}

const socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 5433 });
await socket.start();
console.log('Local PostgreSQL-compatible preview database on port 5433.');

const server = spawn(process.execPath, ['src/index.js'], {
  cwd: backendDir,
  env: {
    ...process.env,
    DB_HOST: '127.0.0.1', DB_PORT: '5433', DB_NAME: 'postgres',
    DB_USER: 'postgres', DB_PASSWORD: 'postgres', PORT: '5000',
    DB_POOL_MAX: '1',
    JWT_SECRET: process.env.JWT_SECRET || 'local-preview-key-do-not-use-in-production',
    CORS_ORIGIN: 'http://127.0.0.1:5174',
  },
  stdio: 'inherit',
});

async function stop() {
  if (!server.killed) server.kill('SIGTERM');
  await socket.stop();
  await db.close();
}

process.on('SIGINT', () => { stop().finally(() => process.exit(0)); });
process.on('SIGTERM', () => { stop().finally(() => process.exit(0)); });
server.on('exit', code => { stop().finally(() => process.exit(code || 0)); });
