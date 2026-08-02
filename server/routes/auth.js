const express = require('express');
const bcrypt = require('bcrypt');
const { User } = require('../db');

const router = express.Router();
const SALT_ROUNDS = 12;

function publicUser(u) {
  if (!u) return null;
  const j = u.toJSON ? u.toJSON() : u;
  delete j.password_hash;
  return j;
}

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, display_name } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password required' });
    }
    const uname = String(username).trim().toLowerCase();
    const em = String(email).trim().toLowerCase();
    if (uname.length < 2 || em.length < 3) {
      return res.status(400).json({ error: 'Invalid username or email' });
    }
    const existing = await User.findOne({
      where: { [require('sequelize').Op.or]: [{ username: uname }, { email: em }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      username: uname,
      email: em,
      password_hash,
      display_name: display_name || uname,
      last_active_at: new Date(),
    });
    req.session.userId = user.id;
    req.session.username = user.username;
    res.status(201).json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }
    const uname = String(username).trim().toLowerCase();
    const user = await User.findOne({ where: { username: uname } });
    if (!user || user.is_banned) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await user.update({ last_active_at: new Date() });
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.json({ ok: true });
  });
});

router.get('/me', async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = await User.findByPk(req.session.userId);
    if (!user || user.is_banned) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
