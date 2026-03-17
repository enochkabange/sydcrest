// marketplace.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const { auth, requireRole } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const { data } = await supabase.from('mentor_listings')
    .select('*, profiles!mentor_id(full_name, avatar_url, region, bio)').eq('is_active', true)
    .order('avg_rating', { ascending: false });
  res.json({ listings: data || [] });
});

router.post('/book', auth, requireRole('mentee'), async (req, res) => {
  const { mentor_id, listing_id, session_focus, scheduled_at, duration_mins, payment_method } = req.body;
  if (!mentor_id || !scheduled_at || !payment_method) return res.status(400).json({ error: 'mentor_id, scheduled_at, and payment_method required' });

  const { data: listing } = await supabase.from('mentor_listings').select('hourly_rate, profiles!mentor_id(full_name)').eq('id', listing_id).single();
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  const hours = (duration_mins || 60) / 60;
  const total = parseFloat((listing.hourly_rate * hours).toFixed(2));
  const reference = uuidv4();

  const { data: booking, error } = await supabase.from('bookings')
    .insert({ mentor_id, mentee_id: req.user.id, listing_id, session_focus, scheduled_at, duration_mins: duration_mins || 60, total_amount: total, status: 'confirmed', payment_method, payment_status: 'held_escrow', payment_ref: reference, confirmed_at: new Date() })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });

  await supabase.from('notifications').insert([
    { user_id: req.user.id, type: 'payment_update', title: 'Session booked', body: `Session with ${listing.profiles?.full_name} confirmed. GHS ${total} held in escrow.`, data: { booking_id: booking.id } },
    { user_id: mentor_id, type: 'session_reminder', title: 'New booking', body: `${req.user.full_name} booked a ${duration_mins || 60}-min session.`, data: { booking_id: booking.id } },
  ]);

  res.status(201).json({ booking, payment: { success: true, mock: process.env.NODE_ENV !== 'production' } });
});

router.get('/bookings', auth, async (req, res) => {
  let query = supabase.from('bookings').select('*');
  if (req.user.role === 'mentee') query = query.eq('mentee_id', req.user.id);
  else if (req.user.role === 'mentor') query = query.eq('mentor_id', req.user.id);
  const { data } = await query.order('scheduled_at', { ascending: false });
  res.json({ bookings: data || [] });
});

router.post('/bookings/:id/complete', auth, async (req, res) => {
  const { rating, review } = req.body;
  await supabase.from('bookings').update({ status: 'completed', payment_status: 'released', escrow_released: true, mentee_rating: rating, mentee_review: review, completed_at: new Date() }).eq('id', req.params.id);
  res.json({ success: true });
});

router.post('/payments/callback', async (req, res) => {
  const { ClientReference, ResponseCode } = req.body;
  if (ResponseCode === '0000') {
    await supabase.from('bookings').update({ payment_status: 'held_escrow', status: 'confirmed' }).eq('payment_ref', ClientReference);
  } else {
    await supabase.from('bookings').update({ payment_status: 'failed', status: 'cancelled' }).eq('payment_ref', ClientReference);
  }
  res.json({ received: true });
});

module.exports = router;
