// community.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { auth, requireRole, requireLevel } = require('../middleware/auth');

router.get('/posts', auth, async (req, res) => {
  const { cohort_id } = req.query;
  let query = supabase.from('posts').select('*, profiles!author_id(full_name, avatar_url, role)').eq('is_deleted', false).order('created_at', { ascending: false }).limit(50);
  if (cohort_id) query = query.eq('cohort_id', cohort_id);
  const { data } = await query;
  res.json({ posts: data || [] });
});

router.post('/posts', auth, async (req, res) => {
  const { content, cohort_id } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  const { data, error } = await supabase.from('posts').insert({ author_id: req.user.id, content, cohort_id }).select('*, profiles!author_id(full_name, avatar_url)').single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ post: data });
});

router.post('/posts/:id/like', auth, async (req, res) => {
  const { data: existing } = await supabase.from('post_likes').select('*').eq('post_id', req.params.id).eq('user_id', req.user.id).single();
  if (existing) {
    await supabase.from('post_likes').delete().eq('post_id', req.params.id).eq('user_id', req.user.id);
    res.json({ liked: false });
  } else {
    await supabase.from('post_likes').insert({ post_id: req.params.id, user_id: req.user.id });
    res.json({ liked: true });
  }
});

router.get('/leaderboard', auth, async (req, res) => {
  const { cohort_id } = req.query;
  let query = supabase.from('enrollments').select('xp_points, streak_days, profiles!mentee_id(id, full_name, avatar_url)').order('xp_points', { ascending: false }).limit(20);
  if (cohort_id) query = query.eq('cohort_id', cohort_id);
  const { data } = await query;
  res.json({ leaderboard: data || [] });
});

router.get('/events', async (req, res) => {
  const { data } = await supabase.from('events').select('*').eq('is_public', true).order('event_date', { ascending: true });
  res.json({ events: data || [] });
});

router.post('/events', auth, requireLevel('platform_admin'), async (req, res) => {
  const { data, error } = await supabase.from('events').insert({ ...req.body, created_by: req.user.id }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ event: data });
});

router.post('/events/:id/register', auth, async (req, res) => {
  const { error } = await supabase.from('event_registrations').insert({ event_id: req.params.id, user_id: req.user.id });
  if (error?.code === '23505') return res.status(400).json({ error: 'Already registered' });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ registered: true });
});

router.get('/notifications', auth, async (req, res) => {
  const { data } = await supabase.from('notifications').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false }).limit(30);
  res.json({ notifications: data || [] });
});

router.patch('/notifications/read-all', auth, async (req, res) => {
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', req.user.id);
  res.json({ success: true });
});

module.exports = router;
