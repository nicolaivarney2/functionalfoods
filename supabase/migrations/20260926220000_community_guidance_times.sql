-- Flere guidance-beskeder pr. dag, med klokkeslæt i Danmark.
-- Afsendelse huskes pr. skabelon, så samme dag kan postes flere gange.

alter table public.community_guidance_templates
  add column if not exists send_time time;

update public.community_guidance_templates
set send_time = '08:00'
where trigger = 'day' and send_time is null;

alter table public.community_guidance_templates
  drop constraint if exists community_guidance_send_time_check;

alter table public.community_guidance_templates
  add constraint community_guidance_send_time_check check (
    (trigger = 'on_join' and send_time is null)
    or (trigger = 'day' and send_time is not null)
  );

drop index if exists community_guidance_day_unique;

create unique index if not exists community_guidance_day_time_unique
  on public.community_guidance_templates (niche, day_offset, send_time)
  where trigger = 'day';

alter table public.community_messages
  add column if not exists template_id uuid references public.community_guidance_templates (id) on delete set null;

drop index if exists community_guidance_once;

create unique index if not exists community_guidance_template_once
  on public.community_messages (room_id, template_id)
  where template_id is not null;
