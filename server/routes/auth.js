const express = require('express');
const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const { Op } = require('sequelize');
const { User } = require('../db');
const { OWNER_ADMIN_EMAIL, canAccessAdmin } = require('../lib/adminAccess');

const router = express.Router();
const SALT_ROUNDS = 12;

function publicUser(u) {
  if (!u) return null;
  const j = u.toJSON ? u.toJSON() : u;
  delete j.password_hash;
  return j;
}

function googleClientId() {
  return (process.env.GOOGLE_CLIENT_ID || '').trim();
}

function slugifyUsername(base) {
  const cleaned = String(base || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24);
  return cleaned.length >= 2 ? cleaned : 'user';
}

async function uniqueUsername(preferred) {
  let base = slugifyUsername(preferred);
  let candidate = base;
  let n = 0;
  while (await User.findOne({ where: { username: candidate } })) {
    n += 1;
    candidate = `${base}${n}`.slice(0, 64);
  }
  return candidate;
}

router.get('/google/config', (_req, res) => {
  const clientId = googleClientId();
  if (!clientId) {
    return res.json({ enabled: false });
  }
  res.json({ enabled: true, clientId });
});

router.post('/google', async (req, res, next) => {
  try {
    const clientId = googleClientId();
    if (!clientId) {
      return res.status(503).json({ error: 'Google sign-in is not configured' });
    }
    const { credential } = req.body || {};
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ error: 'credential required' });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }
    if (payload.email_verified === false) {
      return res.status(401).json({ error: 'Google email is not verified' });
    }

    const googleId = payload.sub;
    const email = String(payload.email).trim().toLowerCase();
    const displayName = payload.name || email.split('@')[0];
    const avatarUrl = payload.picture || null;

    let user = await User.findOne({ where: { google_id: googleId } });
    if (!user) {
      user = await User.findOne({ where: { email } });
      if (user) {
        await user.update({
          google_id: googleId,
          avatar_url: user.avatar_url || avatarUrl,
          display_name: user.display_name || displayName,
          last_active_at: new Date(),
        });
      } else {
        const username = await uniqueUsername(email.split('@')[0]);
        // Empty string = Google-only account (works with SQLite NOT NULL columns)
        user = await User.create({
          username,
          email,
          password_hash: '',
          google_id: googleId,
          display_name: displayName,
          avatar_url: avatarUrl,
          role: email === OWNER_ADMIN_EMAIL ? 'admin' : 'user',
          last_active_at: new Date(),
        });
      }
    } else {
      await user.update({ last_active_at: new Date() });
    }

    if (canAccessAdmin(user) && user.role !== 'admin') {
      await user.update({ role: 'admin' });
      await user.reload();
    }

    if (user.is_banned) {
      return res.status(401).json({ error: 'Account is banned' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

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
      where: { [Op.or]: [{ username: uname }, { email: em }] },
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
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Use Google to sign in to this account' });
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await user.update({ last_active_at: new Date() });
    if (canAccessAdmin(user) && user.role !== 'admin') {
      await user.update({ role: 'admin' });
      await user.reload();
    }
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
