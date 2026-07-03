-- Madlog: gem fuld Frida-mikronæring som snapshot (vitaminer + mineraler pr. logget måltid).
-- Værdierne er totaler for det loggede antal portioner — samme princip som calories/protein.

alter table public.food_log_entries
  add column if not exists vitamins jsonb not null default '{}'::jsonb,
  add column if not exists minerals jsonb not null default '{}'::jsonb;

comment on column public.food_log_entries.vitamins is
  'Vitaminer (kanoniske nøgler fx A, C, B12) — total for loggede portioner, ikke pr. portion.';
comment on column public.food_log_entries.minerals is
  'Mineraler (kanoniske nøgler fx calcium, iron) — total for loggede portioner.';
