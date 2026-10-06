import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseDir = path.resolve(backendDir, '../database');
const db = await PGlite.create();
let socket;
let server;
let serverLog = '';

async function request(pathname, method = 'GET', body, token, expectedStatus = 200) {
  const response = await fetch(`http://127.0.0.1:5055/api${pathname}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(response.status, expectedStatus, `${method} ${pathname}: ${JSON.stringify(data)}`);
  return data;
}

try {
  for (const file of ['01_schema.sql', '02_03_views_triggers_procedures.sql', '05_seed_data.sql']) {
    await db.exec(await readFile(path.join(databaseDir, file), 'utf8'));
  }
  socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 5544 });
  await socket.start();

  server = spawn(process.execPath, ['src/index.js'], {
    cwd: backendDir,
    env: {
      ...process.env, PORT: '5055', DB_HOST: '127.0.0.1', DB_PORT: '5544',
      DB_NAME: 'postgres', DB_USER: 'postgres', DB_PASSWORD: 'postgres', DB_POOL_MAX: '1',
      JWT_SECRET: 'local-api-test-key',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', chunk => { serverLog += chunk.toString(); });
  server.stderr.on('data', chunk => { serverLog += chunk.toString(); });

  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { const response = await fetch('http://127.0.0.1:5055/health'); if (response.ok) { ready = true; break; } } catch { /* Starting. */ }
    await delay(100);
  }
  assert.ok(ready, `API did not start: ${serverLog}`);

  const employer = await request('/auth/login', 'POST', { identity: 'ramesh@constructionco.in', password: 'password123' });
  const artisan = await request('/auth/login', 'POST', { identity: 'lakshmi@skillcraft.local', password: 'password123' });
  const newcomer = await request('/auth/register', 'POST', {
    fullName: 'Test Weaver', phone: '9990001112', email: 'weaver@test.local',
    password: 'strongpass123', role: 'artisan', skillCategory: 'Handloom weaving',
    baseLocation: 'Pune, Maharashtra', hourlyRate: 320,
  }, undefined, 201);
  assert.equal(newcomer.user.role, 'artisan');
  const newcomerLogin = await request('/auth/login', 'POST', { identity: 'weaver@test.local', password: 'strongpass123' });
  assert.equal(newcomerLogin.user.fullName, 'Test Weaver');
  await request('/auth/register', 'POST', {
    fullName: 'Not Allowed', phone: '9990001113', email: 'admin@test.local',
    password: 'strongpass123', role: 'admin',
  }, undefined, 400);
  const posted = await request('/gigs', 'POST', { skillRequired: 'Handloom weaving', description: 'Create six cotton runners for a local community exhibition.', address: 'Pune, Maharashtra', budget: 6400 }, employer.token, 201);
  const gigId = posted.gig.gig_id;
  const myJobs = await request('/gigs/mine', 'GET', undefined, employer.token);
  assert.ok(myJobs.some(item => item.gig_id === gigId));
  const bid = await request(`/gigs/${gigId}/applications`, 'POST', { bidAmount: 6000, note: 'I can deliver within twelve days.' }, artisan.token, 201);
  await request(`/gigs/${gigId}/applications`, 'POST', { bidAmount: 5900 }, artisan.token, 409);
  const detail = await request(`/gigs/${gigId}`, 'GET', undefined, employer.token);
  assert.equal(detail.applications.length, 1);
  assert.equal(detail.applications[0].proposal_note, 'I can deliver within twelve days.');
  await request(`/applications/${bid.application.application_id}/accept`, 'PATCH', {}, employer.token);
  const contracts = await request('/contracts/mine', 'GET', undefined, employer.token);
  const contract = contracts.find(item => item.gig_id === gigId);
  assert.ok(contract);
  assert.equal(contract.payment_status, 'pending');
  await request(`/contracts/${contract.contract_id}/review`, 'POST', { ratingStars: 5 }, employer.token, 409);
  await request(`/contracts/${contract.contract_id}/pay`, 'PATCH', { paymentStatus: 'paid' }, employer.token);
  await request(`/contracts/${contract.contract_id}/review`, 'POST', { ratingStars: 5, feedbackText: 'Careful work and clear communication.' }, employer.token, 201);
  const artisanContracts = await request('/contracts/mine', 'GET', undefined, artisan.token);
  assert.equal(artisanContracts.find(item => item.gig_id === gigId).rating_stars, 5);
  const profile = await request('/artisans/1');
  assert.equal('phone' in profile, false);
  assert.equal('email' in profile, false);
  console.log('API flow passed: post, bid, accept, pay, review, and private profile fields.');
} catch (error) {
  console.error(error);
  if (serverLog) console.error(serverLog);
  process.exitCode = 1;
} finally {
  if (server && !server.killed) {
    server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), delay(2000)]);
  }
  await socket?.stop();
  await db.close();
}
