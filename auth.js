const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

const ROLE_LEVELS = {
  mentee: 1, mentor: 2, cohort_admin: 3, platform_admin: 4, super_admin: 5,
};

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Missing Authorization header' });

  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', decoded.profileId).eq('is_active', true).single();
    if (!profile) return res.status(401).json({ error: 'Account not found or deactivated' });
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== (profile.token_version || 0))
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    req.user = profile;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
  next();
};

const requireLevel = (minRole) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if ((ROLE_LEVELS[req.user.role] || 0) < (ROLE_LEVELS[minRole] || 0))
    return res.status(403).json({ error: `Requires ${minRole} or above` });
  next();
};

module.exports = { auth, requireRole, requireLevel };
