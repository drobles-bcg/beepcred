const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * From multer path on disk, produce display (max 1200w) and thumb (400x300 cover).
 * Returns { image_url, thumbnail_url, width, height, file_size_bytes }
 */
async function processPlateImage(originalPath, baseId, platesDir, thumbsDir) {
  const meta = await sharp(originalPath).metadata();
  const displayName = `${baseId}_display.jpg`;
  const thumbName = `${baseId}_thumb.jpg`;
  const displayPath = path.join(platesDir, displayName);
  const thumbPath = path.join(thumbsDir, thumbName);

  await sharp(originalPath)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(displayPath);

  await sharp(originalPath)
    .rotate()
    .resize(400, 300, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  const displayStat = fs.statSync(displayPath);

  return {
    image_url: `/uploads/plates/${displayName}`,
    thumbnail_url: `/uploads/thumbs/${thumbName}`,
    width: meta.width || null,
    height: meta.height || null,
    file_size_bytes: displayStat.size,
  };
}

async function processAvatar(inputPath, outPath) {
  await sharp(inputPath)
    .rotate()
    .resize(256, 256, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 88 })
    .toFile(outPath);
}

module.exports = { processPlateImage, processAvatar };
