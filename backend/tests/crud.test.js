// ============================================================================
// Backend Tests: CRUD Operations
// ============================================================================
// Tests basic happy-path workflows:
// 1. Register as artisan and employer
// 2. Login
// 3. Post a gig
// 4. Submit a bid
// 5. Accept a bid
// 6. Leave a review (triggers trust score recalc)
// ============================================================================

import request from 'supertest';
import app from '../src/index.js';
import { query, closePool } from '../src/db.js';

// Set test environment
process.env.NODE_ENV = 'test';

describe('SkillCraft API - CRUD Tests', () => {
  let artisanToken;
  let employerToken;
  let artisanUserId;
  let artisanId;
  let employerUserId;
  let gigId;
  let applicationId;
  let contractId;

  /**
   * Setup: Register test users
   */
  beforeAll(async () => {
    // Clear test data (optional - for isolation)
    // await query('TRUNCATE TABLE ratings_reviews CASCADE');
    // await query('TRUNCATE TABLE completion_contracts CASCADE');
    // etc...

    console.log('Starting CRUD tests...');
  });

  /**
   * Cleanup
   */
  afterAll(async () => {
    await closePool();
    console.log('CRUD tests completed');
  });

  // =========================================================================
  // Test 1: Register as Artisan
  // =========================================================================
  test('1.1 - Register artisan user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Test Artisan',
        phone: '9999999999',
        email: 'artisan@test.local',
        password: 'testpass123',
        role: 'artisan',
        skillCategory: 'Handloom Weaving',
        baseLocation: 'Test Town, State',
        regionLanguage: 'Hindi',
        hourlyRate: 250,
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('artisan');

    artisanToken = res.body.token;
    artisanUserId = res.body.user.userId;
  });

  test('1.2 - Artisan login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        phone: '9999999999',
        password: 'testpass123',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('artisan');
  });

  test('1.3 - Get artisan profile', async () => {
    // First, get artisan ID from DB
    const result = await query(
      'SELECT Artisan_ID FROM ARTISANS WHERE User_ID = $1',
      [artisanUserId]
    );
    artisanId = result.rows[0].artisan_id;

    const res = await request(app).get(`/api/artisans/${artisanId}`);

    expect(res.status).toBe(200);
    expect(res.body.skill_category).toBe('Handloom Weaving');
    expect(res.body.trust_score).toBeDefined();
  });

  // =========================================================================
  // Test 2: Register as Employer
  // =========================================================================
  test('2.1 - Register employer user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Test Employer',
        phone: '8888888888',
        email: 'employer@test.local',
        password: 'testpass123',
        role: 'employer',
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('employer');

    employerToken = res.body.token;
    employerUserId = res.body.user.userId;
  });

  // =========================================================================
  // Test 3: Post a Gig
  // =========================================================================
  test('3.1 - Employer posts a gig', async () => {
    const res = await request(app)
      .post('/api/gigs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        skillRequired: 'Handloom Weaving',
        description: 'Weave 5 traditional scarves',
        address: 'Test Town, State',
        budget: 5000,
      });

    expect(res.status).toBe(201);
    expect(res.body.gig.status).toBe('open');
    expect(Number(res.body.gig.budget)).toBe(5000);

    gigId = res.body.gig.gig_id;
  });

  test('3.2 - List open gigs', async () => {
    const res = await request(app)
      .get('/api/gigs?skillRequired=Handloom%20Weaving')
      .set('Authorization', `Bearer ${artisanToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // Test 4: Submit a Bid
  // =========================================================================
  test('4.1 - Artisan submits a bid', async () => {
    const res = await request(app)
      .post(`/api/gigs/${gigId}/applications`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        bidAmount: 4800,
      });

    expect(res.status).toBe(201);
    expect(res.body.application.application_status).toBe('pending');
    expect(Number(res.body.application.bid_amount)).toBe(4800);

    applicationId = res.body.application.application_id;
  });

  test('4.2 - Artisan cannot bid twice on same gig', async () => {
    const res = await request(app)
      .post(`/api/gigs/${gigId}/applications`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        bidAmount: 4600,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already bid');
  });

  test('4.3 - Get artisan\'s bids', async () => {
    const res = await request(app)
      .get('/api/applications/mine')
      .set('Authorization', `Bearer ${artisanToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(Number(res.body[0].bid_amount)).toBe(4800);
  });

  // =========================================================================
  // Test 5: Accept Bid (Non-concurrent)
  // =========================================================================
  test('5.1 - Employer accepts a bid', async () => {
    const res = await request(app)
      .patch(`/api/applications/${applicationId}/accept`)
      .set('Authorization', `Bearer ${employerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.application.application_status).toBe('accepted');
  });

  test('5.2 - Gig is now closed', async () => {
    const res = await request(app)
      .get(`/api/gigs/${gigId}`)
      .set('Authorization', `Bearer ${employerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.gig.status).toBe('closed');
  });

  test('5.3 - Contract created', async () => {
    const contractResult = await query(
      'SELECT Contract_ID FROM COMPLETION_CONTRACTS WHERE Gig_ID = $1',
      [gigId]
    );

    expect(contractResult.rows.length).toBe(1);
    contractId = contractResult.rows[0].contract_id;
  });

  // =========================================================================
  // Test 6: Payment & Review
  // =========================================================================
  test('6.1 - Employer records payment sent', async () => {
    const res = await request(app)
      .patch(`/api/contracts/${contractId}/pay`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        paymentStatus: 'paid',
      });

    expect(res.status).toBe(200);
    expect(res.body.contract.payment_status).toBe('pending');
    expect(res.body.contract.employer_paid_at).toBeTruthy();
  });

  test('6.1b - Artisan confirms receipt', async () => {
    const res = await request(app)
      .patch(`/api/contracts/${contractId}/confirm-receipt`)
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(res.status).toBe(200);
    expect(res.body.contract.payment_status).toBe('paid');
    expect(res.body.contract.artisan_received_at).toBeTruthy();
  });

  test('6.2 - Employer leaves a review', async () => {
    const res = await request(app)
      .post(`/api/contracts/${contractId}/review`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        ratingStars: 5,
        feedbackText: 'Excellent work! Very professional.',
      });

    expect(res.status).toBe(201);
    expect(res.body.review.rating_stars).toBe(5);
  });

  test('6.3 - Trust score updated via trigger', async () => {
    const result = await query(
      'SELECT Trust_Score FROM ARTISANS WHERE Artisan_ID = $1',
      [artisanId]
    );

    const updatedTrustScore = Number(result.rows[0].trust_score);
    expect(updatedTrustScore).toBeGreaterThan(0);
    console.log(`  Trust score updated to: ${updatedTrustScore}`);
  });

  test('6.4 - Get artisan reviews', async () => {
    const res = await request(app).get(`/api/artisans/${artisanId}/reviews`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].rating_stars).toBe(5);
  });

  // =========================================================================
  // Test 7: Dashboard
  // =========================================================================
  test('7.1 - Get top rated artisans', async () => {
    const res = await request(app).get('/api/dashboard/top-artisans');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('7.2 - Get skill earnings view', async () => {
    const res = await request(app).get('/api/dashboard/skill-earnings');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('7.3 - Get open gigs view', async () => {
    const res = await request(app).get('/api/dashboard/open-gigs');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
