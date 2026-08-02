const express = require('express');
const { Op } = require('sequelize');
const {
  User,
  LicensePlate,
  PlateImage,
  PlateVote,
  Report,
  Comment,
} = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { requireAdmin } = require('../middleware/requireAdmin');
const { canAccessAdmin } = require('../lib/adminAccess');
const { isUUID } = require('../lib/uuid');
const { normalizePlateTypes } = require('../lib/plateTypes');

const REPORT_STATUSES = ['pending', 'reviewed', 'dismissed', 'actioned'];

async function resolveReportContent(report) {
  const type = report.content_type;
  const id = report.content_id;
  if (!type || !id) return null;

  if (type === 'plate') {
    const plate = await LicensePlate.findByPk(id, {
      attributes: [
        'id',
        'slug',
        'state',
        'plate_number',
        'display_plate_text',
        'make',
        'model',
        'primary_image_id',
      ],
      include: [
        {
          model: PlateImage,
          as: 'primaryImage',
          required: false,
          attributes: ['id', 'image_url', 'thumbnail_url'],
        },
      ],
    });
    if (!plate) return { missing: true };
    const j = plate.toJSON();
    return {
      kind: 'plate',
      id: j.id,
      label: `${j.state} ${j.display_plate_text || j.plate_number}`,
      href: `/plate/${encodeURIComponent(j.state)}/${encodeURIComponent(j.plate_number)}`,
      thumb: j.primaryImage?.thumbnail_url || j.primaryImage?.image_url || null,
      meta: [j.make, j.model].filter(Boolean).join(' '),
    };
  }

  if (type === 'image') {
    const image = await PlateImage.findByPk(id, {
      attributes: ['id', 'image_url', 'thumbnail_url', 'caption', 'plate_id', 'is_approved'],
      include: [
        {
          model: LicensePlate,
          as: 'plate',
          attributes: ['id', 'state', 'plate_number', 'display_plate_text', 'slug'],
        },
        { model: User, as: 'uploader', attributes: ['id', 'username'] },
      ],
    });
    if (!image) return { missing: true };
    const j = image.toJSON();
    const plate = j.plate;
    return {
      kind: 'image',
      id: j.id,
      label: plate
        ? `Photo on ${plate.state} ${plate.display_plate_text || plate.plate_number}`
        : 'Plate photo',
      href: plate
        ? `/plate/${encodeURIComponent(plate.state)}/${encodeURIComponent(plate.plate_number)}`
        : null,
      thumb: j.thumbnail_url || j.image_url || null,
      meta: j.uploader?.username ? `by @${j.uploader.username}` : null,
      plate_id: j.plate_id,
      is_approved: j.is_approved,
    };
  }

  if (type === 'comment') {
    const comment = await Comment.findByPk(id, {
      attributes: ['id', 'body', 'is_deleted', 'is_flagged', 'plate_id', 'created_at'],
      include: [
        { model: User, as: 'author', attributes: ['id', 'username'] },
        {
          model: LicensePlate,
          as: 'plate',
          attributes: ['id', 'state', 'plate_number', 'display_plate_text'],
        },
      ],
    });
    if (!comment) return { missing: true };
    const j = comment.toJSON();
    const plate = j.plate;
    return {
      kind: 'comment',
      id: j.id,
      label: j.is_deleted ? '[comment removed]' : (j.body || '').slice(0, 140),
      href: plate
        ? `/plate/${encodeURIComponent(plate.state)}/${encodeURIComponent(plate.plate_number)}`
        : null,
      thumb: null,
      meta: j.author?.username ? `@${j.author.username}` : null,
      is_deleted: j.is_deleted,
      is_flagged: j.is_flagged,
    };
  }

  if (type === 'user') {
    const user = await User.findByPk(id, {
      attributes: ['id', 'username', 'email', 'display_name', 'is_banned', 'avatar_url'],
    });
    if (!user) return { missing: true };
    const j = user.toJSON();
    return {
      kind: 'user',
      id: j.id,
      label: `@${j.username}`,
      href: `/user/${encodeURIComponent(j.username)}`,
      thumb: j.avatar_url || null,
      meta: j.is_banned ? 'banned' : j.email,
      is_banned: j.is_banned,
    };
  }

  return null;
}

