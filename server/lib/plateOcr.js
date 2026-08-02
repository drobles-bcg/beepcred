const sharp = require('sharp');

/**
 * Local plate OCR: Sharp preprocess + tesseract.js (bundled, no system install).
 * Uses bottom-band crop + full-frame; keeps best-confidence result with a plausible token.
 */

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = require('tesseract.js');
      const w = await createWorker('eng');
      await w.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      });
      return w;
    })();
  }
  return workerPromise;
}

function bestPlateToken(raw) {
  const upper = String(raw || '').toUpperCase();
  const matches = upper.match(/[A-Z0-9]{4,10}/g);
  if (!matches || !matches.length) return null;
  matches.sort((a, b) => b.length - a.length);
  return matches[0];
}

async function preprocessForOcr(imagePath, mode) {
  const meta = await sharp(imagePath).metadata();
  const w = meta.width || 1200;
  const h = meta.height || 800;

  let pipeline = sharp(imagePath).rotate();

  if (mode === 'bottom') {
    const bandH = Math.max(Math.round(h * 0.32), 120);
    const top = Math.max(0, h - bandH);
    pipeline = pipeline.extract({
      left: 0,
      top,
      width: w,
      height: Math.min(bandH, h - top),
    });
  }

  return pipeline
    .resize({ width: 1600, withoutEnlargement: true })
    .greyscale()
    .normalize()
    .sharpen()
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function runRecognize(buffer) {
  const worker = await getWorker();
  const { data } = await worker.recognize(buffer);
  const raw = String(data.text || '')
    .replace(/\s+/g, ' ')
    .trim();
  const token = bestPlateToken(raw);
  const { normalizePlateNumber } = require('./plateUtils');
  const normalized =
    token && token.length >= 4 ? normalizePlateNumber(token) : null;
  const confidence =
    typeof data.confidence === 'number' && !Number.isNaN(data.confidence)
      ? data.confidence
      : null;

  return {
    rawText: raw.length ? raw : null,
    normalized: normalized && normalized.length >= 4 ? normalized : null,
    confidence,
  };
}

function pickBetter(a, b) {
  const score = (r) => {
    if (r.normalized) return (r.confidence || 0) + 100;
    return r.confidence || 0;
  };
  return score(b) > score(a) ? b : a;
}

/**
 * @returns {Promise<{ rawText: string|null, normalized: string|null, confidence: number|null }>}
 */
async function recognizePlateFromImagePath(imagePath) {
  if (process.env.DISABLE_PLATE_OCR === '1') {
    return { rawText: null, normalized: null, confidence: null };
  }

  try {
    const [bottomBuf, fullBuf] = await Promise.all([
      preprocessForOcr(imagePath, 'bottom'),
      preprocessForOcr(imagePath, 'full'),
    ]);
    const bottom = await runRecognize(bottomBuf);
    const full = await runRecognize(fullBuf);
    return pickBetter(bottom, full);
  } catch (e) {
    return { rawText: null, normalized: null, confidence: null };
  }
}

/** Call after batch scripts so Node can exit (tesseract worker keeps the event loop open). */
async function terminatePlateOcrWorker() {
  if (!workerPromise) return;
  try {
    const w = await workerPromise;
    await w.terminate();
  } catch (_) {
    /* ignore */
  }
  workerPromise = null;
}

module.exports = {
  recognizePlateFromImagePath,
  terminatePlateOcrWorker,
};
