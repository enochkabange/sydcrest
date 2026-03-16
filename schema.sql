-- ============================================================
--  SydCrest Launchpad – Enterprise Schema v2
--  Run in Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── ENUMS ───────────────────────────────────────────────────
create type user_role as enum ('mentee','mentor','cohort_admin','platform_admin','super_admin');
create type mentee_status as enum ('active','at_risk','inactive','graduated');
create type project_status as enum ('draft','submitted','ai_reviewed','mentor_reviewed','revision_requested','approved');
create type event_type as enum ('workshop','game_show','hackathon','demo_day','summit');
create type booking_status as enum ('pending','confirmed','completed','cancelled','disputed');
create type payment_method as enum ('mtn_momo','vodafone_cash','airteltigo_money','card');
create type payment_status as enum ('pending','held_escrow','released','refunded','failed');
create type opp_type as enum ('job','school','scholarship','fellowship','internship');
create type opp_stage as enum ('researching','researched','roadmap','applying','submitted','outcome_positive','outcome_negative');

-- ─── PROFILES ────────────────────────────────────────────────
create table profiles (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  role            user_role not null default 'mentee',
  full_name       text not null,
  email           text not null unique,
  phone           text,
  region          text,
  avatar_url      text,
  bio             text,
  device_access   text default 'smartphone',
  is_active       boolean default true,
  token_version   int default 0,
  last_seen_at    timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table profiles enable row level security;
create policy "Own profile" on profiles for all using (auth.uid() = user_id);
create policy "Admins see all" on profiles for select using (
  exists (select 1 from profiles p where p.user_id=auth.uid() and p.role in ('platform_admin','super_admin'))
);

-- ─── COHORTS ─────────────────────────────────────────────────
create table cohorts (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  track         text not null,
  mentor_id     uuid references profiles(id),
  start_date    date,
  end_date      date,
  total_weeks   int default 12,
  is_active     boolean default true,
  max_size      int default 20,
  created_at    timestamptz default now()
);

-- ─── ENROLLMENTS ─────────────────────────────────────────────
create table enrollments (
  id            uuid primary key default uuid_generate_v4(),
  mentee_id     uuid references profiles(id) on delete cascade,
  cohort_id     uuid references cohorts(id) on delete cascade,
  status        mentee_status default 'active',
  current_week  int default 1,
  xp_points     int default 0,
  streak_days   int default 0,
  last_active   timestamptz default now(),
  enrolled_at   timestamptz default now(),
  unique(mentee_id, cohort_id)
);

-- ─── LEARNING PATHS ──────────────────────────────────────────
create table learning_paths (
  id            uuid primary key default uuid_generate_v4(),
  mentee_id     uuid references profiles(id) on delete cascade,
  cohort_id     uuid references cohorts(id),
  title         text not null,
  tagline       text,
  track         text not null,
  total_weeks   int default 8,
  is_team       boolean default false,
  raw_json      jsonb,
  created_at    timestamptz default now()
);

create table learning_weeks (
  id            uuid primary key default uuid_generate_v4(),
  path_id       uuid references learning_paths(id) on delete cascade,
  week_number   int not null,
  theme         text not null,
  objectives    text[],
  resource_name text,
  resource_url  text,
  assignment    text,
  is_team_week  boolean default false,
  status        text default 'pending',
  completed_at  timestamptz,
  score         int,
  created_at    timestamptz default now()
);

-- ─── SESSIONS ────────────────────────────────────────────────
create table sessions (
  id            uuid primary key default uuid_generate_v4(),
  mentor_id     uuid references profiles(id),
  mentee_id     uuid references profiles(id),
  cohort_id     uuid references cohorts(id),
  scheduled_at  timestamptz not null,
  duration_mins int default 60,
  meet_link     text,
  session_type  text default '1:1',
  status        text default 'scheduled',
  mentor_notes  text,
  mentee_notes  text,
  rating        int check (rating between 1 and 5),
  created_at    timestamptz default now()
);

-- ─── PROJECTS ────────────────────────────────────────────────
create table projects (
  id              uuid primary key default uuid_generate_v4(),
  mentee_id       uuid references profiles(id) on delete cascade,
  cohort_id       uuid references cohorts(id),
  week_number     int not null,
  title           text not null,
  description     text,
  submission_url  text,
  file_url        text,
  status          project_status default 'draft',
  ai_feedback     jsonb,
  mentor_feedback text,
  final_score     int,
  in_portfolio    boolean default false,
  submitted_at    timestamptz,
  reviewed_at     timestamptz,
  created_at      timestamptz default now()
);

create table project_rubrics (
  id            uuid primary key default uuid_generate_v4(),
  cohort_id     uuid references cohorts(id),
  week_number   int not null,
  track         text not null,
  criteria      jsonb not null,
  created_at    timestamptz default now()
);

-- ─── COMMUNITY ───────────────────────────────────────────────
create table posts (
  id            uuid primary key default uuid_generate_v4(),
  author_id     uuid references profiles(id) on delete cascade,
  cohort_id     uuid references cohorts(id),
  content       text not null,
  is_pinned     boolean default false,
  likes_count   int default 0,
  replies_count int default 0,
  is_deleted    boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table post_likes (
  post_id   uuid references posts(id) on delete cascade,
  user_id   uuid references profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

create table post_replies (
  id        uuid primary key default uuid_generate_v4(),
  post_id   uuid references posts(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  content   text not null,
  is_deleted boolean default false,
  created_at timestamptz default now()
);

-- ─── CHAT ────────────────────────────────────────────────────
create table chat_messages (
  id            uuid primary key default uuid_generate_v4(),
  mentee_id     uuid references profiles(id) on delete cascade,
  role          text not null check (role in ('user','assistant')),
  content       text not null,
  context       text,
  created_at    timestamptz default now()
);

-- ─── QUIZZES ─────────────────────────────────────────────────
create table quizzes (
  id            uuid primary key default uuid_generate_v4(),
  mentee_id     uuid references profiles(id),
  week_number   int not null,
  track         text not null,
  questions     jsonb not null,
  score         int,
  max_score     int,
  completed_at  timestamptz,
  created_at    timestamptz default now()
);

-- ─── EVENTS ──────────────────────────────────────────────────
create table events (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  description   text,
  event_type    event_type not null,
  event_date    timestamptz,
  location      text,
  meet_link     text,
  capacity      int,
  is_public     boolean default true,
  is_free       boolean default true,
  price_ghs     numeric(10,2) default 0,
  sponsor_name  text,
  created_by    uuid references profiles(id),
  created_at    timestamptz default now()
);

create table event_registrations (
  id          uuid primary key default uuid_generate_v4(),
  event_id    uuid references events(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  registered_at timestamptz default now(),
  unique(event_id, user_id)
);

-- ─── MARKETPLACE ─────────────────────────────────────────────
create table mentor_listings (
  id            uuid primary key default uuid_generate_v4(),
  mentor_id     uuid references profiles(id) on delete cascade unique,
  specialties   text[],
  hourly_rate   numeric(10,2) not null,
  is_active     boolean default true,
  total_sessions int default 0,
  avg_rating    numeric(3,2) default 0,
  bio           text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table bookings (
  id              uuid primary key default uuid_generate_v4(),
  mentor_id       uuid references profiles(id),
  mentee_id       uuid references profiles(id),
  listing_id      uuid references mentor_listings(id),
  session_focus   text,
  scheduled_at    timestamptz not null,
  duration_mins   int default 60,
  total_amount    numeric(10,2) not null,
  status          booking_status default 'pending',
  payment_method  payment_method,
  payment_status  payment_status default 'pending',
  payment_ref     text,
  escrow_released boolean default false,
  mentee_rating   int check (mentee_rating between 1 and 5),
  mentee_review   text,
  meet_link       text,
  created_at      timestamptz default now(),
  confirmed_at    timestamptz,
  completed_at    timestamptz
);

-- ─── OPPORTUNITIES (new) ─────────────────────────────────────
create table opportunities (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references profiles(id) on delete cascade,
  type            opp_type not null,
  title           text not null,
  org             text not null,
  location        text,
  deadline        text,
  notes           text,
  stage           opp_stage default 'researching',
  progress        int default 0,
  research_json   jsonb,
  roadmap_json    jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index on opportunities(user_id);

create table opp_messages (
  id          uuid primary key default uuid_generate_v4(),
  opp_id      uuid references opportunities(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  created_at  timestamptz default now()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────
create table notifications (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references profiles(id) on delete cascade,
  type          text not null,
  title         text not null,
  body          text not null,
  data          jsonb,
  is_read       boolean default false,
  created_at    timestamptz default now()
);
create index on notifications(user_id, is_read);

-- ─── ACHIEVEMENTS ────────────────────────────────────────────
create table achievements (
  id            uuid primary key default uuid_generate_v4(),
  mentee_id     uuid references profiles(id) on delete cascade,
  badge         text not null,
  label         text not null,
  earned_at     timestamptz default now()
);

-- ─── RECOMMENDERS ────────────────────────────────────────────
create table recommenders (
  id            uuid primary key default uuid_generate_v4(),
  mentee_id     uuid references profiles(id) on delete cascade,
  name          text not null,
  phone         text not null,
  relationship  text not null,
  signed        boolean default false,
  signed_at     timestamptz,
  created_at    timestamptz default now()
);

-- ─── AUDIT LOGS ──────────────────────────────────────────────
create table audit_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references profiles(id) on delete set null,
  action        text not null,
  resource_type text,
  resource_id   text,
  ip            text,
  user_agent    text,
  request_id    text,
  metadata      jsonb,
  created_at    timestamptz default now()
);
create index on audit_logs(user_id);
create index on audit_logs(action);
create index on audit_logs(created_at desc);

-- ─── SYSTEM SETTINGS ─────────────────────────────────────────
create table system_settings (
  key       text primary key,
  value     text not null,
  updated_at timestamptz default now()
);

insert into system_settings (key, value) values
  ('platform_fee_pct', '15'),
  ('max_cohort_size', '20'),
  ('ai_requests_per_min', '15'),
  ('maintenance_mode', 'false'),
  ('whatsapp_notifications', 'true'),
  ('momo_enabled', 'true');

-- ─── TRIGGERS ────────────────────────────────────────────────
create or replace function update_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger mentor_listings_updated_at before update on mentor_listings for each row execute function update_updated_at();
create trigger posts_updated_at before update on posts for each row execute function update_updated_at();
create trigger opportunities_updated_at before update on opportunities for each row execute function update_updated_at();

-- Post likes counter
create or replace function handle_post_like() returns trigger as $$
begin
  if tg_op='INSERT' then update posts set likes_count=likes_count+1 where id=new.post_id;
  elsif tg_op='DELETE' then update posts set likes_count=likes_count-1 where id=old.post_id; end if;
  return null;
end; $$ language plpgsql;
create trigger post_likes_counter after insert or delete on post_likes for each row execute function handle_post_like();

-- Reply counter
create or replace function handle_post_reply() returns trigger as $$
begin
  if tg_op='INSERT' then update posts set replies_count=replies_count+1 where id=new.post_id; end if;
  return null;
end; $$ language plpgsql;
create trigger post_replies_counter after insert on post_replies for each row execute function handle_post_reply();

-- Update mentor avg rating
create or replace function update_mentor_rating(p_mentor_id uuid) returns void as $$
begin
  update mentor_listings set
    avg_rating = (select round(avg(mentee_rating)::numeric, 2) from bookings where mentor_id=p_mentor_id and mentee_rating is not null),
    total_sessions = (select count(*) from bookings where mentor_id=p_mentor_id and status='completed')
  where mentor_id = p_mentor_id;
end; $$ language plpgsql;

-- ─── REALTIME ────────────────────────────────────────────────
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table opp_messages;
