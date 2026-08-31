// ============================================================================
// Gigs Controller
// ============================================================================
// POST /api/gigs              - Post a new gig (employer only)
// GET /api/gigs               - List open gigs (with optional filters)
// GET /api/gigs/:id           - Get gig detail + applications (auth required)
// PATCH /api/gigs/:id/cancel  - Cancel a gig (employer only)
// ============================================================================

import { query } from '../db.js';

/**
 * Post a new gig
 * POST /api/gigs
 * Employer only
 */
export const postGig = async (req, res) => {
  try {
    const { skillRequired, description, address, budget } = req.body;

    // Validation
    if (!skillRequired || !address || !budget) {
      return res.status(400).json({
        error: 'skillRequired, address, and budget are required',
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
      [req.user.userId, skillRequired, description || null, address, budget]
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
      g.Gig_ID,
      g.Employer_User_ID,
      u.Full_Name as employer_name,
      g.Skill_Required,
      g.Description,
      g.Address,
      g.Budget,
      g.Status,
      g.Posted_Date,
      (SELECT COUNT(*) FROM GIG_APPLICATIONS WHERE Gig_ID = g.Gig_ID AND Application_Status = 'pending') as pending_applications
     FROM GIG_POSTINGS g
     JOIN USERS u ON g.Employer_User_ID = u.User_ID
     WHERE g.Status = 'open'`;

    const params = [];

    if (skillRequired) {
      sql += ` AND g.Skill_Required ILIKE $${params.length + 1}`;
      params.push(`%${skillRequired}%`);
    }

    if (address) {
      sql += ` AND g.Address ILIKE $${params.length + 1}`;
      params.push(`%${address}%`);
    }

    sql += ` ORDER BY g.Posted_Date DESC LIMIT $${params.length + 1}`;
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
        u.Full_Name as employer_name
       FROM GIG_POSTINGS g
       JOIN USERS u ON g.Employer_User_ID = u.User_ID
       WHERE g.Gig_ID = $1`,
      [id]
    );

    if (gigResult.rows.length === 0) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    const gig = gigResult.rows[0];

    // Get applications (only if employer owns this gig or user is admin)
    let applications = [];
    if (req.user && (req.user.userId === gig.Employer_User_ID || req.user.role === 'admin')) {
      const appsResult = await query(
        `SELECT
          ga.Application_ID,
          ga.Gig_ID,
          ga.Artisan_ID,
          ga.Bid_Amount,
          ga.Application_Status,
          ga.Applied_At,
          a.User_ID,
          u.Full_Name,
          a.Skill_Category,
          a.Base_Location,
          a.Trust_Score
         FROM GIG_APPLICATIONS ga
         JOIN ARTISANS a ON ga.Artisan_ID = a.Artisan_ID
         JOIN USERS u ON a.User_ID = u.User_ID
         WHERE ga.Gig_ID = $1
         ORDER BY ga.Applied_At DESC`,
        [id]
      );
      applications = appsResult.rows;
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
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid gig ID' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get gig to check ownership
    const gigResult = await query(
      'SELECT Employer_User_ID FROM GIG_POSTINGS WHERE Gig_ID = $1',
      [id]
    );

    if (gigResult.rows.length === 0) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    const gig = gigResult.rows[0];

    // Check if user is owner (unless admin)
    if (req.user.role !== 'admin' && req.user.userId !== gig.Employer_User_ID) {
      return res.status(403).json({ error: 'Can only cancel own gigs' });
    }

    // Cancel gig
    const result = await query(
      'UPDATE GIG_POSTINGS SET Status = $1, Updated_At = CURRENT_TIMESTAMP WHERE Gig_ID = $2 RETURNING *',
      ['cancelled', id]
    );

    res.json({
      message: 'Gig cancelled successfully',
      gig: result.rows[0],
    });
  } catch (err) {
    console.error('Error cancelling gig:', err);
    res.status(500).json({ error: 'Failed to cancel gig' });
  }
};
