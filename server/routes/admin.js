const express = require('express');
const { Op } = require('sequelize');
const {
  User,
  LicensePlate,
  PlateImage,
  Report,
  Comment,
  sequelize,
} = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { requireAdmin } = require('../middleware/requireAdmin');
const { isUUID } = require('../lib/uuid');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/stats', async (req, res, next) => {
  try {
    const [userCount, plateCount, pendingReports, pendingImages] = await Promise.all([
      User.count(),
      LicensePlate.count(),
      Report.count({ where: { status: 'pending' } }),
      PlateImage.count({ where: { is_approved: false } }),
    ]);
    res.json({
      total_users: userCount,
      total_plates: plateCount,
      pending_reports: pendingReports,
      images_awaiting_review: pendingImages,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const role = req.query.role;
    const banned = req.query.banned;
    const q = req.query.q;
    const where = {};
    if (role) where.role = role;
    if (banned === 'true') where.is_banned = true;
    if (banned === 'false') where.is_banned = false;
    if (q) {
      where[Op.or] = [
        { username: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
        { display_name: { [Op.like]: `%${q}%` } },
      ];
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
    res.json({ users: rows, page, limit, total: count });
  } catch (e) {
    next(e);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    const bcrypt = require('bcrypt');
    const {
      username,
      email,
      password,
      display_name,
      role = 'user',
      bio,
      is_banned = false,
    } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password required' });
    }
    const uname = String(username).trim().toLowerCase();
    const em = String(email).trim().toLowerCase();
    const allowedRoles = ['user', 'moderator', 'admin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const existing = await User.findOne({
      where: { [Op.or]: [{ username: uname }, { email: em }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'Username or email already taken' });
    }
    const password_hash = await bcrypt.hash(String(password), 12);
    const user = await User.create({
      username: uname,
      email: em,
      password_hash,
      display_name: display_name || uname,
      role,
      bio: bio || null,
      is_banned: Boolean(is_banned),
      last_active_at: new Date(),
    });
    const j = user.toJSON();
    delete j.password_hash;
    res.status(201).json({ user: j });
  } catch (e) {
    next(e);
  }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    const { canAccessAdmin, OWNER_ADMIN_EMAIL } = require('../lib/adminAccess');
    const bcrypt = require('bcrypt');
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid id' });
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Not found' });

    const isOwnerAccount = canAccessAdmin(user);
    const {
      username,
      email,
      display_name,
      bio,
      role,
      is_banned,
      votes_visible,
      password,
    } = req.body || {};

    if (isOwnerAccount) {
      if (is_banned === true) {
        return res.status(400).json({ error: 'Cannot ban the owner account' });
      }
      if (role !== undefined && role !== 'admin') {
        return res.status(400).json({ error: 'Cannot change owner role' });
      }
      if (email !== undefined && String(email).trim().toLowerCase() !== OWNER_ADMIN_EMAIL) {
        return res.status(400).json({ error: 'Cannot change owner email' });
      }
    }

    const updates = {};
    if (username !== undefined) updates.username = String(username).trim().toLowerCase();
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();
    if (display_name !== undefined) updates.display_name = display_name;
    if (bio !== undefined) updates.bio = bio;
    if (votes_visible !== undefined) updates.votes_visible = Boolean(votes_visible);
    if (role !== undefined) {
      const allowedRoles = ['user', 'moderator', 'admin'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.role = role;
    }
    if (is_banned !== undefined) updates.is_banned = Boolean(is_banned);
    if (password) {
      updates.password_hash = await bcrypt.hash(String(password), 12);
    }

    if (updates.username || updates.email) {
      const or = [];
      if (updates.username) or.push({ username: updates.username });
      if (updates.email) or.push({ email: updates.email });
      const conflict = await User.findOne({
        where: {
          id: { [Op.ne]: id },
          [Op.or]: or,
        },
      });
      if (conflict) {
        return res.status(409).json({ error: 'Username or email already taken' });
      }
    }

    await user.update(updates);
    const j = user.toJSON();
    delete j.password_hash;
    res.json({ user: j });
  } catch (e) {
    next(e);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const { canAccessAdmin } = require('../lib/adminAccess');
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid id' });
    if (id === req.session.userId) {
      return res.status(400).json({ error: 'Cannot delete self' });
    }
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (canAccessAdmin(user)) {
      return res.status(400).json({ error: 'Cannot delete the owner account' });
    }
    await user.destroy();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/reports', async (req, res, next) => {
  try {
    const status = req.query.status;
    const where = {};
    if (status) where.status = status;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const { count, rows } = await Report.findAndCountAll({
      where,
      include: [{ model: User, as: 'reporter', attributes: ['id', 'username', 'email'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
    res.json({ reports: rows, page, limit, total: count });
  } catch (e) {
    next(e);
  }
});

router.put('/reports/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid id' });
    const report = await Report.findByPk(id);
    if (!report) return res.status(404).json({ error: 'Not found' });
    const { status } = req.body;
    const allowed = ['pending', 'reviewed', 'dismissed', 'actioned'];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await report.update({
      status: status || report.status,
      reviewed_by: req.session.userId,
      reviewed_at: new Date(),
    });
    res.json({ report });
  } catch (e) {
    next(e);
  }
});

router.get('/images', async (req, res, next) => {
  try {
    const filter = req.query.filter || 'all';
    const where = {};
    if (filter === 'pending') where.is_approved = false;
    else if (filter === 'approved') where.is_approved = true;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 24));
    const offset = (page - 1) * limit;
    const { count, rows } = await PlateImage.findAndCountAll({
      where,
      include: [
        { model: User, as: 'uploader', attributes: ['id', 'username'] },
        {
          model: LicensePlate,
          as: 'plate',
          attributes: ['id', 'slug', 'state', 'plate_number', 'display_plate_text'],
        },
      ],
      order: [['uploaded_at', 'DESC']],
      limit,
      offset,
    });
    res.json({ images: rows, page, limit, total: count });
  } catch (e) {
    next(e);
  }
});

router.put('/images/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid id' });
    const image = await PlateImage.findByPk(id);
    if (!image) return res.status(404).json({ error: 'Not found' });
    const { is_approved, is_primary } = req.body;
    if (is_approved !== undefined) await image.update({ is_approved: Boolean(is_approved) });
    if (is_primary) {
      await LicensePlate.update(
        { primary_image_id: image.id },
        { where: { id: image.plate_id } }
      );
    }
    res.json({ image });
  } catch (e) {
    next(e);
  }
});

/** Admin plate list */
router.get('/plates', async (req, res, next) => {
  try {
    const q = req.query.q;
    const where = {};
    if (q) {
      where[Op.or] = [
        { plate_number: { [Op.like]: `%${q}%` } },
        { make: { [Op.like]: `%${q}%` } },
      ];
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const { count, rows } = await LicensePlate.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
    res.json({ plates: rows, page, limit, total: count });
  } catch (e) {
    next(e);
  }
});

router.get('/comments', async (req, res, next) => {
  try {
    const filter = req.query.filter || 'flagged';
    const where = {};
    if (filter === 'flagged') where.is_flagged = true;
    else if (filter === 'deleted') where.is_deleted = true;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const { count, rows } = await Comment.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'username'] },
        { model: LicensePlate, as: 'plate', attributes: ['id', 'slug', 'state', 'plate_number'] },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
    res.json({ comments: rows, page, limit, total: count });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
