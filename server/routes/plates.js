const express = require('express');
const path = require('path');
const fs = require('fs');
const { Op, literal } = require('sequelize');
const {
  LicensePlate,
  PlateImage,
  PlateVote,
  Comment,
  User,
  sequelize,
} = require('../db');
const { requireAuth } = require('../middleware/requireAuth');
const { requireAdmin } = require('../middleware/requireAdmin');
const { upload, platesDir, thumbsDir } = require('../middleware/uploadPlate');
const { processPlateImage } = require('../lib/imageProcess');
const { recognizePlateFromImagePath } = require('../lib/plateOcr');
const {
  normalizePlateNumber,
  normalizeDisplayPlateText,
  normalizeState,
  buildSlug,
} = require('../lib/plateUtils');
const { isUUID } = require('../lib/uuid');
const { recalcPlateVoteAggregates, recalcUserCred } = require('../services/cred');
const { analyzePlateImageWithOpenAI, resolveImageAbsoluteUrl } = require('../lib/plateVisionOpenAi');

const router = express.Router();

const AI_VISION_CACHE_MS = 30 * 24 * 60 * 60 * 1000;

function plateJson(p) {
  if (!p) return null;
  const j = p.toJSON ? p.toJSON() : { ...p };
  if (j.primaryImage) j.primary_image = j.primaryImage;
  return j;
}

/** List feed */
router.get('/', async (req, res, next) => {
  try {
    const sort = req.query.sort || 'recent';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    let order;
    if (sort === 'controversial') {
      order = literal('(plus_count + minus_count) DESC');
    } else if (sort === 'trending') {
      const [rows] = await sequelize.query(
        `
        SELECT lp.id FROM license_plates lp
        LEFT JOIN (
          SELECT plate_id, COUNT(*) AS vc
          FROM plate_votes
          WHERE created_at > datetime('now', '-1 day')
          GROUP BY plate_id
        ) pv ON pv.plate_id = lp.id
        LEFT JOIN (
          SELECT plate_id, COUNT(*) AS cc
          FROM comments
          WHERE is_deleted = 0 AND created_at > datetime('now', '-1 day')
          GROUP BY plate_id
        ) c ON c.plate_id = lp.id
        ORDER BY (COALESCE(pv.vc, 0) * 3 + COALESCE(c.cc, 0) * 2) DESC, lp.last_seen_at DESC
        LIMIT ? OFFSET ?
        `,
        { replacements: [limit, offset] }
      );
      const ids = rows.map((r) => r.id);
      if (ids.length === 0) {
        return res.json({ plates: [], page, limit, total: 0 });
      }
      const plates = await LicensePlate.findAll({
        where: { id: { [Op.in]: ids } },
        include: [
          {
            model: PlateImage,
            as: 'primaryImage',
            required: false,
            include: [{ model: User, as: 'uploader', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
          },
        ],
      });
      const map = new Map(plates.map((p) => [p.id, p]));
      const ordered = ids.map((id) => map.get(id)).filter(Boolean);
      return res.json({ plates: ordered.map(plateJson), page, limit });
    } else {
      order = [['last_seen_at', 'DESC']];
    }

    const { count, rows } = await LicensePlate.findAndCountAll({
      order,
      limit,
      offset,
      include: [
        {
          model: PlateImage,
          as: 'primaryImage',
          required: false,
          include: [{ model: User, as: 'uploader', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
        },
      ],
    });

    res.json({
      plates: rows.map(plateJson),
      page,
      limit,
      total: count,
    });
  } catch (e) {
    next(e);
  }
});

/** Create or return existing plate */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const country = (req.body.country || 'US').toUpperCase().slice(0, 8);
    const state = normalizeState(req.body.state);
    const plate_number = normalizePlateNumber(req.body.plate_number);
    const display_plate_text = normalizeDisplayPlateText(req.body.display_plate_text || req.body.plate_number);
    if (!state || state.length !== 2 || !plate_number) {
      return res.status(400).json({ error: 'Valid state and plate_number required' });
    }
    const slug = buildSlug(state, plate_number);
    let plate = await LicensePlate.findOne({
      where: { plate_number, state, country },
    });
    const now = new Date();
    if (!plate) {
      plate = await LicensePlate.create({
        plate_number,
        display_plate_text,
        state,
        country,
        slug,
        make: req.body.make || null,
        model: req.body.model || null,
        year: req.body.year ? parseInt(req.body.year, 10) : null,
        color: req.body.color || null,
        body_type: req.body.body_type || 'other',
        first_seen_at: now,
        last_seen_at: now,
      });
      return res.status(201).json({ plate: plateJson(plate), created: true });
    }
    if (!plate.display_plate_text && display_plate_text) {
      await plate.update({ display_plate_text });
    }
    return res.json({ plate: plateJson(plate), created: false });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/images', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid plate id' });
    const images = await PlateImage.findAll({
      where: { plate_id: id },
      include: [{ model: User, as: 'uploader', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
      order: [['uploaded_at', 'DESC']],
    });
    res.json({ images });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/images', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid plate id' });
    if (!req.file) return res.status(400).json({ error: 'image file required' });

    const plate = await LicensePlate.findByPk(id);
    if (!plate) return res.status(404).json({ error: 'Plate not found' });

    const user = await User.findByPk(req.session.userId);
    if (!user || user.is_banned) return res.status(403).json({ error: 'Forbidden' });

    const baseId = path.parse(req.file.filename).name;
    const ocr = await recognizePlateFromImagePath(req.file.path);
    let urls;
    try {
      urls = await processPlateImage(req.file.path, baseId, platesDir, thumbsDir);
    } catch (err) {
      fs.unlink(req.file.path, () => {});
      throw err;
    }
    fs.unlink(req.file.path, () => {});

    const img = await PlateImage.create({
      plate_id: plate.id,
      uploaded_by: user.id,
      image_url: urls.image_url,
      thumbnail_url: urls.thumbnail_url,
      original_filename: req.file.originalname,
      file_size_bytes: urls.file_size_bytes,
      width: urls.width,
      height: urls.height,
      caption: req.body.caption || null,
      shot_type: req.body.shot_type || 'plate',
      city: req.body.city || null,
      state_location: req.body.state_location || null,
      ocr_plate_text: ocr.normalized,
      ocr_confidence: ocr.confidence,
      is_primary: !plate.primary_image_id,
      uploaded_at: new Date(),
    });

    if (!plate.primary_image_id) {
      await plate.update({ primary_image_id: img.id });
    }
    await plate.update({
      last_seen_at: new Date(),
      post_count: plate.post_count + 1,
    });
    await user.update({ post_count: user.post_count + 1 });
    await recalcUserCred(user.id);

    res.status(201).json({ image: img });
  } catch (e) {
    next(e);
  }
});

