-- Community-rum: standardkapacitet 10 (var 8).
-- Eksisterende rum på det gamle loft løftes med, så det åbne hold matcher.

alter table public.community_rooms
  alter column capacity set default 10;

update public.community_rooms
  set capacity = 10
  where capacity = 8;
