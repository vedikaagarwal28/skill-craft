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
        cc.employer_paid_at,
        cc.artisan_received_at,
        cc.confirmation_required,
        cc.completion_timestamp,
        cc.created_at,
        gp.skill_required,
        gp.address,
        u.full_name as employer_name,
        contract_partner_phone(u.user_id) as partner_phone,
        rr.rating_stars,
        rr.feedback_text,
        er.rating_stars AS employer_rating_stars
       FROM COMPLETION_CONTRACTS cc
       JOIN GIG_POSTINGS gp ON cc.gig_id = gp.gig_id
       JOIN USERS u ON gp.employer_user_id = u.user_id
       JOIN ARTISANS a ON cc.selected_artisan_id = a.artisan_id
       LEFT JOIN RATINGS_REVIEWS rr ON rr.contract_id = cc.contract_id
       LEFT JOIN EMPLOYER_REVIEWS er ON er.contract_id = cc.contract_id
       WHERE a.user_id = $1
       ORDER BY cc.created_at DESC`;
    } else if (req.user.role === 'employer') {
      // Employer: contracts on their own gigs
      sql = `SELECT
        cc.contract_id,
        cc.gig_id,
        cc.final_amount,
        cc.payment_status,
        cc.employer_paid_at,
        cc.artisan_received_at,
        cc.confirmation_required,
        cc.completion_timestamp,
        cc.created_at,
        gp.skill_required,
        gp.address,
        a.user_id as artisan_user_id,
        u.full_name as artisan_name,
        contract_partner_phone(u.user_id) as partner_phone,
        a.trust_score,
        rr.rating_stars,
        rr.review_date,
        er.rating_stars AS employer_rating_stars
       FROM COMPLETION_CONTRACTS cc
       JOIN GIG_POSTINGS gp ON cc.gig_id = gp.gig_id
       JOIN ARTISANS a ON cc.selected_artisan_id = a.artisan_id
       JOIN USERS u ON a.user_id = u.user_id
       LEFT JOIN RATINGS_REVIEWS rr ON rr.contract_id = cc.contract_id
       LEFT JOIN EMPLOYER_REVIEWS er ON er.contract_id = cc.contract_id
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

    if (req.user.role !== 'employer') {
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

    const functionName = paymentStatus === 'disputed'
      ? 'dispute_contract_payment' : 'record_employer_payment';
    const result = await query(`SELECT * FROM ${functionName}($1)`, [contractId]);

    res.json({
      message: paymentStatus === 'paid'
        ? 'Payment sent recorded; awaiting artisan receipt confirmation'
        : 'Payment dispute recorded',
      contract: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating payment:', err);
    res.status(err.code === 'P0002' ? 404 : err.code === '42501' ? 403 : err.code === 'P0001' ? 409 : 500)
      .json({ error: err.code === 'P0002' || err.code === '42501' || err.code === 'P0001'
        ? err.message : 'Failed to update payment status' });
  }
};

/** The selected artisan acknowledges receiving payment; this is not bank verification. */
export const confirmReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid contract ID' });
    const result = await query('SELECT * FROM confirm_artisan_receipt($1)', [id]);
    res.json({ message: 'Receipt confirmed by artisan', contract: result.rows[0] });
  } catch (err) {
    console.error('Error confirming receipt:', err);
    res.status(err.code === 'P0002' ? 404 : err.code === '42501' ? 403 : err.code === 'P0001' ? 409 : 500)
      .json({ error: err.code === 'P0002' || err.code === '42501' || err.code === 'P0001'
        ? err.message : 'Failed to confirm receipt' });
  }
};

/** Parties to a contract can inspect its append-only database history. */
export const getContractEvents = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || isNaN(id)) return res.status(400).json({ error: 'Invalid contract ID' });
    const contract = await query('SELECT Contract_ID FROM COMPLETION_CONTRACTS WHERE Contract_ID = $1', [id]);
    if (!contract.rows.length) return res.status(404).json({ error: 'Contract not found' });
    const events = await query(
      'SELECT Event_ID, Contract_ID, Actor_User_ID, Event_Type, Event_Detail, Created_At FROM CONTRACT_EVENTS WHERE Contract_ID = $1 ORDER BY Event_ID',
      [id]
    );
    res.json(events.rows);
  } catch (err) {
    console.error('Error reading contract history:', err);
    res.status(500).json({ error: 'Failed to read contract history' });
  }
};
