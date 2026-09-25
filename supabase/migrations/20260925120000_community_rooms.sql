-- Community: kohorter, skabeloner, chat, mentions
-- Allerede applied på remote via MCP (community_rooms_chat_guidance).
-- Filen ligger her, så lokale resets matcher produktion.

create table if not exists public.community_staff (
  handle text primary key,
  user_id uuid references auth.users (id) on delete set null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.community_guidance_templates (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  trigger text not null check (trigger in ('on_join', 'day')),
  day_offset integer,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_guidance_day_check check (
    (trigger = 'on_join' and day_offset is null)
    or (trigger = 'day' and day_offset is not null and day_offset >= 0)
  )
);

create unique index if not exists community_guidance_on_join_unique
  on public.community_guidance_templates (niche)
  where trigger = 'on_join';

create unique index if not exists community_guidance_day_unique
  on public.community_guidance_templates (niche, day_offset)
  where trigger = 'day';

create table if not exists public.community_rooms (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  title text,
  start_date date not null,
  capacity integer not null default 8 check (capacity between 2 and 20),
  duration_days integer not null default 30 check (duration_days between 7 and 90),
  member_count integer not null default 0,
  status text not null default 'open' check (status in ('open', 'active', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists community_rooms_niche_start_idx
  on public.community_rooms (niche, start_date desc);

create table if not exists public.community_memberships (
  room_id uuid not null references public.community_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists community_memberships_user_idx
  on public.community_memberships (user_id);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.community_rooms (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  kind text not null check (kind in ('user', 'system', 'guidance')),
  body text not null,
  day_offset integer,
  created_at timestamptz not null default now()
);

create index if not exists community_messages_room_created_idx
  on public.community_messages (room_id, created_at);

create unique index if not exists community_guidance_once
  on public.community_messages (room_id, day_offset)
  where kind = 'guidance' and day_offset is not null;

create table if not exists public.community_mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.community_messages (id) on delete cascade,
  handle text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.community_room_events (
  room_id uuid not null references public.community_rooms (id) on delete cascade,
  event_name text not null,
  sent_on date not null,
  primary key (room_id, event_name, sent_on)
);
