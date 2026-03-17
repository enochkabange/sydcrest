const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';
const SYSTEM = 'You are SydCrest Launchpad\'s AI learning assistant for tech talent in Ghana (Navrongo, Bolgatanga, Tamale, Wa). Always recommend FREE resources. Prioritise mobile-first content when the mentee uses a smartphone. Use Ghana-relevant examples: MoMo payments, agri-tech, fintech, local logistics. Be encouraging and practical.';

// POST /api/learning/paths/generate
router.post('/paths/generate', auth, async (req, res) => {
  const { track, level, device, goals, team_learning } = req.body;
  if (!track || !level) return res.status(400).json({ error: 'track and level are required' });

  try {
    const response = await client.messages.create({
      model: MODEL, max_tokens: 2000, system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Generate a structured 8-week personalised learning path.
Mentee: ${req.user.full_name}
Track: ${track}
Level: ${level}
Device: ${device || req.user.device_access || 'smartphone'}
Goals: ${goals || 'Not specified'}
${team_learning ? 'Include 2 collaborative team weeks marked as team:true.' : ''}

Rules: all resources 100% free, mobile-first if device is smartphone, Ghana-relevant project ideas.

Respond ONLY in valid JSON, no markdown:
{"title":"","tagline":"","weeks":[{"week":1,"theme":"","objectives":["",""],"resource_name":"","resource_url":"","assignment":"","estimated_hours":8,"team":false}]}`
      }]
    });

    const text = response.content.map(b => b.text || '').join('');
    const aiPath = JSON.parse(text.replace(/```json?|```/g, '').trim());

    const { data: path } = await supabase.from('learning_paths')
      .insert({ mentee_id: req.user.id, title: aiPath.title, tagline: aiPath.tagline, track, total_weeks: aiPath.weeks.length, is_team: !!team_learning, ai_generated: true, raw_json: aiPath })
      .select().single();

    if (path && aiPath.weeks) {
      await supabase.from('learning_weeks').insert(
        aiPath.weeks.map(w => ({
          path_id: path.id, week_number: w.week, theme: w.theme,
          objectives: w.objectives, resource_name: w.resource_name,
          resource_url: w.resource_url, assignment: w.assignment,
          is_team_week: w.team || false,
        }))
      );
    }

    res.status(201).json({ path: { ...path, raw_json: aiPath } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate learning path: ' + err.message });
  }
});

// GET /api/learning/paths
router.get('/paths', auth, async (req, res) => {
  const { data } = await supabase.from('learning_paths')
    .select('*, learning_weeks(*)').eq('mentee_id', req.user.id)
    .order('created_at', { ascending: false });
  res.json({ paths: data || [] });
});

// POST /api/learning/chat  (streaming SSE)
router.post('/chat', auth, async (req, res) => {
  const { messages, mentee_context } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const ctx = mentee_context ? `Mentee: Track=${mentee_context.track}, Week=${mentee_context.currentWeek}, Level=${mentee_context.level}, Device=${mentee_context.device}` : '';

  try {
    const stream = await client.messages.stream({
      model: MODEL, max_tokens: 800,
      system: `${SYSTEM}\n\n${ctx}\n\nYou are a 24/7 study buddy. Be concise — mentees are on mobile. Answer questions, explain concepts, suggest free resources.`,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Chat failed' });
  }
});

// GET /api/learning/chat/history
router.get('/chat/history', auth, async (req, res) => {
  const { data } = await supabase.from('chat_messages')
    .select('*').eq('mentee_id', req.user.id)
    .order('created_at', { ascending: true }).limit(100);
  res.json({ messages: data || [] });
});

module.exports = router;
