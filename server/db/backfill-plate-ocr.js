/**
 * Run plate OCR on existing plate_images rows (e.g. inventory import before OCR existed).
 * Resolves image_url to server/uploads and writes ocr_plate_text / ocr_confidence.
 *
 * Usage:
 *   node server/db/backfill-plate-ocr.js
 *   node server/db/backfill-plate-ocr.js --force        # re-run even if ocr_plate_text is set
 *   node server/db/backfill-plate-ocr.js --limit 5      # process at most 5 rows
 *
 * Env: DISABLE_PLATE_OCR=1 skips work (no-op updates).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { sequelize, PlateImage } = require('./index');
const {
  recognizePlateFromImagePath,
  terminatePlateOcrWorker,
} = require('../lib/plateOcr');

const serverRoot = path.join(__dirname, '..');
const force = process.argv.includes('--force');
let limit = null;
const li = process.argv.indexOf('--limit');
if (li !== -1 && process.argv[li + 1]) {
  limit = Math.max(1, parseInt(process.argv[li + 1], 10) || 0) || null;
}
const limitEq = process.argv.find((a) => a.startsWith('--limit='));
if (limitEq) {
  limit = Math.max(1, parseInt(limitEq.split('=')[1], 10) || 0) || null;
}

function resolveImagePath(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const trimmed = imageUrl.trim();
  if (!trimmed.startsWith('/uploads/')) return null;
  const abs = path.join(serverRoot, trimmed.replace(/^\//, ''));
  return abs;
}

async function run() {
  const where = force
    ? {}
    : {
        [Op.or]: [{ ocr_plate_text: null }, { ocr_plate_text: '' }],
      };

  const query = {
    where,
    order: [['created_at', 'ASC']],
  };
  if (limit) query.limit = limit;

  const rows = await PlateImage.findAll(query);

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const img of rows) {
    const abs = resolveImagePath(img.image_url);
    if (!abs) {
      skipped += 1;
      continue;
    }
    if (!fs.existsSync(abs)) {
      missing += 1;
      console.warn('missing file', img.id, abs);
      continue;
    }

    const ocr = await recognizePlateFromImagePath(abs);
    await img.update({
      ocr_plate_text: ocr.normalized,
      ocr_confidence: ocr.confidence,
    });
    updated += 1;
    console.log(
      `${img.id.slice(0, 8)}… ${path.basename(abs)} → ${ocr.normalized || '(none)'} conf=${ocr.confidence ?? 'n/a'}`
    );
  }

  console.log(
    JSON.stringify({ total: rows.length, updated, skipped_no_url: skipped, missing_file: missing }, null, 2)
  );
  await terminatePlateOcrWorker();
  await sequelize.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
