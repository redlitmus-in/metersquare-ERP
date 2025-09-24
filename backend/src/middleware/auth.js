/**
 * Authentication Middleware
 * Handles JWT tokens and user authentication
 */

const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

class AuthMiddleware {
  /**
   * Verify JWT token
   */
  static async verifyToken(req, res, next) {
    try {
      // In development, allow bypass with special header
      if (process.env.NODE_ENV === 'development' && req.headers['x-dev-bypass']) {
        req.user = {
          id: 'dev-user',
          email: 'dev@test.com',
          role: req.headers['x-dev-role'] || 'admin'
        };
        return next();
      }

      // Get token from various sources
      const token =
        req.headers.authorization?.replace('Bearer ', '') ||
        req.cookies?.access_token ||
        req.headers['x-access-token'];

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      // Verify token (using existing SECRET_KEY from .env)
      const decoded = jwt.verify(token, process.env.SECRET_KEY || process.env.JWT_SECRET || 'default-secret');

      // Optionally verify with Supabase
      if (process.env.SUPABASE_URL) {
        const { data: user, error } = await supabase.auth.getUser(token);
        if (error) {
          console.warn('Supabase verification failed:', error);
        } else {
          req.supabaseUser = user;
        }
      }

      req.user = decoded;
      next();
    } catch (error) {
      console.error('Auth error:', error.message);

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }

      return res.status(401).json({ error: 'Authentication failed' });
    }
  }

  /**
   * Check user role
   */
  static requireRole(...allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // In development, allow role override
      if (process.env.NODE_ENV === 'development' && req.headers['x-dev-role']) {
        req.user.role = req.headers['x-dev-role'];
      }

      const userRole = req.user.role?.toLowerCase();
      const hasRole = allowedRoles.some(role => role.toLowerCase() === userRole);

      if (!hasRole) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: userRole
        });
      }

      next();
    };
  }

  /**
   * Generate JWT token
   */
  static generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    const options = {
      expiresIn: process.env.NODE_ENV === 'development' ? '7d' : '1h'
    };

    return jwt.sign(payload, process.env.SECRET_KEY || process.env.JWT_SECRET || 'default-secret', options);
  }

  /**
   * Refresh token
   */
  static async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refresh_token;

      if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token provided' });
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, (process.env.SECRET_KEY || process.env.JWT_SECRET) + '_refresh');

      // Generate new access token
      const newAccessToken = AuthMiddleware.generateToken(decoded);

      res.json({
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: 3600
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }
}

module.exports = { AuthMiddleware };