const express = require('express');
const { Op } = require('sequelize');
const { LicensePlate, User } = require('../db');

const router = express.Router();

router.get('/plates', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ plates: [] });
    const like = `%${q}%`;
    const plates = await LicensePlate.findAll({
      where: {
        [Op.or]: [
          { plate_number: { [Op.like]: like } },
          { display_plate_text: { [Op.like]: like } },
          { make: { [Op.like]: like } },
          { model: { [Op.like]: like } },
          { slug: { [Op.like]: like } },
        ],
      },
      limit: 30,
      order: [['last_seen_at', 'DESC']],
    });
    res.json({ plates });
  } catch (e) {
    next(e);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (!q) return res.json({ users: [] });
    const like = `%${q}%`;
    const users = await User.findAll({
      where: {
        [Op.or]: [
          { username: { [Op.like]: like } },
          { display_name: { [Op.like]: like } },
        ],
        is_banned: false,
      },
      attributes: { exclude: ['password_hash'] },
      limit: 30,
    });
    res.json({ users });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
