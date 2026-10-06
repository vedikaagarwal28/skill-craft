// ============================================================================
// Reviews & Ratings Controller
// ============================================================================
// POST /api/contracts/:id/review    - Leave a rating (employer only)
// GET /api/artisans/:id/reviews     - Get artisan reviews (public)
// ============================================================================

import { query } from '../db.js';

/**
 * Post a review for a completed contract
 * POST /api/contracts/:id/review
 * Employer only - leaves feedback for artisan
 */
export const postReview = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only employers can leave reviews' });
    }

    const { id: contractId } = req.params;
    const { ratingStars, feedbackText } = req.body;

    // Validation
    if (!ratingStars || ratingStars < 1 || ratingStars > 5 || !Number.isInteger(ratingStars)) {
      return res.status(400).json({
        error: 'ratingStars must be an integer between 1 and 5',
      });
    }

    if (!contractId || isNaN(contractId)) {
      return res.status(400).json({ error: 'Invalid contract ID' });
    }

    // Get contract and verify ownership
    const contractResult = await query(
      `SELECT cc.*, gp.employer_user_id
       FROM COMPLETION_CONTRACTS cc
       JOIN GIG_POSTINGS gp ON cc.gig_id = gp.gig_id
       WHERE cc.contract_id = $1`,
      [contractId]
    );

    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const contract = contractResult.rows[0];

    if (req.user.role !== 'admin' && req.user.userId !== contract.employer_user_id) {
      return res.status(403).json({
        error: 'Can only review your own contracts',
      });
    }

    if (contract.payment_status !== 'paid') {
      return res.status(409).json({ error: 'Record payment before leaving a review' });
    }

    // Check if review already exists
    const existingReview = await query(
      'SELECT Review_ID FROM RATINGS_REVIEWS WHERE Contract_ID = $1',
      [contractId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(409).json({
        error: 'Review already exists for this contract',
      });
    }

    // Insert review
    const result = await query(
      `INSERT INTO RATINGS_REVIEWS (Contract_ID, Rating_Stars, Feedback_Text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [contractId, ratingStars, feedbackText || null]
    );

    // Note: The trigger will automatically recalculate the artisan's trust score
    res.status(201).json({
      message: 'Review posted successfully. Artisan trust score updated.',
      review: result.rows[0],
    });
  } catch (err) {
    console.error('Error posting review:', err);
    res.status(500).json({ error: 'Failed to post review' });
  }
};

/**
 * Get all reviews for an artisan
 * GET /api/artisans/:id/reviews
 * Public endpoint
 */
export const getArtisanReviews = async (req, res) => {
  try {
    const { id: artisanId } = req.params;

    if (!artisanId || isNaN(artisanId)) {
      return res.status(400).json({ error: 'Invalid artisan ID' });
    }

    // Get artisan
    const artisanResult = await query(
      'SELECT Artisan_ID FROM ARTISANS WHERE Artisan_ID = $1',
      [artisanId]
    );

    if (artisanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan not found' });
    }

    // Get reviews
    const result = await query(
      `SELECT
        rr.review_id,
        rr.rating_stars,
        rr.feedback_text,
        rr.review_date,
        u.full_name as employer_name,
        gp.skill_required,
        cc.final_amount
       FROM RATINGS_REVIEWS rr
       JOIN COMPLETION_CONTRACTS cc ON rr.contract_id = cc.contract_id
       JOIN GIG_POSTINGS gp ON cc.gig_id = gp.gig_id
       JOIN USERS u ON gp.employer_user_id = u.user_id
       WHERE cc.selected_artisan_id = $1
       ORDER BY rr.review_date DESC`,
      [artisanId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};
