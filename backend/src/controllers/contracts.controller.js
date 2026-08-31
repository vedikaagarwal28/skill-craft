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
        cc.Contract_ID,
        cc.Gig_ID,
        cc.Final_Amount,
        cc.Payment_Status,
        cc.Completion_Timestamp,
        cc.Created_At,
        gp.Skill_Required,
        gp.Address,
        u.Full_Name as employer_name,
        rr.Rating_Stars,
        rr.Feedback_Text
       FROM COMPLETION_CONTRACTS cc
       JOIN GIG_POSTINGS gp ON cc.Gig_ID = gp.Gig_ID
       JOIN USERS u ON gp.Employer_User_ID = u.User_ID
       JOIN ARTISANS a ON cc.Selected_Artisan_ID = a.Artisan_ID
       LEFT JOIN RATINGS_REVIEWS rr ON rr.Contract_ID = cc.Contract_ID
       WHERE a.User_ID = $1
       ORDER BY cc.Created_At DESC`;
    } else if (req.user.role === 'employer') {
      // Employer: contracts on their own gigs
      sql = `SELECT
        cc.Contract_ID,
        cc.Gig_ID,
        cc.Final_Amount,
        cc.Payment_Status,
        cc.Completion_Timestamp,
        cc.Created_At,
        gp.Skill_Required,
        gp.Address,
        a.User_ID as artisan_user_id,
        u.Full_Name as artisan_name,
        a.Trust_Score,
        rr.Rating_Stars,
        rr.Review_Date
       FROM COMPLETION_CONTRACTS cc
       JOIN GIG_POSTINGS gp ON cc.Gig_ID = gp.Gig_ID
       JOIN ARTISANS a ON cc.Selected_Artisan_ID = a.Artisan_ID
       JOIN USERS u ON a.User_ID = u.User_ID
       LEFT JOIN RATINGS_REVIEWS rr ON rr.Contract_ID = cc.Contract_ID
       WHERE gp.Employer_User_ID = $1
       ORDER BY cc.Created_At DESC`;
    } else if (req.user.role === 'admin') {
      // Admin: all contracts
      sql = `SELECT
        cc.*,
        gp.Skill_Required,
        gp.Address,
        eu.Full_Name as employer_name,
        au.Full_Name as artisan_name
       FROM COMPLETION_CONTRACTS cc
       JOIN GIG_POSTINGS gp ON cc.Gig_ID = gp.Gig_ID
       JOIN USERS eu ON gp.Employer_User_ID = eu.User_ID
       JOIN ARTISANS a ON cc.Selected_Artisan_ID = a.Artisan_ID
       JOIN USERS au ON a.User_ID = au.User_ID
       ORDER BY cc.Created_At DESC`;
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
      `SELECT cc.*, gp.Employer_User_ID
       FROM COMPLETION_CONTRACTS cc
       JOIN GIG_POSTINGS gp ON cc.Gig_ID = gp.Gig_ID
       WHERE cc.Contract_ID = $1`,
      [contractId]
    );

    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const contract = contractResult.rows[0];

    if (req.user.role !== 'admin' && req.user.userId !== contract.Employer_User_ID) {
      return res.status(403).json({
        error: 'Can only manage payments for own contracts',
      });
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
