const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SERVER_ROOT = path.join(__dirname, '..');

function resolveImageAbsoluteUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const trimmed = imageUrl.trim();
  if (!trimmed.startsWith('/uploads/')) return null;
  const abs = path.join(SERVER_ROOT, trimmed.replace(/^\//, ''));
  return fs.existsSync(abs) ? abs : null;
}

async function imageToDataUrlJpeg(imagePath) {
  const buf = await sharp(imagePath).rotate().jpeg({ quality: 86 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function analyzePlateImageWithOpenAI(imagePath) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    const err = new Error('OPENAI_API_KEY not configured');
    err.code = 'NO_KEY';
    throw err;
  }
  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
  const detail =
    process.env.OPENAI_VISION_DETAIL === 'high' || process.env.OPENAI_VISION_DETAIL === 'auto'
      ? process.env.OPENAI_VISION_DETAIL
      : 'low';

  const dataUrl = await imageToDataUrlJpeg(imagePath);

  const system = `You are a vision assistant for a license-plate community app. Analyze the main photo. Output ONLY valid minified JSON (no markdown) with exactly this shape:
{
  "plate": {
    "readText": string,
    "stateOrRegionGuess": string | null,
    "confidence": "high" | "medium" | "low"
  },
  "vehicle": {
    "make": string | null,
    "model": string | null,
    "year": number | null,
    "color": string | null,
    "bodyType": string | null,
    "confidence": "high" | "medium" | "low",
    "notes": string | null
  },
  "vanity": {
    "isLikelyVanityOrReference": boolean,
    "interpretation": string,
    "possibleMeanings": string[],
    "tone": "pun" | "initials" | "brand_reference" | "pop_culture" | "political" | "in_joke" | "other" | null
  }
}
Rules:
1) plate.readText: read the registration/plate characters visible (include spaces if a vanity plate shows them). If unreadable, best-effort or empty string.
2) vehicle: identify make/model/year/color/body if visible on the car the plate is mounted on. Use null for unknown fields; note limits in vehicle.notes.
3) vanity: If the plate looks like a standard sequential DMV assignment, set isLikelyVanityOrReference false with a short interpretation. Otherwise explain wordplay, initials, references, or jokes; up to 3 possibleMeanings.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this image per the JSON schema.' },
            { type: 'image_url', image_url: { url: dataUrl, detail } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    const err = new Error(`OpenAI error ${res.status}: ${txt.slice(0, 500)}`);
    err.code = 'OPENAI_HTTP';
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  const raw = body.choices?.[0]?.message?.content;
  if (!raw) {
    const err = new Error('Empty OpenAI response');
    err.code = 'OPENAI_EMPTY';
    throw err;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const err = new Error('Invalid JSON from model');
    err.code = 'OPENAI_PARSE';
    throw err;
  }
  return parsed;
}

module.exports = { analyzePlateImageWithOpenAI, resolveImageAbsoluteUrl };
