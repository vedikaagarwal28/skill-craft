// ============================================================================
// JWT Authentication Middleware
// ============================================================================
// Verifies JWT tokens and attaches decoded user info to request object.
// Required for all protected routes.
// ============================================================================

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production';

/**
 * Middleware to verify JWT token
 * Attaches decoded token (user info) to req.user
 * Used on all protected routes
 */
export const authenticateToken = (req, res, next) => {
  if (req.user) return next();
  // Get token from Authorization header (Bearer <token>)
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Extract token after "Bearer "

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Public discovery still uses the restricted database role; a bearer token,
// when present, supplies the signed actor for matching and ownership policies.
export const optionalAuthentication = (req, res, next) => {
  if (!req.headers.authorization) return next();
  return authenticateToken(req, res, next);
};

/**
 * Generate a JWT token for a user
 * @param {object} user - User object with User_ID, Full_Name, Role
 * @returns {string} JWT token
 */
export const generateToken = (user) => {
  const payload = {
    userId: user.user_id,
    fullName: user.full_name,
    role: user.role,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '7d',
  });

  return token;
};

export default authenticateToken;
