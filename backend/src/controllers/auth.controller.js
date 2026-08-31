// ============================================================================
// Authentication Controller
// ============================================================================
// Handles user registration and login.
// Uses bcryptjs for password hashing (never store plaintext passwords).
// Returns JWT token on successful login.
// ============================================================================

import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { generateToken } from '../middleware/auth.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

/**
 * Register a new user (artisan or employer)
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { fullName, phone, email, password, role } = req.body;

    // Validate input
    if (!fullName || !phone || !password || !role) {
      return res.status(400).json({
        error: 'fullName, phone, password, and role are required',
      });
    }

    if (!['artisan', 'employer', 'admin'].includes(role)) {
      return res.status(400).json({
        error: 'role must be one of: artisan, employer, admin',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'password must be at least 6 characters',
      });
    }

    // Check if user already exists (by phone)
    const existingUser = await query(
      'SELECT User_ID FROM USERS WHERE Phone = $1',
      [phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this phone already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Insert user
    const result = await query(
      `INSERT INTO USERS (Full_Name, Phone, Email, Password_Hash, Role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING User_ID, Full_Name, Phone, Role, Created_At`,
      [fullName, phone, email || null, passwordHash, role]
    );

    const user = result.rows[0];

    // If role is artisan, create artisan profile
    if (role === 'artisan') {
      const { skillCategory, baseLocation, regionLanguage, hourlyRate } = req.body;

      if (!skillCategory || !baseLocation || !hourlyRate) {
        // Rollback user if artisan profile incomplete
        await query('DELETE FROM USERS WHERE User_ID = $1', [user.User_ID]);
        return res.status(400).json({
          error: 'For artisans: skillCategory, baseLocation, and hourlyRate are required',
        });
      }

      if (hourlyRate <= 0) {
        await query('DELETE FROM USERS WHERE User_ID = $1', [user.User_ID]);
        return res.status(400).json({ error: 'hourlyRate must be > 0' });
      }

      await query(
        `INSERT INTO ARTISANS (User_ID, Skill_Category, Base_Location, Region_Language, Hourly_Rate)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.User_ID, skillCategory, baseLocation, regionLanguage || null, hourlyRate]
      );
    }

    // Generate JWT
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        userId: user.User_ID,
        fullName: user.Full_Name,
        phone: user.Phone,
        role: user.Role,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'phone and password are required' });
    }

    // Find user by phone
    const result = await query(
      'SELECT User_ID, Full_Name, Phone, Password_Hash, Role FROM USERS WHERE Phone = $1',
      [phone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    const user = result.rows[0];

    // Compare password with hash
    const isValidPassword = await bcrypt.compare(password, user.Password_Hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }

    // Generate JWT
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        userId: user.User_ID,
        fullName: user.Full_Name,
        phone: user.Phone,
        role: user.Role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};
