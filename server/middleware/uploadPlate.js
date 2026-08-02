const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const platesDir = path.join(__dirname, '../uploads/plates');
const thumbsDir = path.join(__dirname, '../uploads/thumbs');
[platesDir, thumbsDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, platesDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.originalname);
    if (!ok) return cb(new Error('Only jpg, png, webp, heic allowed'));
    cb(null, true);
  },
});

module.exports = { upload, platesDir, thumbsDir };
