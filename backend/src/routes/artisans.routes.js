// ============================================================================
// Artisans Routes
// ============================================================================
// GET /api/artisans           - List all artisans (with optional filters)
// GET /api/artisans/:id       - Get artisan profile
// PATCH /api/artisans/:id     - Update own profile (artisan only)
// ============================================================================

import express from 'express';
import {
  getArtisanProfile,
  updateArtisanProfile,
  listArtisans,
} from '../controllers/artisans.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Public endpoints
router.get('/', listArtisans);
router.get('/:id', getArtisanProfile);

// Protected endpoints
router.patch(
  '/:id',
  authenticateToken,
  requireRole('artisan', 'admin'),
  updateArtisanProfile
);

export default router;
