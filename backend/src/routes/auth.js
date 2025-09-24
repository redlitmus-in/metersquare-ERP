/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { AuthMiddleware } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Development mode - accept any credentials
    if (process.env.NODE_ENV === 'development' && email === 'dev@test.com') {
      const token = AuthMiddleware.generateToken({
        id: 'dev-user',
        email: 'dev@test.com',
        role: 'admin',
        name: 'Dev User'
      });

      return res.json({
        access_token: token,
        user: {
          id: 'dev-user',
          email: 'dev@test.com',
          role: 'admin',
          name: 'Dev User'
        }
      });
    }

    // Try Supabase authentication
    if (process.env.SUPABASE_URL) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      return res.json({
        access_token: data.session.access_token,
        user: data.user
      });
    }

    // Fallback
    res.status(400).json({ error: 'Authentication not configured' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    // Clear cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user
router.get('/me', AuthMiddleware.verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Refresh token
router.post('/refresh', AuthMiddleware.refreshToken);

module.exports = router;