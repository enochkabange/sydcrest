const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { auth, requireLevel, audit } = require('../middleware/auth');

// All admin routes require at least cohort_admin level
router.use(auth, requireLevel('cohort_admin'));

// ── PLATFORM STATS (platform_admin+) ─────────────────────────
router.get('/stats', requireLevel('platform_admin'), async (req, res) => {
  const [mentees, mentors, cohorts, bookings, projects, revenue] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'mentee'),
    supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'mentor'),
    supabase.from('cohorts').select('id', { count: 'exact' }).eq('is_active', true),
    supabase.from('bookings').select('total_amount').eq('payment_status', 'released'),
    supabase.from('projects').select('id', { count: 'exact' }).eq('status', 'approved'),
    supabase.from('bookings').select('total_amount').eq('payment_status', 'released'),
  ]);

  const totalRevenue = (revenue.data || []).reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);
  const platformFee = totalRevenue * 0.15;

  res.json({
    mentees: mentees.count || 0,
    mentors: mentors.count || 0,
    active_cohorts: cohorts.count || 0,
    approved_projects: projects.count || 0,
    total_gmv: totalRevenue.toFixed(2),
    platform_revenue: platformFee.toFixed(2),
  });
});

// ── USER MANAGEMENT (platform_admin+) ─────────────────────────
router.get('/users', requireLevel('platform_admin'), async (req, res) => {
  const { role, region, status, search, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = supabase.from('profiles').select('*', { count: 'estimated' });
  if (role) query = query.eq('role', role);
  if (region) query = query.eq('region', region);
  if (status === 'active') query = query.eq('is_active', true);
  if (status === 'inactive') query = query.eq('is_active', false);
  if (search) query = query.ilike('full_name', `%${search}%`);
  query = query.order('created_at', { ascending: false }).range(offset, offset + parseInt(limit) - 1);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ users: data, total: count, page: parseInt(page), limit: parseInt(limit) });
});

// PATCH /api/admin/users/:id – update user (deactivate, change role)
router.patch('/users/:id', requireLevel('platform_admin'), audit('user.update'), async (req, res) => {
  const allowed = ['is_active', 'role', 'region', 'bio'];
  // super_admin can change roles, platform_admin can only deactivate
  if (req.body.role && req.user.role !== 'super_admin')
    return res.status(403).json({ error: 'Only super_admin can change roles' });

  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data });
});

// POST /api/admin/users/:id/reset-password – force password reset
router.post('/users/:id/reset-password', requireLevel('super_admin'), async (req, res) => {
  // Increment token_version to invalidate all existing JWTs
  await supabase.from('profiles').update({ token_version: supabase.sql`coalesce(token_version, 0) + 1` }).eq('id', req.params.id);
  res.json({ success: true, message: 'All sessions invalidated. User must log in again.' });
});

// ── COHORT MANAGEMENT ─────────────────────────────────────────
router.get('/cohorts', async (req, res) => {
  let query = supabase.from('cohorts').select('*, profiles!mentor_id(full_name, email), enrollments(count)');
  // cohort_admin only sees their own cohorts
  if (!['platform_admin', 'super_admin'].includes(req.user.role))
    query = query.eq('mentor_id', req.user.id);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ cohorts: data });
});

router.post('/cohorts', requireLevel('platform_admin'), audit('cohort.create'), async (req, res) => {
  const { name, track, mentor_id, start_date, end_date, total_weeks, max_size } = req.body;
  const { data, error } = await supabase.from('cohorts')
    .insert({ name, track, mentor_id, start_date, end_date, total_weeks, max_size })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ cohort: data });
});

router.patch('/cohorts/:id', requireLevel('cohort_admin'), async (req, res) => {
  const { data, error } = await supabase.from('cohorts').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ cohort: data });
});

// POST /api/admin/cohorts/:id/enroll
router.post('/cohorts/:id/enroll', requireLevel('platform_admin'), async (req, res) => {
  const { mentee_ids } = req.body;
  const rows = mentee_ids.map(id => ({ mentee_id: id, cohort_id: req.params.id }));
  const { data, error } = await supabase.from('enrollments').insert(rows).select();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ enrolled: data.length });
});

// ── AUDIT LOGS (super_admin only) ────────────────────────────
router.get('/audit-logs', requireLevel('super_admin'), async (req, res) => {
  const { user_id, action, from, to, page = 1 } = req.query;
  const offset = (parseInt(page) - 1) * 100;
  let query = supabase.from('audit_logs')
    .select('*, profiles!user_id(full_name, email)', { count: 'estimated' })
    .order('created_at', { ascending: false }).range(offset, offset + 99);
  if (user_id) query = query.eq('user_id', user_id);
  if (action) query = query.eq('action', action);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);
  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ logs: data, total: count });
});

// ── SYSTEM SETTINGS (super_admin only) ──────────────────────
router.get('/settings', requireLevel('super_admin'), async (req, res) => {
  const { data } = await supabase.from('system_settings').select('*');
  const settings = Object.fromEntries((data || []).map(s => [s.key, s.value]));
  res.json({ settings });
});

router.patch('/settings', requireLevel('super_admin'), audit('settings.update'), async (req, res) => {
  const updates = Object.entries(req.body).map(([key, value]) => ({ key, value: String(value) }));
  for (const u of updates) {
    await supabase.from('system_settings').upsert(u, { onConflict: 'key' });
  }
  res.json({ success: true });
});

// ── ANALYTICS ────────────────────────────────────────────────
router.get('/analytics', requireLevel('platform_admin'), async (req, res) => {
  const [weeklySignups, projectScores, bookingRevenue, atRiskCount] = await Promise.all([
    supabase.from('profiles').select('created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('projects').select('final_score').not('final_score', 'is', null),
    supabase.from('bookings').select('total_amount, created_at').eq('payment_status', 'released').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase.from('enrollments').select('id', { count: 'exact' }).eq('status', 'at_risk'),
  ]);

  const scores = projectScores.data?.map(p => p.final_score) || [];
  const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
  const monthlyRevenue = (bookingRevenue.data || []).reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);

  res.json({
    weekly_signups: weeklySignups.data?.length || 0,
    avg_project_score: avgScore,
    monthly_marketplace_revenue: monthlyRevenue.toFixed(2),
    at_risk_mentees: atRiskCount.count || 0,
  });
});

module.exports = router;
