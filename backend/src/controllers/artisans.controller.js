// ============================================================================
// Artisans Controller
// ============================================================================
// GET /api/artisans/:id       - Get artisan profile with trust score
// PATCH /api/artisans/:id     - Update own artisan profile (artisan only)
// GET /api/artisans           - List all artisans (with optional filters)
// ============================================================================

import { query } from '../db.js';

/**
 * Get artisan profile by ID
 * GET /api/artisans/:id
 * Public endpoint - anyone can view artisan profiles
 */
export const getArtisanProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid artisan ID' });
    }

    const result = await query(
      `SELECT
         a.artisan_id,
         a.user_id,
         u.full_name,
         a.skill_category,
         a.base_location,
         a.region_language,
         a.hourly_rate,
         a.trust_score,
         a.created_at,
         stats.total_contracts_completed,
         stats.total_reviews
       FROM ARTISANS a
       JOIN USERS u ON a.user_id = u.user_id
       JOIN Artisan_Public_Stats stats ON stats.artisan_id = a.artisan_id
       WHERE a.artisan_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching artisan:', err);
    res.status(500).json({ error: 'Failed to fetch artisan profile' });
  }
};

/**
 * Update own artisan profile
 * PATCH /api/artisans/:id
 * Artisan-only - can only update own profile
 */
export const updateArtisanProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { skillCategory, baseLocation, regionLanguage, hourlyRate } = req.body;

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only artisans can update profiles
    if (req.user.role !== 'artisan' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only artisans can update profiles' });
    }

    // Check if updating own profile (unless admin)
    if (req.user.role !== 'admin') {
      const checkResult = await query(
        'SELECT User_ID FROM ARTISANS WHERE Artisan_ID = $1',
        [id]
      );
      if (checkResult.rows.length === 0 || checkResult.rows[0].user_id !== req.user.userId) {
        return res.status(403).json({ error: 'Can only update own profile' });
      }
    }

    // Validate input
    const updates = {};
    if (skillCategory !== undefined) updates.skill_category = skillCategory;
    if (baseLocation !== undefined) updates.base_location = baseLocation;
    if (regionLanguage !== undefined) updates.region_language = regionLanguage;
    if (hourlyRate !== undefined) {
      if (hourlyRate <= 0) {
        return res.status(400).json({ error: 'hourlyRate must be > 0' });
      }
      updates.hourly_rate = hourlyRate;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Build dynamic UPDATE query
    const updateFields = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');

    const updateValues = Object.values(updates);
    updateValues.push(id);

    const result = await query(
      `UPDATE ARTISANS 
       SET ${updateFields}, Updated_At = CURRENT_TIMESTAMP
       WHERE Artisan_ID = $${updateValues.length}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artisan not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      artisan: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating artisan:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * List all artisans with optional filters
 * GET /api/artisans?skillCategory=...&baseLocation=...
 * Public endpoint
 */
export const listArtisans = async (req, res) => {
  try {
    const { skillCategory, baseLocation, q, sortBy = 'trustScore', limit = 50 } = req.query;

    let sql = `SELECT
      a.artisan_id,
      a.user_id,
      u.full_name,
      a.skill_category,
      a.base_location,
      a.region_language,
      a.hourly_rate,
      a.trust_score,
      CASE WHEN app_actor_role() = 'employer' THEN COALESCE((
        SELECT MAX(CASE WHEN LOWER(g.skill_required) = LOWER(a.skill_category) THEN 2 ELSE 0 END +
          CASE WHEN split_part(LOWER(g.address), ',', 1) = split_part(LOWER(a.base_location), ',', 1) THEN 1 ELSE 0 END)
        FROM GIG_POSTINGS g WHERE g.employer_user_id = app_actor_id() AND g.status = 'open'
      ), 0) ELSE 0 END AS match_score,
      stats.total_contracts_completed,
      stats.total_reviews
     FROM ARTISANS a
     JOIN USERS u ON a.user_id = u.user_id
     JOIN Artisan_Public_Stats stats ON stats.artisan_id = a.artisan_id
     WHERE 1=1`;

    const params = [];

    if (skillCategory) {
      sql += ` AND LOWER(a.skill_category) = LOWER($${params.length + 1})`;
      params.push(skillCategory);
    }

    if (baseLocation) {
      sql += ` AND to_tsvector('simple', COALESCE(a.skill_category, '') || ' ' || COALESCE(a.base_location, '')) @@ websearch_to_tsquery('simple', $${params.length + 1})`;
      params.push(baseLocation);
    }

    if (q?.trim()) {
      sql += ` AND (to_tsvector('simple', COALESCE(a.skill_category, '') || ' ' || COALESCE(a.base_location, '')) @@ websearch_to_tsquery('simple', $${params.length + 1}) OR u.full_name ILIKE $${params.length + 2})`;
      params.push(q.trim(), `%${q.trim()}%`);
    }

    // Sorting
    if (sortBy === 'trustScore') {
      sql += ' ORDER BY match_score DESC, a.trust_score DESC';
    } else if (sortBy === 'hourlyRate') {
      sql += ' ORDER BY a.hourly_rate DESC';
    } else {
      sql += ' ORDER BY a.artisan_id DESC';
    }

    sql += ` LIMIT $${params.length + 1}`;
    params.push(Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100));

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing artisans:', err);
    res.status(500).json({ error: 'Failed to list artisans' });
  }
};
