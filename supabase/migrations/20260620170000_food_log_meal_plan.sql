-- Madplan → dagbog: madplanens måltider kopieres ind som rigtige dagbogs-entries
-- (kilde 'meal-plan'), så de kan redigeres/slettes som alm. logninger. meal_plan_id
-- gør det muligt at spore hvilken plan en entry kom fra.

alter table public.food_log_entries
  add column if not exists meal_plan_id text;

-- Udvid source-constraint med 'meal-plan'.
alter table public.food_log_entries
  drop constraint if exists food_log_entries_source_check;
alter table public.food_log_entries
  add constraint food_log_entries_source_check
  check (source in ('recipe', 'manual', 'meal-plan'));

create index if not exists food_log_entries_user_mealplan_idx
  on public.food_log_entries (user_id, meal_plan_id);
