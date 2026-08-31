// ============================================================================
// Gig Applications Routes
// ============================================================================
// POST /api/gigs/:gigId/applications  - Submit a bid
// GET /api/applications/mine          - Get own bids
// PATCH /api/applications/:id/accept  - Accept a bid (TRANSACTION-SAFE)
// PATCH /api/applications/:id/reject  - Reject a bid
// ============================================================================

import express from 'express';
import {
  submitBid,
  getMyBids,
  acceptBid,
  rejectBid,
} from '../controllers/applications.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// Artisan: submit bid on a gig
router.post(
  '/gigs/:gigId/applications',
  authenticateToken,
  requireRole('artisan'),
  submitBid
);

// Artisan: view own bids
router.get('/applications/mine', authenticateToken, requireRole('artisan'), getMyBids);

// Employer: accept a bid (transaction-safe)
router.patch(
  '/applications/:id/accept',
  authenticateToken,
  requireRole('employer', 'admin'),
  acceptBid
);

// Employer: reject a bid
router.patch(
  '/applications/:id/reject',
  authenticateToken,
  requireRole('employer', 'admin'),
  rejectBid
);

export default router;