router.delete('/:plateId/images/:imageId', requireAuth, async (req, res, next) => {
  try {
    const { plateId, imageId } = req.params;
    if (!isUUID(plateId) || !isUUID(imageId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const image = await PlateImage.findOne({ where: { id: imageId, plate_id: plateId } });
    if (!image) return res.status(404).json({ error: 'Not found' });
    const user = await User.findByPk(req.session.userId);
    const isAdmin = user && (user.role === 'admin' || user.role === 'moderator');
    if (image.uploaded_by !== req.session.userId && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const plate = await LicensePlate.findByPk(plateId);
    await image.destroy();
    if (plate.primary_image_id === imageId) {
      const nextImg = await PlateImage.findOne({
        where: { plate_id: plateId },
        order: [['uploaded_at', 'DESC']],
      });
      await plate.update({ primary_image_id: nextImg ? nextImg.id : null });
    }
    await plate.update({ post_count: Math.max(0, plate.post_count - 1) });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/votes', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid plate id' });
    const plate = await LicensePlate.findByPk(id, { attributes: ['id', 'cred_score', 'plus_count', 'minus_count'] });
    if (!plate) return res.status(404).json({ error: 'Not found' });
    let myVote = null;
    if (req.session && req.session.userId) {
      myVote = await PlateVote.findOne({
        where: { plate_id: id, user_id: req.session.userId },
      });
    }
    const voters = await PlateVote.count({ where: { plate_id: id } });
    res.json({
      summary: {
        cred_score: plate.cred_score,
        plus_count: plate.plus_count,
        minus_count: plate.minus_count,
        voter_count: voters,
      },
      my_vote: myVote
        ? { vote: myVote.vote, reason_tag: myVote.reason_tag }
        : null,
    });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/votes', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid plate id' });
    let { vote, reason_tag } = req.body;
    vote = parseInt(vote, 10);
    if (vote !== 1 && vote !== -1 && vote !== 0) {
      return res.status(400).json({ error: 'vote must be 1, -1, or 0 to remove' });
    }
    const plate = await LicensePlate.findByPk(id);
    if (!plate) return res.status(404).json({ error: 'Not found' });

    const existing = await PlateVote.findOne({
      where: { plate_id: id, user_id: req.session.userId },
    });

    const allowedTags = PlateVote.REASON_TAGS || [];
    if (reason_tag && !allowedTags.includes(reason_tag)) {
      return res.status(400).json({ error: 'Invalid reason_tag' });
    }

    if (vote === 0) {
      if (existing) await existing.destroy();
    } else if (existing) {
      await existing.update({ vote, reason_tag: reason_tag || null });
    } else {
      await PlateVote.create({
        plate_id: id,
        user_id: req.session.userId,
        vote,
        reason_tag: reason_tag || null,
      });
    }

    await recalcPlateVoteAggregates(id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/comments', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid plate id' });
    const sort = req.query.sort || 'newest';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    let order;
    if (sort === 'top') order = [['cred_score', 'DESC'], ['created_at', 'DESC']];
    else if (sort === 'oldest') order = [['created_at', 'ASC']];
    else order = [['created_at', 'DESC']];

    const { count, rows } = await Comment.findAndCountAll({
      where: { plate_id: id, parent_id: null },
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
      order,
      limit,
      offset,
    });

    const replies = await Comment.findAll({
      where: {
        plate_id: id,
        parent_id: { [Op.in]: rows.map((c) => c.id) },
      },
      include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
      order: [['created_at', 'ASC']],
    });

    const replyMap = new Map();
    for (const r of replies) {
      const list = replyMap.get(r.parent_id) || [];
      list.push(r);
      replyMap.set(r.parent_id, list);
    }

    const comments = rows.map((c) => {
      const j = c.toJSON();
      j.replies = (replyMap.get(c.id) || []).map((x) => x.toJSON());
      return j;
    });

    res.json({ comments, page, limit, total: count });
  } catch (e) {
    next(e);
  }
});

