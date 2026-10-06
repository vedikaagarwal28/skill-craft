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
  getMyGigs,
} from '../controllers/gigs.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Public endpoints
router.get('/', listGigs);
router.get('/mine', authenticateToken, requireRole('employer', 'admin'), getMyGigs);
router.get('/:id', (req, res, next) => req.headers.authorization ? authenticateToken(req, res, next) : next(), getGigDetail);

// Protected endpoints
router.post('/', authenticateToken, requireRole('employer', 'admin'), postGig);
router.patch(
  '/:id/cancel',
  authenticateToken,
  requireRole('employer', 'admin'),
  cancelGig
);

export default router;
