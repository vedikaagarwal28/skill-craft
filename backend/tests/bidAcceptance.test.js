// ============================================================================
// Backend Tests: Concurrent Bid Acceptance (Transaction Safety)
// ============================================================================
// Integration check: the combined transaction, row lock, trigger, and unique
// constraint allow only one contract for a gig. A 409 response alone does not
// prove which concurrency mechanism rejected the losing request.
//
// Scenario:
// 1. Create a gig
// 2. Have TWO artisans bid on the same gig
// 3. Simulate employer accepting bids from BOTH artisans concurrently
// 4. Assert that EXACTLY ONE succeeds and the other is rejected
// 5. Verify gig is closed and only one contract exists
//
// This directly tests the course requirement:
// "Transaction-safe bid acceptance using SELECT ... FOR UPDATE row locking"
// ============================================================================

import request from 'supertest';
import app from '../src/index.js';
import { query, closePool } from '../src/db.js';

process.env.NODE_ENV = 'test';

describe('SkillCraft API - Concurrent Bid Acceptance (Transaction Safety)', () => {
  let employerToken;
  let artisan1Token;
  let artisan2Token;
  let gigId;
  let application1Id;
  let application2Id;

  beforeAll(async () => {
    console.log('Starting concurrency tests (row locking validation)...');

    // Register employer
    const empRes = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Concurrency Employer',
        phone: '7777777777',
        email: 'emp@concurrency.test',
        password: 'testpass123',
        role: 'employer',
      });
    employerToken = empRes.body.token;

    // Register first artisan
    const art1Res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Concurrent Artisan 1',
        phone: '6666666666',
        email: 'art1@concurrency.test',
        password: 'testpass123',
        role: 'artisan',
        skillCategory: 'Electrical Work',
        baseLocation: 'Test City 1',
        hourlyRate: 300,
      });
    artisan1Token = art1Res.body.token;

    // Register second artisan
    const art2Res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Concurrent Artisan 2',
        phone: '5555555555',
        email: 'art2@concurrency.test',
        password: 'testpass123',
        role: 'artisan',
        skillCategory: 'Electrical Work',
        baseLocation: 'Test City 2',
        hourlyRate: 280,
      });
    artisan2Token = art2Res.body.token;

    // Employer posts a gig
    const gigRes = await request(app)
      .post('/api/gigs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        skillRequired: 'Electrical Work',
        description: 'Install wiring for new office',
        address: 'Test Building',
        budget: 8000,
      });
    gigId = gigRes.body.gig.gig_id;

    // First artisan submits bid
    const bid1Res = await request(app)
      .post(`/api/gigs/${gigId}/applications`)
      .set('Authorization', `Bearer ${artisan1Token}`)
      .send({ bidAmount: 7500 });
    application1Id = bid1Res.body.application.application_id;

    // Second artisan submits bid
    const bid2Res = await request(app)
      .post(`/api/gigs/${gigId}/applications`)
      .set('Authorization', `Bearer ${artisan2Token}`)
      .send({ bidAmount: 7200 });
    application2Id = bid2Res.body.application.application_id;

    console.log(`  Setup complete: Gig ${gigId}, App1 ${application1Id}, App2 ${application2Id}`);
  });

  afterAll(async () => {
    await closePool();
    console.log('Concurrency tests completed');
  });

  /**
   * CRITICAL TEST: Two concurrent bid acceptances
   */
  test('Concurrent Accept #1 and #2 - Exactly ONE succeeds, ONE fails', async () => {
    // Fire TWO concurrent accept requests
    // Using Promise.all to simulate concurrent behavior
    const acceptPromises = [
      request(app)
        .patch(`/api/applications/${application1Id}/accept`)
        .set('Authorization', `Bearer ${employerToken}`),
      request(app)
        .patch(`/api/applications/${application2Id}/accept`)
        .set('Authorization', `Bearer ${employerToken}`),
    ];

    const results = await Promise.all(acceptPromises);

    console.log(`  Accept #1 status: ${results[0].status}`);
    console.log(`  Accept #2 status: ${results[1].status}`);

    // Exactly one should succeed (200), one should conflict (409)
    const statuses = [results[0].status, results[1].status];
    const hasSuccess = statuses.includes(200);
    const hasConflict = statuses.includes(409);

    // ASSERTION: One succeeds, one fails
    expect(hasSuccess).toBe(true);
    expect(hasConflict).toBe(true);
    expect(statuses.filter((s) => s === 200).length).toBe(1);
    expect(statuses.filter((s) => s === 409).length).toBe(1);

    console.log('  ✓ Exactly one concurrent accept succeeded');
  });

  /**
   * Verify gig is closed (only one winner)
   */
  test('Gig is closed after one accept succeeds', async () => {
    const gigRes = await query('SELECT Status FROM GIG_POSTINGS WHERE Gig_ID = $1', [gigId]);
    expect(gigRes.rows[0].status).toBe('closed');
    console.log('  ✓ Gig properly closed after single accept');
  });

  /**
   * Verify only ONE contract exists
   */
  test('Only ONE contract created (no double-booking)', async () => {
    const contractRes = await query(
      'SELECT Contract_ID FROM COMPLETION_CONTRACTS WHERE Gig_ID = $1',
      [gigId]
    );

    expect(contractRes.rows.length).toBe(1);
    console.log('  ✓ Exactly one contract created - no double-booking');
  });

  /**
   * Verify rejected bid has correct status
   */
  test('Losing bid is rejected by trigger', async () => {
    const appsRes = await query(
      `SELECT Application_ID, Application_Status FROM GIG_APPLICATIONS 
       WHERE Gig_ID = $1 ORDER BY Application_ID`,
      [gigId]
    );

    expect(appsRes.rows.length).toBe(2);

    const statusCounts = {
      accepted: appsRes.rows.filter((r) => r.application_status === 'accepted').length,
      rejected: appsRes.rows.filter((r) => r.application_status === 'rejected').length,
    };

    expect(statusCounts.accepted).toBe(1);
    expect(statusCounts.rejected).toBe(1);
    console.log('  ✓ One bid accepted, one auto-rejected by trigger');
  });

});
