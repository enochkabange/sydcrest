const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { auth } = require('../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';

const SYSTEM = `You are SydCrest Launchpad's opportunity intelligence assistant for tech talent in Ghana and West Africa. Be practical, accurate, and Africa-focused. Always consider that the user is applying from Ghana and may need region-specific advice.`;

// GET /api/opportunities – list user's opportunities
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ opportunities: data });
});

// POST /api/opportunities – add opportunity
router.post('/', auth, async (req, res) => {
  const { type, title, org, location, deadline, notes } = req.body;
  if (!title || !org) return res.status(400).json({ error: 'title and org required' });
  const { data, error } = await supabase
    .from('opportunities')
    .insert({ user_id: req.user.id, type, title, org, location, deadline, notes, stage: 'researching', progress: 0 })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ opportunity: data });
});

// DELETE /api/opportunities/:id
router.delete('/:id', auth, async (req, res) => {
  await supabase.from('opportunities').delete().eq('id', req.params.id).eq('user_id', req.user.id);
  res.json({ success: true });
});

// POST /api/opportunities/:id/research – Claude deep research
router.post('/:id/research', auth, async (req, res) => {
  const { data: opp } = await supabase.from('opportunities').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

  try {
    const response = await client.messages.create({
      model: MODEL, max_tokens: 1500, system: SYSTEM,
      messages: [{
        role: 'user', content: `Research this opportunity thoroughly for a tech talent applying from Ghana.
Type: ${opp.type} | Title: ${opp.title} | Org: ${opp.org} | Location: ${opp.location} | Deadline: ${opp.deadline}

Respond ONLY in valid JSON:
{"overview":"","org_culture":"","salary_or_value":"","hiring_process":"","what_they_want":[""],"interview_cheatsheet":[""],"insider_tips":[""],"red_flags":[""],"success_rate":"","ghana_notes":""}`
      }]
    });

    const text = response.content.map(b => b.text || '').join('');
    const research = JSON.parse(text.replace(/```json?|```/g, '').trim());

    // Save research + update progress
    await supabase.from('opportunities').update({ research_json: research, progress: 25, stage: 'researched' }).eq('id', opp.id);

    res.json({ research });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Research generation failed' });
  }
});

// POST /api/opportunities/:id/roadmap – generate application roadmap
router.post('/:id/roadmap', auth, async (req, res) => {
  const { data: opp } = await supabase.from('opportunities').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

  try {
    const response = await client.messages.create({
      model: MODEL, max_tokens: 1000, system: SYSTEM,
      messages: [{
        role: 'user', content: `Create a backwards-planned application roadmap for this opportunity. Applicant is a tech talent from Ghana.
Type: ${opp.type} | Title: ${opp.title} | Org: ${opp.org} | Deadline: ${opp.deadline}

Respond ONLY in valid JSON:
{"total_weeks":6,"phases":[{"phase":"","duration":"Week 1","tasks":[""],"deliverable":"","status":"upcoming"}],"key_dates":[{"label":"","date":""}],"success_factors":[""]}`
      }]
    });

    const text = response.content.map(b => b.text || '').join('');
    const roadmap = JSON.parse(text.replace(/```json?|```/g, '').trim());

    await supabase.from('opportunities').update({ roadmap_json: roadmap, progress: 50, stage: 'roadmap' }).eq('id', opp.id);

    res.json({ roadmap });
  } catch (err) {
    res.status(500).json({ error: 'Roadmap generation failed' });
  }
});

// POST /api/opportunities/:id/assistant – streaming personal assistant
router.post('/:id/assistant', auth, async (req, res) => {
  const { messages } = req.body;
  const { data: opp } = await supabase.from('opportunities').select('*').eq('id', req.params.id).eq('user_id', req.user.id).single();
  if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const systemPrompt = `You are a personal career assistant for ${req.user.full_name}, a tech talent from Ghana using SydCrest Launchpad.
Opportunity: ${opp.type} — ${opp.title} at ${opp.org} (${opp.location}). Deadline: ${opp.deadline}.
Your job is to DO the hard work: draft full emails, write complete cover letters, build checklists, coach for interviews. Be action-oriented and produce ready-to-use content, not just tips. Write warmly and professionally.`;

  try {
    const stream = await client.messages.stream({
      model: MODEL, max_tokens: 1000,
      system: systemPrompt,
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
    if (!res.headersSent) res.status(500).json({ error: 'Assistant failed' });
  }
});

module.exports = router;
