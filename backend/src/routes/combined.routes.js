// ============================================================================
// Contracts & Reviews & Dashboard Routes (Combined)
// ============================================================================

import express from 'express';
import { getMyContracts, markPaymentSettled, confirmReceipt, getContractEvents } from '../controllers/contracts.controller.js';
import { postReview, getArtisanReviews, postEmployerReview, getEmployerReviews } from '../controllers/reviews.controller.js';
import { getTopArtisans, getSkillEarnings, getOpenGigs } from '../controllers/dashboard.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = express.Router();

// ============================================================================
// Contracts Routes
// ============================================================================
router.get('/contracts/mine', authenticateToken, getMyContracts);
router.get('/contracts/:id/events', authenticateToken, getContractEvents);
router.patch('/contracts/:id/confirm-receipt', authenticateToken, requireRole('artisan'), confirmReceipt);
router.patch(
  '/contracts/:id/pay',
  authenticateToken,
  requireRole('employer'),
  markPaymentSettled
);

// ============================================================================
// Reviews Routes
// ============================================================================
router.post(
  '/contracts/:id/review',
  authenticateToken,
  requireRole('employer', 'admin'),
  postReview
);
router.get('/artisans/:id/reviews', getArtisanReviews);
router.post('/contracts/:id/employer-review', authenticateToken, requireRole('artisan'), postEmployerReview);
router.get('/employers/:id/reviews', getEmployerReviews);

// ============================================================================
// Dashboard Routes (Public)
// ============================================================================
router.get('/dashboard/top-artisans', getTopArtisans);
router.get('/dashboard/skill-earnings', getSkillEarnings);
router.get('/dashboard/open-gigs', getOpenGigs);

export default router;
