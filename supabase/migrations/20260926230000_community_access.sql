-- 49 kr Community-entitlement. Ændrer ikke madplan-niveauet.

alter table public.user_profiles
  add column if not exists community_access boolean not null default false;
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

notify pgrst, 'reload schema';
