const express = require('express');
const { Comment, User, LicensePlate } = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { isUUID } = require('../lib/uuid');
const { CommentVote } = require('../db');
const { recalcCommentVoteAggregates, recalcUserCred } = require('../services/cred');

const router = express.Router();

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid id' });
    const comment = await Comment.findByPk(id);
    if (!comment) return res.status(404).json({ error: 'Not found' });
    if (comment.is_deleted) return res.status(404).json({ error: 'Not found' });
    if (comment.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { body } = req.body;
    if (!body || !String(body).trim()) return res.status(400).json({ error: 'body required' });
    await comment.update({ body: String(body).trim() });
    res.json({ comment });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid id' });
    const comment = await Comment.findByPk(id);
    if (!comment || comment.is_deleted) return res.status(404).json({ error: 'Not found' });
    const user = await User.findByPk(req.session.userId);
    const isAdmin = user && (user.role === 'admin' || user.role === 'moderator');
    if (comment.user_id !== req.session.userId && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!comment.is_deleted) {
      const plate = await LicensePlate.findByPk(comment.plate_id);
      if (plate) await plate.update({ comment_count: Math.max(0, plate.comment_count - 1) });
      const author = await User.findByPk(comment.user_id);
      if (author) await author.update({ comment_count: Math.max(0, author.comment_count - 1) });
    }
    await comment.update({ is_deleted: true });
    await recalcUserCred(comment.user_id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/votes', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid id' });
    let { vote } = req.body;
    vote = parseInt(vote, 10);
    if (vote !== 1 && vote !== -1 && vote !== 0) {
      return res.status(400).json({ error: 'vote must be 1, -1, or 0' });
    }
    const comment = await Comment.findByPk(id);
    if (!comment || comment.is_deleted) return res.status(404).json({ error: 'Not found' });

    const existing = await CommentVote.findOne({
      where: { comment_id: id, user_id: req.session.userId },
    });

    if (vote === 0) {
      if (existing) await existing.destroy();
    } else if (existing) {
      await existing.update({ vote });
    } else {
      await CommentVote.create({
        comment_id: id,
        user_id: req.session.userId,
        vote,
      });
    }

    await recalcCommentVoteAggregates(id);
    const author = await User.findByPk(comment.user_id);
    if (author) await recalcUserCred(author.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** Reply shortcut — same as POST /api/plates/:pid/comments with parent_id */
router.post('/:id/replies', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid id' });
    const parent = await Comment.findByPk(id);
    if (!parent || parent.is_deleted) return res.status(404).json({ error: 'Not found' });
    if (parent.parent_id) {
      return res.status(400).json({ error: 'Only one level of replies' });
    }
    const { body } = req.body;
    if (!body || !String(body).trim()) return res.status(400).json({ error: 'body required' });

    const plate = await LicensePlate.findByPk(parent.plate_id);
    const comment = await Comment.create({
      plate_id: parent.plate_id,
      user_id: req.session.userId,
      parent_id: parent.id,
      body: String(body).trim(),
    });
    await plate.update({ comment_count: plate.comment_count + 1 });
    const user = await User.findByPk(req.session.userId);
    await user.update({ comment_count: user.comment_count + 1 });

    const full = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
    });
    res.status(201).json({ comment: full });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
