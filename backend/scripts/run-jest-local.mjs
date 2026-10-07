import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseDir = path.resolve(backendDir, '../database');
const jestPath = path.join(backendDir, 'node_modules', 'jest', 'bin', 'jest.js');

// A fresh database/socket per suite keeps their records and pg connections isolated.
for (const suite of ['crud.test.js', 'bidAcceptance.test.js']) {
  const db = await PGlite.create();
  let socket;
  try {
    for (const file of ['01_schema.sql', '02_03_views_triggers_procedures.sql', '06_proposal_note.sql', '08_unique_contracts.sql']) {
      await db.exec(await readFile(path.join(databaseDir, file), 'utf8'));
    }
    socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 5545 });
    await socket.start();

    const child = spawn(process.execPath, [
      '--experimental-vm-modules', jestPath, '--runInBand', `tests/${suite}`,
    ], {
      cwd: backendDir,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DB_HOST: '127.0.0.1',
        DB_PORT: '5545',
        DB_NAME: 'postgres',
        TEST_DB_NAME: 'postgres',
        DB_USER: 'postgres',
        DB_PASSWORD: 'postgres',
        DB_POOL_MAX: '1',
        JWT_SECRET: 'local-jest-test-key',
      },
      stdio: 'inherit',
    });
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', resolve);
    });
    if (code !== 0) {
      process.exitCode = code || 1;
      break;
    }
  } finally {
    await socket?.stop();
    await db.close();
  }
}
