// Authentication routes
const express = require('express');
const router = express.Router();
const auth = require('./auth');
const db = require('./database-facade');

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, codeforcesRating } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name, email, and password are required'
      });
    }

    if (!auth.validateEmail(email)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid email format'
      });
    }

    const passwordValidation = auth.validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Validation error',
        message: passwordValidation.message
      });
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists'
      });
    }

    // Hash password and create user
    const passwordHash = await auth.hashPassword(password);
    const user = await db.createUser({
      name,
      email,
      passwordHash,
      role: role || 'student',
      codeforcesRating: codeforcesRating || 0
    });

    if (!user) {
      return res.status(500).json({
        error: 'Server error',
        message: 'Failed to create user (database may not be initialized)'
      });
    }

    // Generate token
    const token = auth.generateToken(user);

    // Remove sensitive data
    delete user.password_hash;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // Get user by email
    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isValid = await auth.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = auth.generateToken(user);

    // Remove sensitive data
    delete user.password_hash;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Get current user info (requires authentication)
router.get('/me', auth.requireAuth, async (req, res) => {
  try {
    const user = await db.getStudent(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });
    }

    // Remove sensitive data
    delete user.password_hash;

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Refresh token (requires valid token)
router.post('/refresh', auth.requireAuth, (req, res) => {
  try {
    // Generate new token
    const token = auth.generateToken(req.user);

    res.json({
      success: true,
      token
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

// Logout (client-side only - invalidate token on client)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful (clear token on client)'
  });
});

// Verify token (useful for client to check if token is still valid)
router.get('/verify', auth.requireAuth, (req, res) => {
  res.json({
    success: true,
    valid: true,
    user: req.user
  });
});

module.exports = router;
