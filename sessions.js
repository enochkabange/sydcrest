const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  let query = supabase.from('sessions').select('*, mentor:profiles!mentor_id(full_name), mentee:profiles!mentee_id(full_name)').order('scheduled_at', { ascending: true });
  if (req.user.role === 'mentee') query = query.eq('mentee_id', req.user.id);
  else if (['mentor', 'cohort_admin'].includes(req.user.role)) query = query.eq('mentor_id', req.user.id);
  const { data } = await query.gte('scheduled_at', new Date(Date.now() - 7 * 86400000).toISOString());
  res.json({ sessions: data || [] });
});

router.post('/', auth, requireRole('mentor', 'cohort_admin', 'platform_admin', 'super_admin'), async (req, res) => {
  const { mentee_id, cohort_id, scheduled_at, duration_mins, session_type, meet_link } = req.body;
  if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at is required' });
  const { data, error } = await supabase.from('sessions')
    .insert({ mentor_id: req.user.id, mentee_id, cohort_id, scheduled_at, duration_mins: duration_mins || 60, session_type: session_type || '1:1', meet_link })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ session: data });
});

router.patch('/:id/notes', auth, async (req, res) => {
  const updates = {};
  if (['mentor', 'cohort_admin'].includes(req.user.role)) {
    if (req.body.mentor_notes !== undefined) updates.mentor_notes = req.body.mentor_notes;
    if (req.body.status) updates.status = req.body.status;
  }
  if (req.user.role === 'mentee') {
    if (req.body.mentee_notes !== undefined) updates.mentee_notes = req.body.mentee_notes;
    if (req.body.rating !== undefined) updates.rating = req.body.rating;
  }
  const { data, error } = await supabase.from('sessions').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ session: data });
});

router.delete('/:id', auth, async (req, res) => {
  await supabase.from('sessions').update({ status: 'cancelled' }).eq('id', req.params.id);
  res.json({ success: true });
});

module.exports = router;
