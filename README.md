# SydCrest Launchpad — Enterprise

**Full-stack platform for tech talent development in Ghana.**
React · Node.js · Supabase · Claude API · Hubtel MoMo · Twilio WhatsApp

---

## 🚀 Deploy in 30 minutes (free)

### Prerequisites
- Node.js 20+ · Git · GitHub account · Vercel account · Railway account · Supabase account · Anthropic account

### 1. Clone & push to GitHub
```bash
git clone https://github.com/YOUR_USERNAME/sydcrest
# Copy all files into the repo
git add . && git commit -m "initial" && git push
```

### 2. Set up Supabase
1. New project at supabase.com
2. SQL Editor → paste backend/supabase/schema.sql → Run
3. Copy URL, anon key, service_role key

### 3. Deploy backend → Railway
1. railway.app → New Project → Deploy from GitHub
2. Add all environment variables (copy from backend/.env.example)
3. Start Command: `node backend/src/index.js`
4. Note your Railway URL

### 4. Deploy frontend → Vercel
1. vercel.com → Import GitHub repo
2. Root Directory: `frontend`
3. Add env vars: VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
4. Deploy

### 5. Create your super_admin
```sql
-- Run in Supabase SQL Editor after registering your account
UPDATE profiles SET role = 'super_admin' WHERE email = 'your@email.com';
```

### 6. Test
```bash
curl https://your-api.railway.app/api/health
# Should return {"status":"ok","db":"ok"}
```

---

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | — | Register |
| POST | /api/auth/login | — | Login |
| GET | /api/auth/me | JWT | Profile |
| POST | /api/learning/paths/generate | JWT | AI learning path |
| POST | /api/learning/chat | JWT | Study buddy (SSE) |
| POST | /api/learning/quiz/generate | JWT | Generate quiz |
| POST | /api/projects | JWT | Submit project |
| POST | /api/projects/:id/ai-assess | JWT | AI assessment |
| GET | /api/marketplace | — | List mentors |
| POST | /api/marketplace/book | JWT | Book + pay |
| GET | /api/opportunities | JWT | My opportunities |
| POST | /api/opportunities/:id/research | JWT | AI research |
| POST | /api/opportunities/:id/roadmap | JWT | AI roadmap |
| POST | /api/opportunities/:id/assistant | JWT | Assistant (SSE) |
| GET | /api/admin/stats | platform_admin+ | Platform stats |
| GET | /api/admin/users | platform_admin+ | User management |
| GET | /api/admin/audit-logs | super_admin | Audit trail |
| PATCH | /api/admin/settings | super_admin | System settings |

---

## Environment Variables

```
# backend/.env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=                    # node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
ANTHROPIC_API_KEY=
HUBTEL_CLIENT_ID=              # optional for MoMo
HUBTEL_CLIENT_SECRET=
TWILIO_ACCOUNT_SID=            # optional for WhatsApp
TWILIO_AUTH_TOKEN=
CLIENT_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

```
# frontend/.env
VITE_API_URL=https://your-api.railway.app/api
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Free tool stack

| Purpose | Tool | Cost |
|---------|------|------|
| Backend hosting | Railway | Free $5/mo |
| Frontend hosting | Vercel | Free |
| Database | Supabase | Free 500MB |
| AI | Claude Sonnet | Pay per use |
| Payments | Hubtel | 1.5% per txn |
| WhatsApp | Twilio | $15 free credit |
| SSL | Let's Encrypt | Free |
| CI/CD | GitHub Actions | Free 2,000 min/mo |
| Monitoring | UptimeRobot | Free |
| Errors | Sentry | Free 5K errors/mo |

**Estimated monthly cost at 500 users: ~$0–$10**

---

## Security features

- JWT with tokenVersion for forced logout
- Helmet.js (9 security headers)
- CORS whitelist
- Rate limiting (global + per-endpoint)
- Supabase Row Level Security
- Audit logging on all mutations
- Password reset invalidates all sessions
- Error details hidden in production

---

## Admin role levels

| Role | Access |
|------|--------|
| mentee | Own data, learning, marketplace |
| mentor | + Cohort mentees, projects, sessions |
| cohort_admin | + Own cohort management |
| platform_admin | + All users, all cohorts, analytics |
| super_admin | + System settings, audit logs, role changes |

---

See **SydCrest_Platform_Manual.docx** for the full operations guide.