router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid plate id' });
    const { body, parent_id } = req.body;
    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'body required' });
    }
    const plate = await LicensePlate.findByPk(id);
    if (!plate) return res.status(404).json({ error: 'Not found' });

    if (parent_id) {
      if (!isUUID(parent_id)) return res.status(400).json({ error: 'Invalid parent_id' });
      const parent = await Comment.findByPk(parent_id);
      if (!parent || parent.plate_id !== id) {
        return res.status(400).json({ error: 'Invalid parent comment' });
      }
      if (parent.parent_id) {
        return res.status(400).json({ error: 'Only one level of replies allowed' });
      }
    }

    const comment = await Comment.create({
      plate_id: id,
      user_id: req.session.userId,
      parent_id: parent_id || null,
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

router.get('/:id/sentiment', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid plate id' });
    const rows = await PlateVote.findAll({
      where: { plate_id: id, reason_tag: { [Op.ne]: null } },
      attributes: ['reason_tag'],
    });
    const breakdown = {};
    for (const r of rows) {
      if (!r.reason_tag) continue;
      breakdown[r.reason_tag] = (breakdown[r.reason_tag] || 0) + 1;
    }
    res.json({ breakdown });
  } catch (e) {
    next(e);
  }
});

router.get('/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid plate id' });
    const [rows] = await sequelize.query(
      `
      SELECT date(created_at) as d,
        SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END) as plus_day,
        SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END) as minus_day
      FROM plate_votes
      WHERE plate_id = ?
      GROUP BY date(created_at)
      ORDER BY d DESC
      LIMIT 30
      `,
      { replacements: [id] }
    );
    res.json({ series: rows });
  } catch (e) {
    next(e);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid plate id' });
    const plate = await LicensePlate.findByPk(id);
    if (!plate) return res.status(404).json({ error: 'Not found' });
    const { make, model, year, color, body_type, display_plate_text } = req.body;
    await plate.update({
      make: make !== undefined ? make : plate.make,
      model: model !== undefined ? model : plate.model,
      year: year !== undefined ? (year ? parseInt(year, 10) : null) : plate.year,
      color: color !== undefined ? color : plate.color,
      body_type: body_type !== undefined ? body_type : plate.body_type,
      display_plate_text:
        display_plate_text !== undefined
          ? normalizeDisplayPlateText(display_plate_text)
          : plate.display_plate_text,
    });
    res.json({ plate: plateJson(plate) });
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid plate id' });
    const plate = await LicensePlate.findByPk(id);
    if (!plate) return res.status(404).json({ error: 'Not found' });
    await plate.destroy();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/** PATCH set primary image */
router.patch('/:plateId/primary-image/:imageId', requireAuth, async (req, res, next) => {
  try {
    const { plateId, imageId } = req.params;
    if (!isUUID(plateId) || !isUUID(imageId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const image = await PlateImage.findOne({ where: { id: imageId, plate_id: plateId } });
    if (!image) return res.status(404).json({ error: 'Not found' });
    const user = await User.findByPk(req.session.userId);
    const isAdmin = user && (user.role === 'admin' || user.role === 'moderator');
    if (image.uploaded_by !== req.session.userId && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await LicensePlate.update({ primary_image_id: imageId }, { where: { id: plateId } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * OpenAI vision: plate text, vehicle guess, vanity interpretation. Cached per image ~30 days.
 * Query: imageId (optional, defaults to primary/latest), refresh=1 to bypass cache.
 */
router.get('/:id/ai-insights', async (req, res, next) => {
  try {
    const { id: plateId } = req.params;
    if (!isUUID(plateId)) return res.status(400).json({ error: 'Invalid plate id' });

    if (
      process.env.DISABLE_AI_PLATE_INSIGHTS === '1' ||
      process.env.DISABLE_AI_PLATE_INSIGHTS === 'true'
    ) {
      return res.json({ configured: false, disabled: true, message: 'AI insights disabled' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.json({ configured: false, message: 'OpenAI not configured' });
    }

    const imageIdQ = req.query.imageId;
    let plateImage;

    if (imageIdQ) {
      if (!isUUID(String(imageIdQ))) return res.status(400).json({ error: 'Invalid imageId' });
      plateImage = await PlateImage.findOne({
        where: { id: imageIdQ, plate_id: plateId },
      });
      if (!plateImage) return res.status(404).json({ error: 'Image not found' });
    } else {
      const plate = await LicensePlate.findByPk(plateId, { attributes: ['id', 'primary_image_id'] });
      if (!plate) return res.status(404).json({ error: 'Plate not found' });
      if (plate.primary_image_id) {
        plateImage = await PlateImage.findByPk(plate.primary_image_id);
      }
      if (!plateImage) {
        plateImage = await PlateImage.findOne({
          where: { plate_id: plateId },
          order: [['uploaded_at', 'DESC']],
        });
      }
      if (!plateImage) return res.status(404).json({ error: 'No image for this plate' });
    }

    const forceRefresh =
      req.query.refresh === '1' || req.query.refresh === 'true' || req.query.refresh === 'yes';
    const now = Date.now();
    const cachedAt = plateImage.ai_vision_at ? new Date(plateImage.ai_vision_at).getTime() : 0;

    if (!forceRefresh && plateImage.ai_vision_payload && now - cachedAt < AI_VISION_CACHE_MS) {
      try {
        const insights = JSON.parse(plateImage.ai_vision_payload);
        return res.json({
          configured: true,
          cached: true,
          imageId: plateImage.id,
          insights,
          generatedAt: plateImage.ai_vision_at,
        });
      } catch {
        /* fall through to regenerate */
      }
    }

    const abs = resolveImageAbsoluteUrl(plateImage.image_url);
    if (!abs) return res.status(400).json({ error: 'Image file missing on disk' });

    let insights;
    try {
      insights = await analyzePlateImageWithOpenAI(abs);
    } catch (e) {
      if (e.code === 'OPENAI_HTTP' || e.code === 'OPENAI_EMPTY' || e.code === 'OPENAI_PARSE') {
        const httpStatus = e.status || 500;
        let message =
          httpStatus === 429
            ? 'OpenAI rate limit or quota exceeded. Add billing or credits at platform.openai.com, then try again.'
            : httpStatus === 401
              ? 'OpenAI rejected the API key. Check OPENAI_API_KEY in .env.'
              : httpStatus === 503
                ? 'OpenAI service temporarily unavailable. Try again later.'
                : 'Could not analyze this photo with OpenAI. Try again later.';
        return res.json({
          configured: true,
          imageId: plateImage.id,
          insights: null,
          analysisError: {
            code: e.code,
            httpStatus,
            message,
          },
        });
      }
      throw e;
    }

    await plateImage.update({
      ai_vision_payload: JSON.stringify(insights),
      ai_vision_at: new Date(),
    });

    return res.json({
      configured: true,
      cached: false,
      imageId: plateImage.id,
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    if (e.code === 'NO_KEY') {
      return res.json({ configured: false, message: 'OpenAI not configured' });
    }
    next(e);
  }
});

/** Single plate by state + plate number — must be last among /:id routes */
router.get('/:state/:plate', async (req, res, next) => {
  try {
    const state = normalizeState(req.params.state);
    const plate_number = normalizePlateNumber(req.params.plate);
    if (!state || state.length !== 2 || !plate_number) {
      return res.status(400).json({ error: 'Invalid plate' });
    }
    const plate = await LicensePlate.findOne({
      where: { state, plate_number, country: 'US' },
      include: [
        {
          model: PlateImage,
          as: 'primaryImage',
          required: false,
          include: [{ model: User, as: 'uploader', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
        },
      ],
    });
    if (!plate) return res.status(404).json({ error: 'Plate not found' });
    await plate.increment('view_count');
    res.json({ plate: plateJson(plate) });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