async function removeReportedContent(report) {
  const type = report.content_type;
  const id = report.content_id;

  if (type === 'comment') {
    const comment = await Comment.findByPk(id);
    if (!comment) return { ok: false, error: 'Comment not found' };
    await comment.update({ is_deleted: true, is_flagged: true });
    return { ok: true, action: 'comment_removed' };
  }

  if (type === 'image') {
    const image = await PlateImage.findByPk(id);
    if (!image) return { ok: false, error: 'Image not found' };
    const plateId = image.plate_id;
    const plate = await LicensePlate.findByPk(plateId);
    await image.destroy();
    if (plate) {
      if (plate.primary_image_id === id) {
        const nextImg = await PlateImage.findOne({
          where: { plate_id: plateId },
          order: [['uploaded_at', 'DESC']],
        });
        await plate.update({ primary_image_id: nextImg ? nextImg.id : null });
      }
      await plate.update({ post_count: Math.max(0, (plate.post_count || 0) - 1) });
    }
    return { ok: true, action: 'image_removed' };
  }

  if (type === 'plate') {
    const plate = await LicensePlate.findByPk(id);
    if (!plate) return { ok: false, error: 'Plate not found' };
    await LicensePlate.update({ primary_image_id: null }, { where: { id } });
    await PlateImage.destroy({ where: { plate_id: id } });
    await Comment.destroy({ where: { plate_id: id } });
    await PlateVote.destroy({ where: { plate_id: id } });
    await Report.destroy({
      where: {
        content_type: 'plate',
        content_id: id,
        id: { [Op.ne]: report.id },
      },
    });
    await plate.destroy();
    return { ok: true, action: 'plate_removed' };
  }

  if (type === 'user') {
    const user = await User.findByPk(id);
    if (!user) return { ok: false, error: 'User not found' };
    if (canAccessAdmin(user)) {
      return { ok: false, error: 'Cannot ban the owner account' };
    }
    await user.update({ is_banned: true });
    return { ok: true, action: 'user_banned' };
  }

  return { ok: false, error: 'Unsupported content type' };
}

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
    const contentType = req.query.content_type;
    const where = {};
    if (status && status !== 'all') {
      if (!REPORT_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      where.status = status;
    }
    if (contentType && contentType !== 'all') {
      if (!['plate', 'image', 'comment', 'user'].includes(contentType)) {
        return res.status(400).json({ error: 'Invalid content_type' });
      }
      where.content_type = contentType;
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const { count, rows } = await Report.findAndCountAll({
      where,
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'reviewer', attributes: ['id', 'username'], required: false },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const reports = [];
    for (const row of rows) {
      const j = row.toJSON();
      j.content = await resolveReportContent(row);
      reports.push(j);
    }

    const [pending, reviewed, dismissed, actioned] = await Promise.all([
      Report.count({ where: { status: 'pending' } }),
      Report.count({ where: { status: 'reviewed' } }),
      Report.count({ where: { status: 'dismissed' } }),
      Report.count({ where: { status: 'actioned' } }),
    ]);

    res.json({
      reports,
      page,
      limit,
      total: count,
      counts: { pending, reviewed, dismissed, actioned, all: pending + reviewed + dismissed + actioned },
    });
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

    const { status, action } = req.body || {};
    let removal = null;

    if (action === 'remove_content') {
      removal = await removeReportedContent(report);
      if (!removal.ok) {
        return res.status(400).json({ error: removal.error || 'Could not remove content' });
      }
      await report.update({
        status: 'actioned',
        reviewed_by: req.session.userId,
        reviewed_at: new Date(),
      });
    } else if (action === 'dismiss') {
      await report.update({
        status: 'dismissed',
        reviewed_by: req.session.userId,
        reviewed_at: new Date(),
      });
    } else if (action === 'mark_reviewed') {
      await report.update({
        status: 'reviewed',
        reviewed_by: req.session.userId,
        reviewed_at: new Date(),
      });
    } else {
      if (status && !REPORT_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      await report.update({
        status: status || report.status,
        reviewed_by: req.session.userId,
        reviewed_at: new Date(),
      });
    }

    const fresh = await Report.findByPk(id, {
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'username', 'email'] },
        { model: User, as: 'reviewer', attributes: ['id', 'username'], required: false },
      ],
    });
    const payload = fresh.toJSON();
    payload.content = await resolveReportContent(fresh);
    res.json({ report: payload, removal });
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

/** Admin plate list + CRUD */
router.get('/plates', async (req, res, next) => {
  try {
    const q = req.query.q;
    const state = req.query.state ? String(req.query.state).trim().toUpperCase() : '';
    const where = {};
    if (state) where.state = state;
    if (q) {
      const term = `%${q}%`;
      where[Op.or] = [
        { plate_number: { [Op.like]: term } },
        { display_plate_text: { [Op.like]: term } },
        { make: { [Op.like]: term } },
        { model: { [Op.like]: term } },
        { slug: { [Op.like]: term } },
        { color: { [Op.like]: term } },
      ];
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const { count, rows } = await LicensePlate.findAndCountAll({
      where,
      include: [
        {
          model: PlateImage,
          as: 'primaryImage',
          required: false,
          attributes: ['id', 'image_url', 'thumbnail_url', 'is_approved'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
    res.json({ plates: rows, page, limit, total: count });
  } catch (e) {
    next(e);
  }
});

router.post('/plates', async (req, res, next) => {
  try {
    const {
      normalizePlateNumber,
      normalizeDisplayPlateText,
      normalizeState,
      buildSlug,
    } = require('../lib/plateUtils');
    const {
      plate_number,
      display_plate_text,
      state,
      country = 'US',
      make,
      model,
      year,
      color,
      body_type = 'other',
      cred_score,
      plate_types,
    } = req.body || {};

    const num = normalizePlateNumber(plate_number);
    const st = normalizeState(state);
    if (!num || st.length !== 2) {
      return res.status(400).json({ error: 'Valid plate_number and 2-letter state required' });
    }
    const slug = buildSlug(st, num);
    const existing = await LicensePlate.findOne({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: 'Plate already exists for that state/number' });
    }

    const allowedBody = LicensePlate.BODY_TYPES || [];
    const bodyType = allowedBody.includes(body_type) ? body_type : 'other';
    const yearNum = year === '' || year === null || year === undefined ? null : parseInt(year, 10);
    const scoreNum = cred_score === '' || cred_score === null || cred_score === undefined
      ? null
      : parseInt(cred_score, 10);

    const plate = await LicensePlate.create({
      plate_number: num,
      display_plate_text: normalizeDisplayPlateText(display_plate_text) || num,
      state: st,
      country: String(country || 'US').toUpperCase().slice(0, 8),
      slug,
      make: make || null,
      model: model || null,
      year: Number.isFinite(yearNum) ? yearNum : null,
      color: color || null,
      body_type: bodyType,
      plate_types: normalizePlateTypes(plate_types),
      cred_score: Number.isFinite(scoreNum) ? scoreNum : 0,
      first_seen_at: new Date(),
      last_seen_at: new Date(),
    });
    res.status(201).json({ plate });
  } catch (e) {
    next(e);
  }
});

router.put('/plates/:id', async (req, res, next) => {
  try {
    const {
      normalizePlateNumber,
      normalizeDisplayPlateText,
      normalizeState,
      buildSlug,
    } = require('../lib/plateUtils');
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid id' });
    const plate = await LicensePlate.findByPk(id);
    if (!plate) return res.status(404).json({ error: 'Not found' });

    const {
      plate_number,
      display_plate_text,
      state,
      country,
      make,
      model,
      year,
      color,
      body_type,
      cred_score,
      plate_types,
    } = req.body || {};

    const updates = {};
    if (plate_number !== undefined || state !== undefined) {
      const num = normalizePlateNumber(plate_number !== undefined ? plate_number : plate.plate_number);
      const st = normalizeState(state !== undefined ? state : plate.state);
      if (!num || st.length !== 2) {
        return res.status(400).json({ error: 'Valid plate_number and 2-letter state required' });
      }
      const slug = buildSlug(st, num);
      if (slug !== plate.slug) {
        const conflict = await LicensePlate.findOne({
          where: { slug, id: { [Op.ne]: id } },
        });
        if (conflict) {
          return res.status(409).json({ error: 'Plate already exists for that state/number' });
        }
      }
      updates.plate_number = num;
      updates.state = st;
      updates.slug = slug;
    }
    if (display_plate_text !== undefined) {
      updates.display_plate_text =
        normalizeDisplayPlateText(display_plate_text) || updates.plate_number || plate.plate_number;
    }
    if (country !== undefined) updates.country = String(country || 'US').toUpperCase().slice(0, 8);
    if (make !== undefined) updates.make = make || null;
    if (model !== undefined) updates.model = model || null;
    if (color !== undefined) updates.color = color || null;
    if (year !== undefined) {
      if (year === '' || year === null) updates.year = null;
      else {
        const yearNum = parseInt(year, 10);
        updates.year = Number.isFinite(yearNum) ? yearNum : null;
      }
    }
    if (body_type !== undefined) {
      const allowedBody = LicensePlate.BODY_TYPES || [];
      updates.body_type = allowedBody.includes(body_type) ? body_type : plate.body_type;
    }
    if (plate_types !== undefined) {
      updates.plate_types = normalizePlateTypes(plate_types);
    }
    if (cred_score !== undefined) {
      const score = parseInt(cred_score, 10);
      if (Number.isFinite(score)) updates.cred_score = score;
    }
    updates.last_seen_at = new Date();

    await plate.update(updates);
    res.json({ plate });
  } catch (e) {
    next(e);
  }
});

router.delete('/plates/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid id' });
    const plate = await LicensePlate.findByPk(id);
    if (!plate) return res.status(404).json({ error: 'Not found' });

    await LicensePlate.update({ primary_image_id: null }, { where: { id } });
    await PlateImage.destroy({ where: { plate_id: id } });
    await Comment.destroy({ where: { plate_id: id } });
    await PlateVote.destroy({ where: { plate_id: id } });
    await Report.destroy({ where: { content_type: 'plate', content_id: id } });
    await plate.destroy();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/comments', async (req, res, next) => {
  try {
    const filter = req.query.filter || 'flagged';
    const q = req.query.q ? String(req.query.q).trim() : '';
    const where = {};
    if (filter === 'flagged') {
      where.is_flagged = true;
      where.is_deleted = false;
    } else if (filter === 'deleted') {
      where.is_deleted = true;
    } else if (filter === 'active') {
      where.is_deleted = false;
    } else if (filter !== 'all') {
      return res.status(400).json({ error: 'Invalid filter' });
    }
    if (q) {
      const term = `%${q}%`;
      where[Op.or] = [{ body: { [Op.like]: term } }];
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const { count, rows } = await Comment.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'display_name'] },
        {
          model: LicensePlate,
          as: 'plate',
          attributes: ['id', 'slug', 'state', 'plate_number', 'display_plate_text'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    const [flagged, deleted, active, all] = await Promise.all([
      Comment.count({ where: { is_flagged: true, is_deleted: false } }),
      Comment.count({ where: { is_deleted: true } }),
      Comment.count({ where: { is_deleted: false } }),
      Comment.count(),
    ]);

    res.json({
      comments: rows,
      page,
      limit,
      total: count,
      counts: { flagged, deleted, active, all },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/comments', async (req, res, next) => {
  try {
    const { plate_id, body, user_id, parent_id } = req.body || {};
    if (!plate_id || !isUUID(String(plate_id))) {
      return res.status(400).json({ error: 'Valid plate_id required' });
    }
    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'body required' });
    }
    const plate = await LicensePlate.findByPk(plate_id);
    if (!plate) return res.status(404).json({ error: 'Plate not found' });

    let authorId = req.session.userId;
    if (user_id) {
      if (!isUUID(String(user_id))) return res.status(400).json({ error: 'Invalid user_id' });
      const author = await User.findByPk(user_id);
      if (!author) return res.status(404).json({ error: 'User not found' });
      authorId = author.id;
    }

    let parentId = null;
    if (parent_id) {
      if (!isUUID(String(parent_id))) return res.status(400).json({ error: 'Invalid parent_id' });
      const parent = await Comment.findByPk(parent_id);
      if (!parent || parent.plate_id !== plate.id) {
        return res.status(400).json({ error: 'Invalid parent comment' });
      }
      if (parent.parent_id) {
        return res.status(400).json({ error: 'Only one level of replies' });
      }
      parentId = parent.id;
    }

    const comment = await Comment.create({
      plate_id: plate.id,
      user_id: authorId,
      parent_id: parentId,
      body: String(body).trim().slice(0, 5000),
      is_deleted: false,
      is_flagged: false,
    });
    await plate.update({ comment_count: (plate.comment_count || 0) + 1 });
    const author = await User.findByPk(authorId);
    if (author) await author.update({ comment_count: (author.comment_count || 0) + 1 });

    const full = await Comment.findByPk(comment.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'display_name'] },
        {
          model: LicensePlate,
          as: 'plate',
          attributes: ['id', 'slug', 'state', 'plate_number', 'display_plate_text'],
        },
      ],
    });
    res.status(201).json({ comment: full });
  } catch (e) {
    next(e);
  }
});

