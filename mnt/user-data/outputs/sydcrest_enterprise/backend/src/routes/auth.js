const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');
const { notifyWelcome } = require('../services/whatsapp');

function signToken(profileId, tokenVersion = 0) {
  return jwt.sign(
    { profileId, tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('full_name').trim().isLength({ min: 2 }),
  body('role').isIn(['mentee', 'mentor']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, full_name, role, phone, region, device_access } = req.body;

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authError) return res.status(400).json({ error: authError.message });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({ user_id: authData.user.id, email, full_name, role, phone, region, device_access: device_access || 'smartphone' })
      .select().single();
    if (profileError) return res.status(400).json({ error: profileError.message });

    if (role === 'mentor') {
      await supabase.from('mentor_listings').insert({ mentor_id: profile.id, hourly_rate: 50, specialties: [] });
    }

    if (phone && role === 'mentee') {
      notifyWelcome(phone, { menteeName: full_name, cohortName: 'Delta Cohort', mentorName: 'your assigned mentor' }).catch(() => {});
    }

    const token = signToken(profile.id, profile.token_version || 0);
    res.status(201).json({ token, profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: req.body.email, password: req.body.password,
    });
    if (error) return res.status(401).json({ error: 'Invalid email or password' });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .single();

    if (!profile) return res.status(401).json({ error: 'Account deactivated. Contact support.' });

    // Update last_seen_at
    supabase.from('profiles').update({ last_seen_at: new Date() }).eq('id', profile.id).then(() => {});

    const token = signToken(profile.id, profile.token_version || 0);
    res.json({ token, profile });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json({ profile: req.user });
});

// POST /api/auth/refresh
router.post('/refresh', auth, async (req, res) => {
  const token = signToken(req.user.id, req.user.token_version || 0);
  res.json({ token });
});

// POST /api/auth/change-password
router.post('/change-password', auth, [
  body('current_password').notEmpty(),
  body('new_password').isLength({ min: 8 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    // Verify current password by attempting sign-in
    const { error } = await supabase.auth.signInWithPassword({
      email: req.user.email, password: req.body.current_password,
    });
    if (error) return res.status(401).json({ error: 'Current password incorrect' });

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      req.user.user_id, { password: req.body.new_password }
    );
    if (updateError) return res.status(400).json({ error: updateError.message });

    // Invalidate all other sessions
    await supabase.from('profiles')
      .update({ token_version: (req.user.token_version || 0) + 1 })
      .eq('id', req.user.id);

    res.json({ success: true, message: 'Password changed. All other sessions have been logged out.' });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [body('email').isEmail()], async (req, res) => {
  const { data } = await supabase.auth.resetPasswordForEmail(req.body.email, {
    redirectTo: `${process.env.CLIENT_URL}/reset-password`,
  });
  // Always return success to prevent email enumeration
  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
});

module.exports = router;
