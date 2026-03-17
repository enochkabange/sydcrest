// projects.js
const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('../config/supabase');
const { auth, requireRole, requireLevel } = require('../middleware/auth');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.get('/', auth, async (req, res) => {
  let query = supabase.from('projects').select('*');
  if (req.user.role === 'mentee') query = query.eq('mentee_id', req.user.id);
  const { data } = await query.order('created_at', { ascending: false });
  res.json({ projects: data || [] });
});

router.post('/', auth, requireRole('mentee'), async (req, res) => {
  const { cohort_id, week_number, title, description, submission_url } = req.body;
  if (!title || !week_number || !submission_url) return res.status(400).json({ error: 'title, week_number, and submission_url required' });
  const { data, error } = await supabase.from('projects')
    .insert({ mentee_id: req.user.id, cohort_id, week_number, title, description, submission_url, status: 'submitted', submitted_at: new Date() })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ project: data });
});

router.post('/:id/ai-assess', auth, async (req, res) => {
  const { data: project } = await supabase.from('projects').select('*').eq('id', req.params.id).single();
  if (!project) return res.status(404).json({ error: 'Project not found' });
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 800,
      messages: [{ role: 'user', content: `Assess this SydCrest student project from Ghana.
Project: "${project.title}" | Week: ${project.week_number} | URL: ${project.submission_url}
Rubric: Functionality (30pts), Code quality (25pts), Creativity (20pts), Documentation (15pts), Ghana relevance (10pts)
Give encouraging, constructive feedback. JSON only:
{"summary":"","scores":{"Functionality":0,"Code quality":0,"Creativity":0,"Documentation":0,"Ghana relevance":0},"total":0,"strengths":[""],"improvements":[""]}` }]
    });
    const text = response.content.map(b => b.text || '').join('');
    const assessment = JSON.parse(text.replace(/```json?|```/g, '').trim());
    await supabase.from('projects').update({ status: 'ai_reviewed', ai_feedback: assessment }).eq('id', project.id);
    res.json({ assessment });
  } catch (err) {
    res.status(500).json({ error: 'Assessment failed: ' + err.message });
  }
});

router.patch('/:id/review', auth, requireRole('mentor', 'cohort_admin', 'platform_admin', 'super_admin'), async (req, res) => {
  const { mentor_feedback, final_score, status } = req.body;
  const { data } = await supabase.from('projects')
    .update({ mentor_feedback, final_score, status: status || 'mentor_reviewed', in_portfolio: (final_score || 0) >= 70, reviewed_at: new Date() })
    .eq('id', req.params.id).select().single();
  res.json({ project: data });
});

router.get('/portfolio/:mentee_id', async (req, res) => {
  const { data: mentee } = await supabase.from('profiles').select('full_name, bio, avatar_url').eq('id', req.params.mentee_id).single();
  const { data: projects } = await supabase.from('projects').select('id, title, description, submission_url, final_score, reviewed_at, week_number').eq('mentee_id', req.params.mentee_id).eq('in_portfolio', true).order('reviewed_at', { ascending: false });
  res.json({ mentee, projects: projects || [] });
});

module.exports = router;
