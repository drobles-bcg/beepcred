const { User } = require('../db');

async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const user = await User.findByPk(req.session.userId);
    if (!user || user.is_banned) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (user.role !== 'admin' && user.role !== 'moderator') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.adminUser = user;
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = { requireAdmin };
