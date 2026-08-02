require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const {
  sequelize,
  User,
  LicensePlate,
  PlateImage,
  PlateVote,
  Comment,
} = require('./index.js');
const { buildSlug, normalizePlateNumber, normalizeState } = require('../lib/plateUtils');
const { recalcPlateVoteAggregates } = require('../services/cred.js');

const SALT = 12;

async function ensureDirs() {
  const platesDir = path.join(__dirname, '../uploads/plates');
  const thumbsDir = path.join(__dirname, '../uploads/thumbs');
  [platesDir, thumbsDir].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function writePlaceholderJpeg(baseName) {
  const buf = Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
    'base64',
  );
  const displayPath = path.join(__dirname, '../uploads/plates', `${baseName}_display.jpg`);
  const thumbPath = path.join(__dirname, '../uploads/thumbs', `${baseName}_thumb.jpg`);
  fs.writeFileSync(displayPath, buf);
  fs.writeFileSync(thumbPath, buf);
  return {
    image_url: `/uploads/plates/${baseName}_display.jpg`,
    thumbnail_url: `/uploads/thumbs/${baseName}_thumb.jpg`,
  };
}

async function seed() {
  await ensureDirs();
  await sequelize.sync({ alter: true });

  const adminPass = await bcrypt.hash('admin', SALT);
  const modPass = await bcrypt.hash('mod', SALT);
  const userPass = await bcrypt.hash('user', SALT);

  const [uAdmin] = await User.findOrCreate({
    where: { username: 'admin' },
    defaults: {
      email: 'admin@beepcred.local',
      password_hash: adminPass,
      display_name: 'Admin',
      role: 'admin',
    },
  });
  const [uMod] = await User.findOrCreate({
    where: { username: 'mod' },
    defaults: {
      email: 'mod@beepcred.local',
      password_hash: modPass,
      display_name: 'Moderator',
      role: 'moderator',
    },
  });
  const [uUser] = await User.findOrCreate({
    where: { username: 'user' },
    defaults: {
      email: 'user@beepcred.local',
      password_hash: userPass,
      display_name: 'Test User',
      role: 'user',
    },
  });

  const voters = [uAdmin, uMod, uUser];

  const platesData = [
    { state: 'CA', num: 'BEEP1', make: 'Toyota', model: 'Camry', year: 2020, color: 'Silver' },
    { state: 'CA', num: 'BADDRV', make: 'Honda', model: 'Civic', year: 2019, color: 'Black' },
    { state: 'TX', num: 'LONSTR', make: 'Ford', model: 'F-150', year: 2021, color: 'Blue' },
    { state: 'NY', num: 'NYC001', make: 'Tesla', model: 'Model 3', year: 2022, color: 'White' },
    { state: 'FL', num: 'SUNFUN', make: 'BMW', model: '3 Series', year: 2018, color: 'Gray' },
    { state: 'WA', num: 'RAIN01', make: 'Subaru', model: 'Outback', year: 2020, color: 'Green' },
    { state: 'NV', num: 'VEGAS1', make: 'Jeep', model: 'Wrangler', year: 2021, color: 'Red' },
    { state: 'OR', num: 'PDX007', make: 'Volvo', model: 'XC90', year: 2019, color: 'Black' },
    { state: 'AZ', num: 'HOTDRV', make: 'Ram', model: '1500', year: 2022, color: 'White' },
    { state: 'CO', num: 'ROCKY1', make: 'Chevrolet', model: 'Silverado', year: 2020, color: 'Blue' },
    { state: 'IL', num: 'CHI001', make: 'Hyundai', model: 'Elantra', year: 2017, color: 'Silver' },
    { state: 'MA', num: 'BOS001', make: 'Mazda', model: 'CX-5', year: 2021, color: 'Red' },
  ];

  const plates = [];
  for (const pd of platesData) {
    const st = normalizeState(pd.state);
    const pn = normalizePlateNumber(pd.num);
    const slug = buildSlug(st, pn);
    const [lp, created] = await LicensePlate.findOrCreate({
      where: { plate_number: pn, state: st, country: 'US' },
      defaults: {
        slug,
        make: pd.make,
        model: pd.model,
        year: pd.year,
        color: pd.color,
        body_type: 'sedan',
        first_seen_at: new Date(),
        last_seen_at: new Date(),
      },
    });
    if (created) plates.push(lp);
    else plates.push(lp);
  }

  const reasons = [
    'cool_plate',
    'funny_plate',
    'nice_car',
    'polite_driver',
    'bad_parking',
    'speeding',
    'cut_off',
    'aggressive',
  ];

  for (let i = 0; i < plates.length; i++) {
    const lp = plates[i];
    const baseId = `seed-${lp.id.slice(0, 8)}`;
    const urls = writePlaceholderJpeg(baseId);
    const uid = voters[i % 3].id;
    const existing = await PlateImage.findOne({ where: { plate_id: lp.id } });
    if (!existing) {
      const img = await PlateImage.create({
        plate_id: lp.id,
        uploaded_by: uid,
        image_url: urls.image_url,
        thumbnail_url: urls.thumbnail_url,
        original_filename: 'seed.jpg',
        file_size_bytes: 1000,
        width: 800,
        height: 600,
        caption: 'Seed image',
        is_primary: true,
        is_approved: i % 4 !== 0,
        uploaded_at: new Date(),
      });
      await lp.update({ primary_image_id: img.id, post_count: 1, last_seen_at: new Date() });
    }
  }

  let vi = 0;
  for (const lp of plates) {
    for (const v of voters) {
      const vote = vi % 11 === 0 ? -1 : 1;
      const reason_tag = reasons[vi % reasons.length];
      await PlateVote.findOrCreate({
        where: { plate_id: lp.id, user_id: v.id },
        defaults: { vote, reason_tag },
      });
      vi += 1;
    }
    await recalcPlateVoteAggregates(lp.id);
  }

  for (let i = 0; i < 32; i++) {
    const lp = plates[i % plates.length];
    const author = i % 2 === 0 ? uUser : uAdmin;
    await Comment.create({
      plate_id: lp.id,
      user_id: author.id,
      body: `Seed comment ${i + 1} — spotted on the road.`,
    });
  }

  for (const lp of plates) {
    const n = await Comment.count({ where: { plate_id: lp.id, is_deleted: false } });
    await lp.update({ comment_count: n });
  }

  console.log('Seed completed. Users: admin/admin, mod/mod, user/user');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
