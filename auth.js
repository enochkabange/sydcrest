const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Role hierarchy: super_admin > platform_admin > cohort_admin > mentor > mentee
const ROLE_LEVELS = {
  mentee: 1,
  mentor: 2,
  cohort_admin: 3,
  platform_admin: 4,
  super_admin: 5,
};

// ── JWT auth ──────────────────────────────────────────────────
const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', decoded.profileId)
      .eq('is_active', true)
      .single();

    if (error || !profile)
      return res.status(401).json({ error: 'Account not found or deactivated' });

    // Check token version (allows forced logout on password change)
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== profile.token_version)
      return res.status(401).json({ error: 'Session expired. Please log in again.' });

    req.user = profile;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Optional auth (doesn't fail if no token) ─────────────────
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', decoded.profileId).single();
    if (profile) req.user = profile;
  } catch {}
  next();
};

// ── Role guard ────────────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}`, your_role: req.user.role });
  next();
};

// ── Minimum role level (includes higher roles automatically) ──
const requireLevel = (minRole) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const userLevel = ROLE_LEVELS[req.user.role] || 0;
  const requiredLevel = ROLE_LEVELS[minRole] || 0;
  if (userLevel < requiredLevel)
    return res.status(403).json({ error: `Requires ${minRole} or above`, your_role: req.user.role });
  next();
};

// ── Cohort ownership check ─────────────────────────────────────
const ownsCohort = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (['platform_admin', 'super_admin'].includes(req.user.role)) return next();

  const cohortId = req.params.cohortId || req.body.cohort_id || req.query.cohort_id;
  if (!cohortId) return res.status(400).json({ error: 'cohort_id required' });

  const { data } = await supabase.from('cohorts').select('mentor_id').eq('id', cohortId).single();
  if (!data || data.mentor_id !== req.user.id)
    return res.status(403).json({ error: 'You do not own this cohort' });
  next();
};

// ── Audit log middleware ───────────────────────────────────────
const audit = (action) => async (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode < 400) {
      supabase.from('audit_logs').insert({
        user_id: req.user?.id,
        action,
        resource_type: req.params.id ? 'item' : 'collection',
        resource_id: req.params.id,
        ip: req.ip,
        user_agent: req.headers['user-agent'],
        request_id: req.id,
        metadata: { method: req.method, path: req.path, status: res.statusCode },
      }).then(() => {}).catch(() => {});
    }
  });
  next();
};

module.exports = { auth, optionalAuth, requireRole, requireLevel, ownsCohort, audit, ROLE_LEVELS };
