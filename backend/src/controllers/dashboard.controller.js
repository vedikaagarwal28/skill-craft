// ============================================================================
// Dashboard Controller
// ============================================================================
// GET /api/dashboard/top-artisans     - Top rated artisans view
// GET /api/dashboard/skill-earnings   - Earnings by skill category
// GET /api/dashboard/open-gigs        - Currently open gigs
// ============================================================================

import { query } from '../db.js';

/**
 * Get top rated artisans
 * GET /api/dashboard/top-artisans
 * Public endpoint
 */
export const getTopArtisans = async (req, res) => {
  try {
    const result = await query('SELECT * FROM Top_Rated_Artisans_View LIMIT 20');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching top artisans:', err);
    res.status(500).json({ error: 'Failed to fetch top artisans' });
  }
};

/**
 * Get skill category earnings view
 * GET /api/dashboard/skill-earnings
 * Public endpoint - shows impact of direct-to-employer model
 */
export const getSkillEarnings = async (req, res) => {
  try {
    const result = await query('SELECT * FROM Skill_Category_Earnings_View ORDER BY avg_settled_amount DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching skill earnings:', err);
    res.status(500).json({ error: 'Failed to fetch earnings data' });
  }
};

/**
 * Get open gigs view
 * GET /api/dashboard/open-gigs
 * Public endpoint - live gig board
 */
export const getOpenGigs = async (req, res) => {
  try {
    const result = await query('SELECT * FROM Open_Gigs_View ORDER BY Posted_Date DESC LIMIT 30');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching open gigs:', err);
    res.status(500).json({ error: 'Failed to fetch open gigs' });
  }
};
