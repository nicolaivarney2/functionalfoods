-- Samme 6 mandage som Keto uge 44–49, til alle andre nicher.
-- w@ bliver guide i de nye rum. Kør i Functional Foods' Supabase SQL editor.

with niches(niche, label) as (
  values
    ('sense', 'Sense'),
    ('glp-1', 'GLP-1'),
    ('anti-inflammatory', 'Anti-inflammatorisk'),
    ('flexitarian', 'Fleksitarisk'),
    ('5-2', '5:2 diæt'),
    ('lchf-paleo', 'LCHF/Paleo'),
    ('mediterranean', 'Middelhavsdiæt'),
    ('proteinrig-kost', 'Proteinrig kost'),
    ('familiemad', 'Kalorietælling')
),
weeks(start_date, week) as (
  values
    ('2026-10-26'::date, 44),
    ('2026-11-02'::date, 45),
    ('2026-11-09'::date, 46),
    ('2026-11-16'::date, 47),
    ('2026-11-23'::date, 48),
    ('2026-11-30'::date, 49)
)
insert into public.community_rooms (niche, title, start_date, capacity, duration_days, status)
select
  n.niche,
  n.label || ' start: Uge ' || w.week,
  w.start_date,
  10,
  30,
  'open'
from niches n
cross join weeks w
where not exists (
  select 1
  from public.community_rooms r
  where r.niche = n.niche
    and r.start_date = w.start_date
);

insert into public.community_memberships (room_id, user_id, display_name, is_guide)
select r.id, u.id, 'Nicolai', true
from public.community_rooms r
join auth.users u on lower(u.email) = 'w@nicolaivarney.dk'
on conflict (room_id, user_id) do update
  set is_guide = true,
      display_name = excluded.display_name;
