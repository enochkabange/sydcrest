require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Security ──────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o.trim()))) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));
app.use('/api/auth/register', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/learning',      require('./routes/learning'));
app.use('/api/projects',      require('./routes/projects'));
app.use('/api/marketplace',   require('./routes/marketplace'));
app.use('/api/community',     require('./routes/community'));
app.use('/api/opportunities', require('./routes/opportunities'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/sessions',      require('./routes/sessions'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const { supabase } = require('./config/supabase');
  let db = 'ok';
  try {
    await supabase.from('profiles').select('id').limit(1);
  } catch {
    db = 'error - check SUPABASE env vars';
  }
  res.json({
    status: db === 'ok' ? 'ok' : 'degraded',
    db,
    env: process.env.NODE_ENV,
    time: new Date().toISOString(),
  });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀  SydCrest API running on http://localhost:${PORT}`);
  console.log(`    Supabase: ${process.env.SUPABASE_URL ? '✓ connected' : '✗ SUPABASE_URL missing'}`);
  console.log(`    Claude:   ${process.env.ANTHROPIC_API_KEY ? '✓ connected' : '✗ ANTHROPIC_API_KEY missing'}`);
  console.log(`    Env:      ${process.env.NODE_ENV || 'development'}\n`);
});
