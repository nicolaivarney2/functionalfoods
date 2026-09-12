-- Soft-delete af madplan-retter i dagbogen. API sætter source = meal-plan-dismissed
-- så sync ikke lægger retten ind igen.
alter table public.food_log_entries
  drop constraint if exists food_log_entries_source_check;

alter table public.food_log_entries
  add constraint food_log_entries_source_check
  check (source in ('recipe', 'manual', 'meal-plan', 'meal-plan-dismissed'));
