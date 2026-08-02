/**
 * Normalize plate number for matching/indexing:
 * uppercase and keep only A-Z/0-9.
 */
function normalizePlateNumber(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Preserve user-visible plate text (can include emoji/symbols).
 */
function normalizeDisplayPlateText(raw) {
  if (raw === undefined || raw === null) return null;
  const text = String(raw).trim().replace(/\s+/g, ' ');
  return text || null;
}

/**
 * US state code uppercased 2 letters
 */
function normalizeState(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toUpperCase().slice(0, 2);
}

/**
 * Slug: ca-abc123 (state lower + hyphen + normalized plate upper)
 */
function buildSlug(state, plateNumber) {
  const st = normalizeState(state);
  const num = normalizePlateNumber(plateNumber);
  return `${st.toLowerCase()}-${num}`;
}

module.exports = {
  normalizePlateNumber,
  normalizeDisplayPlateText,
  normalizeState,
  buildSlug,
};
