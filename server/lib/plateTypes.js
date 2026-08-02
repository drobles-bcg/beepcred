/** Specialty / registration plate categories (multi-select). */
const PLATE_TYPES = [
  'dealer',
  'vanity',
  'temporary',
  'paper',
  'motorcycle',
  'commercial',
  'trailer',
  'government',
  'military',
  'disability',
  'antique',
  'farm',
  'specialty',
  'transporter',
  'manufacturer',
  'diplomatic',
  'apprentice',
  'rental',
];

function normalizePlateTypes(input) {
  if (input == null || input === '') return [];
  let list = input;
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      list = Array.isArray(parsed) ? parsed : input.split(/[,|]/);
    } catch {
      list = input.split(/[,|]/);
    }
  }
  if (!Array.isArray(list)) return [];
  const allowed = new Set(PLATE_TYPES);
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    const t = String(raw || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
    if (!t || !allowed.has(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function serializePlateTypes(types) {
  const normalized = normalizePlateTypes(types);
  return normalized.length ? JSON.stringify(normalized) : null;
}

function parsePlateTypes(stored) {
  return normalizePlateTypes(stored);
}

function mergePlateTypes(existing, incoming) {
  return normalizePlateTypes([...(parsePlateTypes(existing) || []), ...(incoming || [])]);
}

module.exports = {
  PLATE_TYPES,
  normalizePlateTypes,
  serializePlateTypes,
  parsePlateTypes,
  mergePlateTypes,
};
