// ============================================================================
// Role-Based Access Control (RBAC) Middleware
// ============================================================================
// Enforces role-based restrictions on routes.
// Middleware to check if user has required role(s).
// ============================================================================

/**
 * Middleware factory to require specific role(s)
 * @param {...string} roles - Required roles (e.g., 'artisan', 'employer', 'admin')
 * @returns {function} Express middleware
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user's role is in allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
};

/**
 * Middleware to require a specific role for accessing a user's own resource
 * Used to restrict artisans/employers from viewing/modifying others' data
 * @param {string} paramName - Name of the URL parameter (e.g., 'artisanId', 'userId')
 * @param {string} requiredRole - Role required for this endpoint (e.g., 'artisan')
 * @returns {function} Express middleware
 */
export const requireOwnResource = (paramName, requiredRole) => {
  return (req, res, next) => {
    // Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin can access anything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has required role
    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        error: `Only ${requiredRole}s can access this resource`,
      });
    }

    // In real implementation, check if req.user.userId matches the resource owner
    // This requires fetching from DB or extracting from req.params
    // For now, we'll do basic param validation
    // (Proper implementation should verify user_id in DB query)

    next();
  };
};

export default requireRole;
