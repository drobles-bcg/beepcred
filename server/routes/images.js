const express = require('express');
const { ImageVote, PlateImage, User } = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { isUUID } = require('../lib/uuid');
const { recalcImageVoteAggregates, recalcUserCred } = require('../services/cred');

const router = express.Router();

router.post('/:imageId/votes', requireAuth, async (req, res, next) => {
  try {
    const { imageId } = req.params;
    if (!isUUID(imageId)) return res.status(400).json({ error: 'Invalid id' });
    let { vote } = req.body;
    vote = parseInt(vote, 10);
    if (vote !== 1 && vote !== -1 && vote !== 0) {
      return res.status(400).json({ error: 'vote must be 1, -1, or 0' });
    }
    const image = await PlateImage.findByPk(imageId);
    if (!image) return res.status(404).json({ error: 'Not found' });

    const existing = await ImageVote.findOne({
      where: { image_id: imageId, user_id: req.session.userId },
    });

    if (vote === 0) {
      if (existing) await existing.destroy();
    } else if (existing) {
      await existing.update({ vote });
    } else {
      await ImageVote.create({
        image_id: imageId,
        user_id: req.session.userId,
        vote,
      });
    }

    await recalcImageVoteAggregates(imageId);
    const uploader = await User.findByPk(image.uploaded_by);
    if (uploader) await recalcUserCred(uploader.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
