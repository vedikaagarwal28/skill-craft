// ============================================================================
// Authentication Routes
// ============================================================================
// POST /api/auth/register - Register a new user
// POST /api/auth/login    - Login and get JWT token
// ============================================================================

import express from 'express';
import { register, login } from '../controllers/auth.controller.js';

const router = express.Router();

// Public endpoints (no auth required)
router.post('/register', register);
router.post('/login', login);

export default router;
