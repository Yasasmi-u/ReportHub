import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDbConnection } from '../database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'weekly_dashboard_jwt_secret_token_key_123!';

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields (name, email, password, role) are required.' });
  }

  if (role !== 'member' && role !== 'manager') {
    return res.status(400).json({ error: 'Role must be either "member" or "manager".' });
  }

  try {
    const db = await getDbConnection();

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email.toLowerCase(), passwordHash, role]
    );

    const token = jwt.sign(
      { id: result.lastID, name, email: email.toLowerCase(), role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: { id: result.lastID, name, email: email.toLowerCase(), role }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Database error during registration.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const db = await getDbConnection();

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error during login.' });
  }
});

// Me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = await getDbConnection();
    const user = await db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Auth-Me error:', err);
    res.status(500).json({ error: 'Database error.' });
  }
});

export default router;
