// ============================================================================
// Authentication Controller
// ============================================================================
// Handles user registration and login.
// Uses bcryptjs for password hashing (never store plaintext passwords).
// Returns JWT token on successful login.
// ============================================================================

import bcrypt from 'bcryptjs';
import { query, getClient } from '../db.js';
import { generateToken } from '../middleware/auth.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

/**
 * Register a new user (artisan or employer)
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  let client;
  try {
    const { fullName, phone, email, password, role } = req.body;

    // Validate input
    if (!fullName || !phone || !email || !password || !role) {
      return res.status(400).json({
        error: 'Full name, phone, email, password, and role are required',
      });
    }

    if (!['artisan', 'employer'].includes(role)) {
      return res.status(400).json({
        error: 'Choose artisan or employer',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'password must be at least 6 characters',
      });
    }

    if (role === 'artisan' && (!req.body.skillCategory || !req.body.baseLocation || Number(req.body.hourlyRate) <= 0)) {
      return res.status(400).json({ error: 'Artisans need a skill, location, and positive hourly rate' });
    }

    // Check both unique identifiers before creating the account.
    client = await getClient();
    await client.query('BEGIN');

    const existingUser = await client.query(
      'SELECT User_ID FROM USERS WHERE Phone = $1 OR LOWER(Email) = LOWER($2)',
      [phone, email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'An account with this phone or email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Insert user
    const result = await client.query(
      `INSERT INTO USERS (Full_Name, Phone, Email, Password_Hash, Role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING User_ID, Full_Name, Phone, Email, Role, Created_At`,
      [fullName, phone, email || null, passwordHash, role]
    );

    const user = result.rows[0];

    // If role is artisan, create artisan profile
    if (role === 'artisan') {
      const { skillCategory, baseLocation, regionLanguage, hourlyRate } = req.body;

      await client.query(
        `INSERT INTO ARTISANS (User_ID, Skill_Category, Base_Location, Region_Language, Hourly_Rate)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.user_id, skillCategory, baseLocation, regionLanguage || null, hourlyRate]
      );
    }

    await client.query('COMMIT');

    // Generate JWT
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        userId: user.user_id,
        fullName: user.full_name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Registration error:', err);
    res.status(err.code === '23505' ? 409 : 500).json({ error: err.code === '23505' ? 'An account with this phone or email already exists' : 'Registration failed' });
  } finally {
    client?.release();
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { identity, phone, password } = req.body;
    const loginId = String(identity || phone || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Email or phone and password are required' });
    }

    // A single sign-in field accepts either email or phone.
    const result = await query(
      'SELECT User_ID, Full_Name, Phone, Email, Password_Hash, Role FROM USERS WHERE Phone = $1 OR LOWER(Email) = LOWER($1)',
      [loginId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email, phone, or password' });
    }

    const user = result.rows[0];

    // Compare password with hash
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email, phone, or password' });
    }

    // Generate JWT
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        userId: user.user_id,
        fullName: user.full_name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};
