-- Keepsake Log + Year in Pixels — database setup.
-- Paste this whole file into Supabase: SQL Editor → New query → Run.

-- One row per log entry.
create table entries (
  id             text primary key,
  user_id        uuid not null default auth.uid() references auth.users,
  keepsake_name  text,
  emoji          text,
  datetime_local text,          -- the entry's local datetime string, e.g. 2026-07-03T14:00
  title          text,
  content        text,
  created_at     timestamptz default now(),
  updated_at     timestamptz
);

-- One JSON map per user per year: { "76": ["motivated","tired"], ... }
create table mood_years (
  user_id uuid not null default auth.uid() references auth.users,
  year    int  not null,
  data    jsonb not null default '{}',
  primary key (user_id, year)
);

-- Row Level Security: each signed-in user can only see and edit their own rows.
alter table entries    enable row level security;
alter table mood_years enable row level security;

create policy "own entries" on entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own moods" on mood_years
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
