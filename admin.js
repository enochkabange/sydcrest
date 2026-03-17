const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { auth, requireLevel } = require('../middleware/auth');

router.use(auth, requireLevel('cohort_admin'));

router.get('/stats', requireLevel('platform_admin'), async (req, res) => {
  const [mentees, mentors, cohorts, bookings] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'mentee'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'mentor'),
    supabase.from('cohorts').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('bookings').select('total_amount').eq('payment_status', 'released'),
  ]);
  const totalGmv = (bookings.data || []).reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);
  res.json({
    mentees: mentees.count || 0,
    mentors: mentors.count || 0,
    active_cohorts: cohorts.count || 0,
    total_gmv: totalGmv.toFixed(2),
    platform_revenue: (totalGmv * 0.15).toFixed(2),
    approved_projects: 0,
  });
});

router.get('/users', requireLevel('platform_admin'), async (req, res) => {
  const { role, search, page = 1 } = req.query;
  const offset = (parseInt(page) - 1) * 50;
  let query = supabase.from('profiles').select('*', { count: 'estimated' }).order('created_at', { ascending: false }).range(offset, offset + 49);
  if (role) query = query.eq('role', role);
  if (search) query = query.ilike('full_name', `%${search}%`);
  const { data, count } = await query;
  res.json({ users: data || [], total: count, page: parseInt(page) });
});

router.patch('/users/:id', requireLevel('platform_admin'), async (req, res) => {
  const allowed = ['is_active', 'region', 'bio'];
  if (req.body.role && req.user.role !== 'super_admin')
    return res.status(403).json({ error: 'Only super_admin can change roles' });
  if (req.body.role) allowed.push('role');
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: data });
});

router.get('/cohorts', async (req, res) => {
  let query = supabase.from('cohorts').select('*');
  if (!['platform_admin', 'super_admin'].includes(req.user.role)) query = query.eq('mentor_id', req.user.id);
  const { data } = await query.order('created_at', { ascending: false });
  res.json({ cohorts: data || [] });
});

router.post('/cohorts', requireLevel('platform_admin'), async (req, res) => {
  const { data, error } = await supabase.from('cohorts').insert(req.body).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ cohort: data });
});

router.patch('/cohorts/:id', async (req, res) => {
  const { data, error } = await supabase.from('cohorts').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ cohort: data });
});

router.get('/analytics', requireLevel('platform_admin'), async (req, res) => {
  const [signups, atRisk] = await Promise.all([
    supabase.from('profiles').select('created_at').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('status', 'at_risk'),
  ]);
  res.json({ weekly_signups: signups.data?.length || 0, at_risk_mentees: atRisk.count || 0 });
});

router.get('/settings', requireLevel('super_admin'), async (req, res) => {
  const { data } = await supabase.from('system_settings').select('*');
  const settings = Object.fromEntries((data || []).map(s => [s.key, s.value]));
  res.json({ settings });
});

router.patch('/settings', requireLevel('super_admin'), async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    await supabase.from('system_settings').upsert({ key, value: String(value) }, { onConflict: 'key' });
  }
  res.json({ success: true });
});

module.exports = router;
