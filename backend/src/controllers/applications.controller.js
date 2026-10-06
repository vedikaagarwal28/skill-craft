// ============================================================================
// Gig Applications Controller
// ============================================================================
// POST /api/gigs/:gigId/applications  - Submit a bid (artisan only)
// GET /api/applications/mine          - Get own bids (artisan only)
// PATCH /api/applications/:id/accept  - Accept a bid (employer only, TRANSACTION-SAFE)
// PATCH /api/applications/:id/reject  - Reject a bid (employer only)
// ============================================================================

import { query, getClient } from '../db.js';

/**
 * Submit a bid on a gig
 * POST /api/gigs/:gigId/applications
 * Artisan only
 */
export const submitBid = async (req, res) => {
  try {
    const { gigId } = req.params;
    const { bidAmount, note } = req.body;

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'artisan') {
      return res.status(403).json({ error: 'Only artisans can submit bids' });
    }

    // Validation
    if (!Number.isFinite(Number(bidAmount)) || Number(bidAmount) <= 0) {
      return res.status(400).json({ error: 'bidAmount must be > 0' });
    }
    if (note && String(note).length > 500) {
      return res.status(400).json({ error: 'note must be 500 characters or fewer' });
    }

    // Get artisan ID from User_ID
    const artisanResult = await query(
      'SELECT Artisan_ID FROM ARTISANS WHERE User_ID = $1',
      [req.user.userId]
    );

    if (artisanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan profile not found' });
    }

    const artisanId = artisanResult.rows[0].artisan_id;

    // Check if gig exists and is open
    const gigResult = await query(
      'SELECT Gig_ID, Status FROM GIG_POSTINGS WHERE Gig_ID = $1',
      [gigId]
    );

    if (gigResult.rows.length === 0) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    if (gigResult.rows[0].status !== 'open') {
      return res.status(400).json({ error: 'This gig is not open for new bids' });
    }

    // Check if artisan already bid on this gig
    const existingBid = await query(
      'SELECT Application_ID FROM GIG_APPLICATIONS WHERE Gig_ID = $1 AND Artisan_ID = $2',
      [gigId, artisanId]
    );

    if (existingBid.rows.length > 0) {
      return res.status(409).json({ error: 'You have already bid on this gig' });
    }

    // Submit bid
    const result = await query(
      `INSERT INTO GIG_APPLICATIONS (Gig_ID, Artisan_ID, Bid_Amount, Proposal_Note, Application_Status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [gigId, artisanId, Number(bidAmount), note?.trim() || null]
    );

    res.status(201).json({
      message: 'Bid submitted successfully',
      application: result.rows[0],
    });
  } catch (err) {
    console.error('Error submitting bid:', err);
    res.status(500).json({ error: 'Failed to submit bid' });
  }
};

/**
 * Get artisan's own bids
 * GET /api/applications/mine
 * Artisan only
 */
export const getMyBids = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'artisan') {
      return res.status(403).json({ error: 'Only artisans can view own bids' });
    }

    // Get artisan ID
    const artisanResult = await query(
      'SELECT Artisan_ID FROM ARTISANS WHERE User_ID = $1',
      [req.user.userId]
    );

    if (artisanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan profile not found' });
    }

    const artisanId = artisanResult.rows[0].artisan_id;

    // Get all bids for this artisan
    const result = await query(
      `SELECT
        ga.application_id,
        ga.gig_id,
        ga.bid_amount,
        ga.proposal_note,
        ga.application_status,
        ga.applied_at,
        gp.skill_required,
        gp.address,
        gp.budget,
        gp.status as gig_status,
        u.full_name as employer_name
       FROM GIG_APPLICATIONS ga
       JOIN GIG_POSTINGS gp ON ga.gig_id = gp.gig_id
       JOIN USERS u ON gp.employer_user_id = u.user_id
       WHERE ga.artisan_id = $1
       ORDER BY ga.applied_at DESC`,
      [artisanId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching bids:', err);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
};

/**
 * Accept a bid (TRANSACTION-SAFE with row locking)
 * PATCH /api/applications/:id/accept
 * Employer only
 * 
 * This is the critical transaction-safe bid acceptance logic:
 * 1. Use SELECT ... FOR UPDATE to lock the gig row
 * 2. Check if gig is still open (no concurrent accepts)
 * 3. Mark bid as accepted
 * 4. Close gig and auto-reject other bids (via trigger)
 * 5. Commit transaction
 */
export const acceptBid = async (req, res) => {
  let client;
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only employers can accept bids' });
    }

    const { id: applicationId } = req.params;

    if (!applicationId || isNaN(applicationId)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    // Get client from pool for transaction handling
    client = await getClient();

    try {
      // BEGIN TRANSACTION
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

      // Get application details
      const appResult = await client.query(
        `SELECT ga.*, gp.employer_user_id, gp.status as gig_status
         FROM GIG_APPLICATIONS ga
         JOIN GIG_POSTINGS gp ON ga.gig_id = gp.gig_id
         WHERE ga.application_id = $1`,
        [applicationId]
      );

      if (appResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Application not found' });
      }

      const app = appResult.rows[0];

      // Check ownership
      if (req.user.role !== 'admin' && req.user.userId !== app.employer_user_id) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Can only accept bids on own gigs' });
      }

      // CRITICAL: Lock the gig row to prevent concurrent accepts
      // SELECT ... FOR UPDATE blocks until lock is acquired
      const lockResult = await client.query(
        'SELECT Gig_ID, Status FROM GIG_POSTINGS WHERE Gig_ID = $1 FOR UPDATE',
        [app.gig_id]
      );

      if (lockResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Gig not found' });
      }

      const lockedGig = lockResult.rows[0];

      // Check if gig is still open (another accept might have closed it)
      if (lockedGig.status !== 'open') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Gig is no longer open. Another bid may have been accepted.',
          details: `Current status: ${lockedGig.status}`,
        });
      }

      // Check if application is still pending
      if (app.application_status !== 'pending') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Application is not pending (status: ${app.application_status})`,
        });
      }

      // Accept the bid (trigger will handle closing gig and rejecting others)
      const updateResult = await client.query(
        `UPDATE GIG_APPLICATIONS 
         SET Application_Status = 'accepted', Updated_At = CURRENT_TIMESTAMP
         WHERE Application_ID = $1
         RETURNING *`,
        [applicationId]
      );

      // COMMIT TRANSACTION
      await client.query('COMMIT');

      res.json({
        message: 'Bid accepted successfully',
        application: updateResult.rows[0],
        note: 'Gig automatically closed and other pending bids rejected',
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    }
  } catch (err) {
    console.error('Error accepting bid:', err);
    if (err.code === '40001') {
      return res.status(409).json({
        error: 'Serialization conflict - another accept may be in progress. Please retry.',
      });
    }
    res.status(500).json({ error: 'Failed to accept bid' });
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * Reject a bid
 * PATCH /api/applications/:id/reject
 * Employer only
 */
export const rejectBid = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only employers can reject bids' });
    }

    const { id: applicationId } = req.params;

    if (!applicationId || isNaN(applicationId)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    // Get application and check ownership
    const appResult = await query(
      `SELECT ga.*, gp.employer_user_id
       FROM GIG_APPLICATIONS ga
       JOIN GIG_POSTINGS gp ON ga.gig_id = gp.gig_id
       WHERE ga.application_id = $1`,
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const app = appResult.rows[0];

    if (req.user.role !== 'admin' && req.user.userId !== app.employer_user_id) {
      return res.status(403).json({ error: 'Can only reject bids on own gigs' });
    }

    // Reject bid
    const result = await query(
      `UPDATE GIG_APPLICATIONS 
       SET Application_Status = 'rejected', Updated_At = CURRENT_TIMESTAMP
       WHERE Application_ID = $1
       RETURNING *`,
      [applicationId]
    );

    res.json({
      message: 'Bid rejected successfully',
      application: result.rows[0],
    });
  } catch (err) {
    console.error('Error rejecting bid:', err);
    res.status(500).json({ error: 'Failed to reject bid' });
  }
};
