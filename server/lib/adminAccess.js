const OWNER_ADMIN_EMAIL = 'danieljrobles@gmail.com';

function canAccessAdmin(user) {
  if (!user || !user.email) return false;
  return String(user.email).trim().toLowerCase() === OWNER_ADMIN_EMAIL;
}

module.exports = { OWNER_ADMIN_EMAIL, canAccessAdmin };
