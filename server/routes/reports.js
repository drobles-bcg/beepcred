const express = require('express');
const { Report, Comment } = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { isUUID } = require('../lib/uuid');

const router = express.Router();

const ALLOWED_TYPES = ['plate', 'image', 'comment', 'user'];
const ALLOWED_REASONS = ['spam', 'harassment', 'false_info', 'inappropriate', 'other'];

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { content_type, content_id, reason, notes } = req.body || {};
    if (!content_type || !content_id || !reason) {
      return res.status(400).json({ error: 'content_type, content_id, reason required' });
    }
    if (!ALLOWED_TYPES.includes(content_type)) {
      return res.status(400).json({ error: 'Invalid content_type' });
    }
    if (!isUUID(String(content_id))) {
      return res.status(400).json({ error: 'Invalid content_id' });
    }
    if (!ALLOWED_REASONS.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason' });
    }

    // Avoid duplicate open reports from the same user on the same target
    const existing = await Report.findOne({
      where: {
        reported_by: req.session.userId,
        content_type,
        content_id,
        status: 'pending',
      },
    });
    if (existing) {
      return res.status(200).json({ report: existing, duplicate: true });
    }

    const report = await Report.create({
      reported_by: req.session.userId,
      content_type,
      content_id,
      reason,
      notes: notes ? String(notes).slice(0, 2000) : null,
      status: 'pending',
    });

    if (content_type === 'comment') {
      const comment = await Comment.findByPk(content_id);
      if (comment && !comment.is_deleted) {
        await comment.update({ is_flagged: true });
      }
    }

    res.status(201).json({ report });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
