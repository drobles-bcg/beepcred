const express = require('express');
const { Report } = require('../db');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { content_type, content_id, reason, notes } = req.body;
    if (!content_type || !content_id || !reason) {
      return res.status(400).json({ error: 'content_type, content_id, reason required' });
    }
    const allowed = ['plate', 'image', 'comment', 'user'];
    if (!allowed.includes(content_type)) {
      return res.status(400).json({ error: 'Invalid content_type' });
    }
    const report = await Report.create({
      reported_by: req.session.userId,
      content_type,
      content_id,
      reason,
      notes: notes || null,
      status: 'pending',
    });
    res.status(201).json({ report });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
