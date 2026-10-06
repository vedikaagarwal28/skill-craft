// ============================================================================
// Completion Contracts Controller
// ============================================================================
// GET /api/contracts/mine    - Get own contract history (artisan or employer)
// PATCH /api/contracts/:id/pay - Mark payment as settled (employer only)
// ============================================================================

import { query } from '../db.js';

/**
 * Get own contract history
 * GET /api/contracts/mine
 * Artisan or employer - shows their own contracts
 */
export const getMyContracts = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let sql;
    const params = [req.user.userId];

    if (req.user.role === 'artisan') {
      // Artisan: contracts where they are the selected artisan
      sql = `SELECT
        cc.contract_id,
        cc.gig_id,
        cc.final_amount,
        cc.payment_status,
        cc.completion_timestamp,
        cc.created_at,
        gp.skill_required,
        gp.address,
        u.full_name as employer_name,
        u.phone as partner_phone,
        rr.rating_stars,
        rr.feedback_text
       FROM COMPLETION_CONTRACTS cc
       JOIN GIG_POSTINGS gp ON cc.gig_id = gp.gig_id
       JOIN USERS u ON gp.employer_user_id = u.user_id
       JOIN ARTISANS a ON cc.selected_artisan_id = a.artisan_id
       LEFT JOIN RATINGS_REVIEWS rr ON rr.contract_id = cc.contract_id
       WHERE a.user_id = $1
       ORDER BY cc.created_at DESC`;
    } else if (req.user.role === 'employer') {
      // Employer: contracts on their own gigs
      sql = `SELECT
        cc.contract_id,
        cc.gig_id,
        cc.final_amount,
        cc.payment_status,
        cc.completion_timestamp,
        cc.created_at,
        gp.skill_required,
        gp.address,
        a.user_id as artisan_user_id,
        u.full_name as artisan_name,
        u.phone as partner_phone,
        a.trust_score,
        rr.rating_stars,
        rr.review_date
       FROM COMPLETION_CONTRACTS cc
       JOIN GIG_POSTINGS gp ON cc.gig_id = gp.gig_id
       JOIN ARTISANS a ON cc.selected_artisan_id = a.artisan_id
       JOIN USERS u ON a.user_id = u.user_id
       LEFT JOIN RATINGS_REVIEWS rr ON rr.contract_id = cc.contract_id
       WHERE gp.employer_user_id = $1
       ORDER BY cc.created_at DESC`;
    } else if (req.user.role === 'admin') {
      // Admin: all contracts
      sql = `SELECT
        cc.*,
        gp.skill_required,
        gp.address,
        eu.full_name as employer_name,
        au.full_name as artisan_name
       FROM COMPLETION_CONTRACTS cc
       JOIN GIG_POSTINGS gp ON cc.gig_id = gp.gig_id
       JOIN USERS eu ON gp.employer_user_id = eu.user_id
       JOIN ARTISANS a ON cc.selected_artisan_id = a.artisan_id
       JOIN USERS au ON a.user_id = au.user_id
       ORDER BY cc.created_at DESC`;
      params.pop(); // Admin doesn't need the userId param
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching contracts:', err);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
};

/**
 * Mark payment as settled
 * PATCH /api/contracts/:id/pay
 * Employer only
 */
export const markPaymentSettled = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only employers can mark payments' });
    }

    const { id: contractId } = req.params;
    const { paymentStatus = 'paid' } = req.body;

    if (!['paid', 'disputed'].includes(paymentStatus)) {
      return res.status(400).json({
        error: 'paymentStatus must be "paid" or "disputed"',
      });
    }

    if (!contractId || isNaN(contractId)) {
      return res.status(400).json({ error: 'Invalid contract ID' });
    }

    // Get contract and check ownership
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
        error: 'Can only manage payments for own contracts',
      });
    }

    if (contract.payment_status !== 'pending') {
      return res.status(409).json({ error: 'This payment has already been updated' });
    }

    // Update payment status
    const result = await query(
      `UPDATE COMPLETION_CONTRACTS 
       SET Payment_Status = $1, Updated_At = CURRENT_TIMESTAMP
       WHERE Contract_ID = $2
       RETURNING *`,
      [paymentStatus, contractId]
    );

    res.json({
      message: `Payment marked as ${paymentStatus}`,
      contract: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating payment:', err);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
};
