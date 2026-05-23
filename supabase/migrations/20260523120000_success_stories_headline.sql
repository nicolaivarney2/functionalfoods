-- Add headline + weight_loss_kg columns to success_stories (legacy installs may lack these)

alter table public.success_stories
  add column if not exists headline text;

alter table public.success_stories
  add column if not exists weight_loss_kg numeric(6,2);

update public.success_stories
set headline = coalesce(headline, display_name || ' succeshistorie')
where headline is null;

update public.success_stories
set weight_loss_kg = greatest(before_weight_kg - after_weight_kg, 0.1)
where weight_loss_kg is null
  and before_weight_kg is not null
  and after_weight_kg is not null
  and before_weight_kg > after_weight_kg;

-- Only enforce NOT NULL when all rows have values
do $$
begin
  if not exists (select 1 from public.success_stories where headline is null) then
    alter table public.success_stories alter column headline set not null;
  end if;
exception
  when others then null;
end $$;

alter table public.success_stories
  alter column before_weight_kg drop not null;

alter table public.success_stories
  alter column after_weight_kg drop not null;

alter table public.success_stories
  drop constraint if exists success_stories_before_gt_after;
