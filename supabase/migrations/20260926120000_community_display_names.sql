-- Community display name (shown as a first name) and chat preview in open rooms.

create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  updated_at timestamptz not null default now(),
  constraint community_profiles_name_len check (char_length(trim(display_name)) between 2 and 40)
);

alter table public.community_profiles enable row level security;

drop policy if exists community_profiles_select_own on public.community_profiles;
create policy community_profiles_select_own
  on public.community_profiles for select to authenticated
  using (user_id = auth.uid());

drop policy if exists community_profiles_insert_own on public.community_profiles;
create policy community_profiles_insert_own
  on public.community_profiles for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists community_profiles_update_own on public.community_profiles;
create policy community_profiles_update_own
  on public.community_profiles for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.community_sync_display_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_memberships
  set display_name = trim(new.display_name)
  where user_id = new.user_id;
  return new;
end;
$$;

revoke all on function public.community_sync_display_name() from public, anon, authenticated;

drop trigger if exists community_profiles_sync_name on public.community_profiles;
create trigger community_profiles_sync_name
after insert or update of display_name on public.community_profiles
for each row execute function public.community_sync_display_name();

create or replace function public.join_community_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof record;
  room public.community_rooms;
  dname text;
  member_list text;
  welcome text;
  niche_label text;
begin
  if uid is null then
    raise exception 'Log ind først';
  end if;

  select subscription_tier, trial_ends_at, community_access into prof
  from public.user_profiles
  where id = uid;

  if not found then
    raise exception 'Community kræver Community-abonnementet eller Premium. Madbudget er madplan og madlog.';
  end if;

  if prof.subscription_tier is distinct from 'premium'
     and coalesce(prof.community_access, false) is not true then
    raise exception 'Community kræver Community-abonnementet eller Premium. Madbudget er madplan og madlog.';
  end if;

  select * into room from public.community_rooms where id = p_room_id;
  if not found then
    raise exception 'Rummet findes ikke.';
  end if;

  if exists (
    select 1 from public.community_memberships
    where room_id = p_room_id and user_id = uid
  ) then
    return;
  end if;

  if room.status <> 'open' or room.start_date <= (timezone('Europe/Copenhagen', now()))::date then
    raise exception 'Tilmelding er lukket. Rummet er startet.';
  end if;

  if room.member_count >= room.capacity then
    raise exception 'Rummet er fyldt.';
  end if;

  if exists (
    select 1
    from public.community_memberships m
    join public.community_rooms r on r.id = m.room_id
    where m.user_id = uid and r.status in ('open', 'active')
  ) then
    raise exception 'Du er allerede med i et aktivt rum.';
  end if;

  select nullif(trim(display_name), '') into dname
  from public.community_profiles
  where user_id = uid;

  if dname is null then
    dname := 'Medlem';
  else
    dname := split_part(dname, ' ', 1);
  end if;

  select coalesce(string_agg(display_name, ', ' order by joined_at), 'ingen endnu. Du er den første')
  into member_list
  from public.community_memberships
  where room_id = p_room_id;

  insert into public.community_memberships (room_id, user_id, display_name)
  values (p_room_id, uid, dname);

  select body into welcome
  from public.community_guidance_templates
  where niche = room.niche and trigger = 'on_join'
  limit 1;

  niche_label := case room.niche
    when 'keto' then 'Keto'
    when 'sense' then 'Sense'
    when 'glp-1' then 'GLP-1'
    when 'anti-inflammatory' then 'Anti-inflammatorisk'
    when 'flexitarian' then 'Fleksitarisk'
    when '5-2' then '5:2 diæt'
    when 'lchf-paleo' then 'LCHF/Paleo'
    when 'mediterranean' then 'Middelhavsdiæt'
    when 'proteinrig-kost' then 'Proteinrig kost'
    when 'familiemad' then 'Kalorietælling'
    else room.niche
  end;

  welcome := coalesce(
    welcome,
    'Velkommen! Præsentér dig gerne. Allerede med: {{members}}. Tag @nicolai hvis du har brug for en ekspert.'
  );
  welcome := replace(welcome, '{{members}}', member_list);
  welcome := replace(welcome, '{{niche}}', niche_label);
  welcome := replace(welcome, '{{start_date}}', to_char(room.start_date, 'DD.MM.YYYY'));

  insert into public.community_messages (room_id, author_name, kind, body)
  values (p_room_id, 'Functional Foods', 'system', welcome);
end;
$$;

revoke all on function public.join_community_room(uuid) from public, anon;
grant execute on function public.join_community_room(uuid) to authenticated;

create or replace function public.post_community_message(p_room_id uuid, p_body text)
returns public.community_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  room public.community_rooms;
  dname text;
  msg public.community_messages;
  text_body text := trim(coalesce(p_body, ''));
begin
  if uid is null then
    raise exception 'Log ind først';
  end if;
  if text_body = '' then
    raise exception 'Skriv en besked.';
  end if;
  if char_length(text_body) > 2000 then
    raise exception 'Beskeden er for lang.';
  end if;

  select * into room from public.community_rooms where id = p_room_id;
  if not found then
    raise exception 'Rummet findes ikke.';
  end if;
  if room.status = 'archived' then
    raise exception 'Forløbet er afsluttet.';
  end if;

  select display_name into dname
  from public.community_memberships
  where room_id = p_room_id and user_id = uid;

  if dname is null then
    raise exception 'Du er ikke med i rummet.';
  end if;

  dname := split_part(trim(dname), ' ', 1);

  insert into public.community_messages (room_id, user_id, author_name, kind, body)
  values (p_room_id, uid, dname, 'user', text_body)
  returning * into msg;

  return msg;
end;
$$;

revoke all on function public.post_community_message(uuid, text) from public, anon;
grant execute on function public.post_community_message(uuid, text) to authenticated;

drop policy if exists community_messages_select on public.community_messages;
create policy community_messages_select
  on public.community_messages for select to authenticated
  using (
    private.community_is_member(room_id)
    or exists (
      select 1
      from public.community_rooms r
      where r.id = community_messages.room_id
        and r.status = 'open'
    )
  );