router.put('/comments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid id' });
    const comment = await Comment.findByPk(id);
    if (!comment) return res.status(404).json({ error: 'Not found' });

    const { body, is_flagged, is_deleted } = req.body || {};
    const updates = {};

    if (body !== undefined) {
      const text = String(body).trim();
      if (!text) return res.status(400).json({ error: 'body required' });
      updates.body = text.slice(0, 5000);
    }
    if (is_flagged !== undefined) updates.is_flagged = Boolean(is_flagged);

    if (is_deleted !== undefined) {
      const nextDeleted = Boolean(is_deleted);
      if (nextDeleted !== Boolean(comment.is_deleted)) {
        const plate = await LicensePlate.findByPk(comment.plate_id);
        const author = await User.findByPk(comment.user_id);
        if (nextDeleted) {
          if (plate) await plate.update({ comment_count: Math.max(0, (plate.comment_count || 0) - 1) });
          if (author) await author.update({ comment_count: Math.max(0, (author.comment_count || 0) - 1) });
        } else {
          if (plate) await plate.update({ comment_count: (plate.comment_count || 0) + 1 });
          if (author) await author.update({ comment_count: (author.comment_count || 0) + 1 });
        }
        updates.is_deleted = nextDeleted;
      }
    }

    if (Object.keys(updates).length) await comment.update(updates);

    const full = await Comment.findByPk(id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'email', 'display_name'] },
        {
          model: LicensePlate,
          as: 'plate',
          attributes: ['id', 'slug', 'state', 'plate_number', 'display_plate_text'],
        },
      ],
    });
    res.json({ comment: full });
  } catch (e) {
    next(e);
  }
});

