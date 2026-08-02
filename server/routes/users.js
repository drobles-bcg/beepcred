const express = require('express');
const path = require('path');
const fs = require('fs');
const { User, PlateImage, Comment, LicensePlate } = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { uploadAvatar, avatarsDir } = require('../middleware/uploadAvatar');
const { processAvatar } = require('../lib/imageProcess');
const router = express.Router();

function publicUser(u) {
  if (!u) return null;
  const j = u.toJSON();
  delete j.password_hash;
  return j;
}

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user) return res.status(404).json({ error: 'Not found' });
    const { display_name, bio, votes_visible } = req.body;
    await user.update({
      display_name: display_name !== undefined ? display_name : user.display_name,
      bio: bio !== undefined ? bio : user.bio,
      votes_visible:
        votes_visible !== undefined ? Boolean(votes_visible) : user.votes_visible,
    });
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.post('/me/avatar', requireAuth, uploadAvatar.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'avatar file required' });
    const user = await User.findByPk(req.session.userId);
    const outName = path.parse(req.file.path).name + '_sm.jpg';
    const outPath = path.join(avatarsDir, outName);
    await processAvatar(req.file.path, outPath);
    fs.unlink(req.file.path, () => {});
    const url = `/uploads/avatars/${outName}`;
    await user.update({ avatar_url: url });
    res.json({ avatar_url: url });
  } catch (e) {
    next(e);
  }
});

router.get('/:username', async (req, res, next) => {
  try {
    const username = String(req.params.username).trim().toLowerCase();
    const user = await User.findOne({ where: { username } });
    if (!user || user.is_banned) return res.status(404).json({ error: 'User not found' });
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.get('/:username/submissions', async (req, res, next) => {
  try {
    const username = String(req.params.username).trim().toLowerCase();
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { count, rows } = await PlateImage.findAndCountAll({
      where: { uploaded_by: user.id },
      include: [
        {
          model: LicensePlate,
          as: 'plate',
          attributes: ['state', 'plate_number', 'display_plate_text'],
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

router.get('/:username/comments', async (req, res, next) => {
  try {
    const username = String(req.params.username).trim().toLowerCase();
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { count, rows } = await Comment.findAndCountAll({
      where: { user_id: user.id, is_deleted: false },
      include: [
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
    res.json({ comments: rows, page, limit, total: count });
  } catch (e) {
    next(e);
  }
});

router.get('/:username/votes', async (req, res, next) => {
  try {
    const username = String(req.params.username).trim().toLowerCase();
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(404).json({ error: 'Not found' });
    const isSelf = req.session && req.session.userId === user.id;
    if (!user.votes_visible && !isSelf) {
      return res.status(403).json({ error: 'Votes are private' });
    }
    const { PlateVote, LicensePlate } = require('../db');
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const { count, rows } = await PlateVote.findAndCountAll({
      where: { user_id: user.id },
      include: [{ model: LicensePlate, as: 'plate', attributes: ['id', 'slug', 'state', 'plate_number', 'cred_score'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });
    res.json({ votes: rows, page, limit, total: count });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
