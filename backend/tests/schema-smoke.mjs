import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PGlite } from '@electric-sql/pglite';

const here = path.dirname(fileURLToPath(import.meta.url));
const database = path.resolve(here, '../../database');
const db = await PGlite.create();

try {
  for (const file of ['01_schema.sql', '02_03_views_triggers_procedures.sql', '05_seed_data.sql', '06_proposal_note.sql', '08_unique_contracts.sql', '09_dbthon_workflow.sql']) {
    await db.exec(await readFile(path.join(database, file), 'utf8'));
  }

  const users = await db.query('SELECT COUNT(*)::int AS count FROM USERS');
  const gigs = await db.query('SELECT COUNT(*)::int AS count FROM GIG_POSTINGS');
  assert.equal(users.rows[0].count, 26);
  assert.equal(gigs.rows[0].count, 20);
  const contractIntegrity = await db.query(`SELECT COUNT(*)::int AS contracts,
    COUNT(DISTINCT Gig_ID)::int AS unique_jobs FROM COMPLETION_CONTRACTS`);
  assert.equal(contractIntegrity.rows[0].contracts, 8);
  assert.equal(contractIntegrity.rows[0].unique_jobs, 8);

  const seeded = await db.query('SELECT Password_Hash FROM USERS WHERE Email = $1', ['lakshmi@skillcraft.local']);
  assert.equal(await bcrypt.compare('password123', seeded.rows[0].password_hash), true);

  const ownership = await db.query(`SELECT COUNT(*)::int AS invalid_count FROM GIG_POSTINGS g
    JOIN USERS u ON u.User_ID = g.Employer_User_ID WHERE u.Role <> 'employer'`);
  assert.equal(ownership.rows[0].invalid_count, 0);

  const trust = await db.query('SELECT Trust_Score FROM ARTISANS WHERE Artisan_ID = 1');
  assert.equal(Number(trust.rows[0].trust_score), 3.5);

  const before = await db.query('SELECT COUNT(*)::int AS count FROM COMPLETION_CONTRACTS WHERE Gig_ID = 5');
  assert.equal(before.rows[0].count, 0);
  await db.query("UPDATE GIG_APPLICATIONS SET Application_Status = 'accepted' WHERE Application_ID = 9");
  const matched = await db.query('SELECT Status FROM GIG_POSTINGS WHERE Gig_ID = 5');
  const contract = await db.query('SELECT COUNT(*)::int AS count FROM COMPLETION_CONTRACTS WHERE Gig_ID = 5');
  const competingBid = await db.query('SELECT Application_Status FROM GIG_APPLICATIONS WHERE Application_ID = 10');
  assert.equal(matched.rows[0].status, 'closed');
  assert.equal(contract.rows[0].count, 1);
  assert.equal(competingBid.rows[0].application_status, 'rejected');

  const legacy = await db.query(`SELECT COUNT(*)::int AS count FROM COMPLETION_CONTRACTS
    WHERE Payment_Status = 'paid' AND Confirmation_Required = FALSE`);
  assert.equal(legacy.rows[0].count, 8);
  const audit = await db.query(`SELECT COUNT(*)::int AS count FROM CONTRACT_EVENTS`);
  assert.ok(audit.rows[0].count >= 9);
  await assert.rejects(db.query('DELETE FROM CONTRACT_EVENTS WHERE Event_ID = 1'), /append-only/);

  const lakshmiId = (await db.query("SELECT User_ID FROM USERS WHERE Email = 'lakshmi@skillcraft.local'")).rows[0].user_id;
  await db.exec('BEGIN');
  try {
    await db.exec('SET LOCAL ROLE skillcraft_runtime');
    await db.query("SELECT set_config('app.user_id', $1, true)", [String(lakshmiId)]);
    await db.query("SELECT set_config('app.user_role', 'artisan', true)");
    const visibleBids = await db.query('SELECT COUNT(*)::int AS count FROM GIG_APPLICATIONS');
    const ownBids = await db.query(`SELECT COUNT(*)::int AS count FROM GIG_APPLICATIONS ga
      JOIN ARTISANS a ON a.Artisan_ID = ga.Artisan_ID WHERE a.User_ID = $1`, [lakshmiId]);
    assert.equal(visibleBids.rows[0].count, ownBids.rows[0].count);
    await assert.rejects(db.query('UPDATE ARTISANS SET Trust_Score = 5 WHERE User_ID = $1', [lakshmiId]), /permission denied/);
  } finally {
    await db.exec('ROLLBACK');
  }

  console.log('Schema, legacy provenance, append-only audit, row ownership, and bid acceptance passed.');
} finally {
  await db.close();
}