router.delete('/comments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid id' });
    const comment = await Comment.findByPk(id);
    if (!comment) return res.status(404).json({ error: 'Not found' });

    const hard = req.query.hard === '1' || req.query.hard === 'true' || req.body?.hard === true;

    if (hard) {
      if (!comment.is_deleted) {
        const plate = await LicensePlate.findByPk(comment.plate_id);
        const author = await User.findByPk(comment.user_id);
        if (plate) await plate.update({ comment_count: Math.max(0, (plate.comment_count || 0) - 1) });
        if (author) await author.update({ comment_count: Math.max(0, (author.comment_count || 0) - 1) });
      }
      // Soft-delete replies first if hard-deleting a parent, then destroy
      await Comment.destroy({ where: { parent_id: id } });
      await Report.destroy({ where: { content_type: 'comment', content_id: id } });
      await comment.destroy();
      return res.json({ ok: true, hard: true });
    }

    if (!comment.is_deleted) {
      const plate = await LicensePlate.findByPk(comment.plate_id);
      const author = await User.findByPk(comment.user_id);
      if (plate) await plate.update({ comment_count: Math.max(0, (plate.comment_count || 0) - 1) });
      if (author) await author.update({ comment_count: Math.max(0, (author.comment_count || 0) - 1) });
      await comment.update({ is_deleted: true, is_flagged: true });
    }
    res.json({ ok: true, hard: false });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
