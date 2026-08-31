// ============================================================================
// Gigs Routes
// ============================================================================
// POST /api/gigs              - Post a new gig
// GET /api/gigs               - List open gigs
// GET /api/gigs/:id           - Get gig detail
// PATCH /api/gigs/:id/cancel  - Cancel a gig
// ============================================================================

import express from 'express';
import {
  postGig,
  listGigs,
  getGigDetail,
  cancelGig,
} from '../controllers/gigs.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Public endpoints
router.get('/', listGigs);
router.get('/:id', authenticateToken, getGigDetail); // Auth optional for detail

// Protected endpoints
router.post('/', authenticateToken, requireRole('employer', 'admin'), postGig);
router.patch(
  '/:id/cancel',
  authenticateToken,
  requireRole('employer', 'admin'),
  cancelGig
);

export default router;
