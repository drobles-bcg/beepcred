require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { sequelize, User, LicensePlate, PlateImage } = require('./index');
const { buildSlug } = require('../lib/plateUtils');
const { processPlateImage } = require('../lib/imageProcess');
const { platesDir, thumbsDir } = require('../middleware/uploadPlate');

const SOURCE_DIR = process.argv[2];
const IMPORT_STATE = (process.env.IMPORT_STATE || 'CA').toUpperCase();
const IMPORT_COUNTRY = (process.env.IMPORT_COUNTRY || 'US').toUpperCase();

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|heic|heif)$/i;

function toPlateFromFilename(filename, index) {
  const stem = path.parse(filename).name;
  const hash = crypto.createHash('md5').update(stem).digest('hex').slice(0, 8).toUpperCase();
  // Keep within plate length; deterministic but readable.
  return `INV${hash}${String(index % 10)}`;
}

function listFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXT_RE.test(f))
    .map((f) => path.join(dir, f));
}

async function getImporterUser() {
  const byName = await User.findOne({ where: { username: 'admin' } });
  if (byName) return byName;
  const first = await User.findOne({ order: [['created_at', 'ASC']] });
  if (!first) throw new Error('No users exist. Seed users first.');
  return first;
}

async function importOne(filePath, index, uploaderId) {
  const filename = path.basename(filePath);
  const plateNumber = toPlateFromFilename(filename, index);
  const slug = buildSlug(IMPORT_STATE, plateNumber);

  const [plate] = await LicensePlate.findOrCreate({
    where: { plate_number: plateNumber, state: IMPORT_STATE, country: IMPORT_COUNTRY },
    defaults: {
      slug,
      first_seen_at: new Date(),
      last_seen_at: new Date(),
      body_type: 'other',
    },
  });

  const existingImage = await PlateImage.findOne({
    where: {
      plate_id: plate.id,
      original_filename: filename,
    },
  });
  if (existingImage) {
    return { status: 'skipped', plate: plateNumber, file: filename };
  }

  const baseId = crypto
    .createHash('sha1')
    .update(filePath)
    .digest('hex')
    .slice(0, 12);
  const processed = await processPlateImage(filePath, baseId, platesDir, thumbsDir);

  const img = await PlateImage.create({
    plate_id: plate.id,
    uploaded_by: uploaderId,
    image_url: processed.image_url,
    thumbnail_url: processed.thumbnail_url,
    original_filename: filename,
    file_size_bytes: processed.file_size_bytes,
    width: processed.width,
    height: processed.height,
    is_primary: !plate.primary_image_id,
    is_approved: true,
    shot_type: 'plate',
    uploaded_at: new Date(),
  });

  const updates = {
    last_seen_at: new Date(),
    post_count: (plate.post_count || 0) + 1,
  };
  if (!plate.primary_image_id) {
    updates.primary_image_id = img.id;
  }
  await plate.update(updates);

  return { status: 'imported', plate: plateNumber, file: filename };
}

async function run() {
  if (!SOURCE_DIR) {
    throw new Error('Usage: node server/db/import-photo-inventory.js "/absolute/path/to/photos"');
  }
  if (!fs.existsSync(SOURCE_DIR)) {
    throw new Error(`Source directory not found: ${SOURCE_DIR}`);
  }

  await sequelize.sync();
  const uploader = await getImporterUser();
  const files = listFiles(SOURCE_DIR);
  if (files.length === 0) {
    console.log('No importable image files found.');
    return;
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i += 1) {
    const f = files[i];
    try {
      const res = await importOne(f, i, uploader.id);
      if (res.status === 'imported') imported += 1;
      else skipped += 1;
      console.log(`${res.status.toUpperCase()}: ${res.file} -> ${IMPORT_STATE}-${res.plate}`);
    } catch (err) {
      failed += 1;
      console.error(`FAILED: ${path.basename(f)} -> ${err.message}`);
    }
  }

  console.log(`Done. Imported=${imported} Skipped=${skipped} Failed=${failed}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

