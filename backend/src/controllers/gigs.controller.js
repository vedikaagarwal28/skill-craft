// ============================================================================
// Gigs Controller
// ============================================================================
// POST /api/gigs              - Post a new gig (employer only)
// GET /api/gigs               - List open gigs (with optional filters)
// GET /api/gigs/:id           - Get gig detail + applications (auth required)
// PATCH /api/gigs/:id/cancel  - Cancel a gig (employer only)
// ============================================================================

import { query, getClient } from '../db.js';

/** Jobs owned by the signed-in employer, including matched and cancelled work. */
export const getMyGigs = async (req, res) => {
  try {
    const result = await query(
      `SELECT g.*, u.full_name AS employer_name,
        (SELECT COUNT(*) FROM GIG_APPLICATIONS a WHERE a.gig_id = g.gig_id AND a.application_status = 'pending') AS pending_applications
       FROM GIG_POSTINGS g
       JOIN USERS u ON u.user_id = g.employer_user_id
       WHERE g.employer_user_id = $1
       ORDER BY g.posted_date DESC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing employer gigs:', err);
    res.status(500).json({ error: 'Failed to list your jobs' });
  }
};

/**
 * Post a new gig
 * POST /api/gigs
 * Employer only
 */
export const postGig = async (req, res) => {
  try {
    const { skillRequired, description, address, budget } = req.body;

    // Validation
    if (!skillRequired || !address || !description || description.trim().length < 25 || !Number.isFinite(Number(budget))) {
      return res.status(400).json({
        error: 'A skill, location, description of at least 25 characters, and budget are required',
      });
    }

    if (budget <= 0) {
      return res.status(400).json({ error: 'budget must be > 0' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Create gig
    const result = await query(
      `INSERT INTO GIG_POSTINGS 
       (Employer_User_ID, Skill_Required, Description, Address, Budget, Status)
       VALUES ($1, $2, $3, $4, $5, 'open')
       RETURNING *`,
      [req.user.userId, skillRequired.trim(), description.trim(), address.trim(), Number(budget)]
    );

    res.status(201).json({
      message: 'Gig posted successfully',
      gig: result.rows[0],
    });
  } catch (err) {
    console.error('Error posting gig:', err);
    res.status(500).json({ error: 'Failed to post gig' });
  }
};

/**
 * List open gigs with optional filters
 * GET /api/gigs?skillRequired=...&address=...
 * Public endpoint
 */
export const listGigs = async (req, res) => {
  try {
    const { skillRequired, address, limit = 50 } = req.query;

    let sql = `SELECT
      g.gig_id,
      g.employer_user_id,
      u.full_name as employer_name,
      g.skill_required,
      g.description,
      g.address,
      g.budget,
      g.status,
      g.posted_date,
      (SELECT COUNT(*) FROM GIG_APPLICATIONS WHERE Gig_ID = g.gig_id AND Application_Status = 'pending') as pending_applications
     FROM GIG_POSTINGS g
     JOIN USERS u ON g.employer_user_id = u.user_id
     WHERE g.status = 'open'`;

    const params = [];

    if (skillRequired) {
      sql += ` AND g.skill_required ILIKE $${params.length + 1}`;
      params.push(`%${skillRequired}%`);
    }

    if (address) {
      sql += ` AND g.address ILIKE $${params.length + 1}`;
      params.push(`%${address}%`);
    }

    sql += ` ORDER BY g.posted_date DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit) || 50);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing gigs:', err);
    res.status(500).json({ error: 'Failed to list gigs' });
  }
};

/**
 * Get gig detail with applications
 * GET /api/gigs/:id
 * Auth required (employer can see own applications, artisans see basic info)
 */
export const getGigDetail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid gig ID' });
    }

    // Get gig info
    const gigResult = await query(
      `SELECT
        g.*,
        u.full_name as employer_name
       FROM GIG_POSTINGS g
       JOIN USERS u ON g.employer_user_id = u.user_id
       WHERE g.gig_id = $1`,
      [id]
    );

    if (gigResult.rows.length === 0) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    const gig = gigResult.rows[0];

    // Get applications (only if employer owns this gig or user is admin)
    let applications = [];
    if (req.user && (req.user.userId === gig.employer_user_id || req.user.role === 'admin')) {
      const appsResult = await query(
        `SELECT
          ga.application_id,
          ga.gig_id,
          ga.artisan_id,
          ga.bid_amount,
          ga.proposal_note,
          ga.application_status,
          ga.applied_at,
          a.user_id,
          u.full_name,
          a.skill_category,
          a.base_location,
          a.trust_score
         FROM GIG_APPLICATIONS ga
         JOIN ARTISANS a ON ga.artisan_id = a.artisan_id
         JOIN USERS u ON a.user_id = u.user_id
         WHERE ga.gig_id = $1
         ORDER BY ga.applied_at DESC`,
        [id]
      );
      applications = appsResult.rows;
    } else if (req.user?.role === 'artisan') {
      const ownBid = await query(
        `SELECT ga.Application_ID, ga.Gig_ID, ga.Artisan_ID, ga.Bid_Amount,
                ga.Proposal_Note, ga.Application_Status, ga.Applied_At
         FROM GIG_APPLICATIONS ga
         JOIN ARTISANS a ON a.Artisan_ID = ga.Artisan_ID
         WHERE ga.Gig_ID = $1 AND a.User_ID = $2`,
        [id, req.user.userId]
      );
      applications = ownBid.rows;
    }

    res.json({
      gig,
      applications,
    });
  } catch (err) {
    console.error('Error fetching gig:', err);
    res.status(500).json({ error: 'Failed to fetch gig' });
  }
};

/**
 * Cancel a gig
 * PATCH /api/gigs/:id/cancel
 * Employer only (can only cancel own gigs)
 */
export const cancelGig = async (req, res) => {
  let client;
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid gig ID' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    client = await getClient();
    await client.query('BEGIN');

    // Serialize cancellation with bid acceptance on the same gig row.
    const gigResult = await client.query(
      'SELECT Employer_User_ID, Status FROM GIG_POSTINGS WHERE Gig_ID = $1 FOR UPDATE',
      [id]
    );

    if (gigResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Gig not found' });
    }

    const gig = gigResult.rows[0];

    // Check if user is owner (unless admin)
    if (req.user.role !== 'admin' && req.user.userId !== gig.employer_user_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Can only cancel own gigs' });
    }

    if (gig.status !== 'open') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Only open jobs can be cancelled' });
    }

    const result = await client.query(
      "UPDATE GIG_POSTINGS SET Status = 'cancelled', Updated_At = CURRENT_TIMESTAMP WHERE Gig_ID = $1 RETURNING *",
      [id]
    );
    await client.query(
      `UPDATE GIG_APPLICATIONS
       SET Application_Status = 'rejected', Updated_At = CURRENT_TIMESTAMP
       WHERE Gig_ID = $1 AND Application_Status = 'pending'`,
      [id]
    );
    await client.query('COMMIT');

    res.json({
      message: 'Gig cancelled successfully',
      gig: result.rows[0],
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Error cancelling gig:', err);
    res.status(err.code === '40001' ? 409 : 500).json({
      error: err.code === '40001' ? 'Job changed while cancelling; please try again' : 'Failed to cancel gig',
    });
  } finally {
    client?.release();
  }
};
