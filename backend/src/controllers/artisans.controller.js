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
         a.Artisan_ID,
         a.User_ID,
         u.Full_Name,
         u.Phone,
         u.Email,
         a.Skill_Category,
         a.Base_Location,
         a.Region_Language,
         a.Hourly_Rate,
         a.Trust_Score,
         a.Created_At,
         (SELECT COUNT(*) FROM COMPLETION_CONTRACTS WHERE Selected_Artisan_ID = a.Artisan_ID) as total_contracts_completed,
         (SELECT COUNT(*) FROM RATINGS_REVIEWS rr 
          JOIN COMPLETION_CONTRACTS cc ON rr.Contract_ID = cc.Contract_ID
          WHERE cc.Selected_Artisan_ID = a.Artisan_ID) as total_reviews
       FROM ARTISANS a
       JOIN USERS u ON a.User_ID = u.User_ID
       WHERE a.Artisan_ID = $1`,
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
      if (checkResult.rows.length === 0 || checkResult.rows[0].User_ID !== req.user.userId) {
        return res.status(403).json({ error: 'Can only update own profile' });
      }
    }

    // Validate input
    const updates = {};
    if (skillCategory !== undefined) updates.Skill_Category = skillCategory;
    if (baseLocation !== undefined) updates.Base_Location = baseLocation;
    if (regionLanguage !== undefined) updates.Region_Language = regionLanguage;
    if (hourlyRate !== undefined) {
      if (hourlyRate <= 0) {
        return res.status(400).json({ error: 'hourlyRate must be > 0' });
      }
      updates.Hourly_Rate = hourlyRate;
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
    const { skillCategory, baseLocation, sortBy = 'trustScore', limit = 50 } = req.query;

    let sql = `SELECT
      a.Artisan_ID,
      a.User_ID,
      u.Full_Name,
      a.Skill_Category,
      a.Base_Location,
      a.Region_Language,
      a.Hourly_Rate,
      a.Trust_Score,
      (SELECT COUNT(*) FROM COMPLETION_CONTRACTS WHERE Selected_Artisan_ID = a.Artisan_ID) as total_contracts_completed
     FROM ARTISANS a
     JOIN USERS u ON a.User_ID = u.User_ID
     WHERE 1=1`;

    const params = [];

    if (skillCategory) {
      sql += ` AND a.Skill_Category ILIKE $${params.length + 1}`;
      params.push(`%${skillCategory}%`);
    }

    if (baseLocation) {
      sql += ` AND a.Base_Location ILIKE $${params.length + 1}`;
      params.push(`%${baseLocation}%`);
    }

    // Sorting
    if (sortBy === 'trustScore') {
      sql += ' ORDER BY a.Trust_Score DESC';
    } else if (sortBy === 'hourlyRate') {
      sql += ' ORDER BY a.Hourly_Rate DESC';
    } else {
      sql += ' ORDER BY a.Artisan_ID DESC';
    }

    sql += ` LIMIT $${params.length + 1}`;
    params.push(parseInt(limit) || 50);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing artisans:', err);
    res.status(500).json({ error: 'Failed to list artisans' });
  }
};
