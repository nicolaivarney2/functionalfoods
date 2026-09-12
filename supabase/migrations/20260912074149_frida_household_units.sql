-- Husholdningsenheder på Frida-rækker (skive, stk, fed, glas).
-- Rører ikke id, navn eller ingredient_matches.
ALTER TABLE public.frida_ingredients
  ADD COLUMN IF NOT EXISTS household_units jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Seed fra danske navnemønstre. Senere UPDATE overskriver kun de nævnte nøgler.
UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"glas":200}'::jsonb
WHERE name ILIKE '%juice%' OR name ILIKE '%appelsinjuice%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"glas":200}'::jsonb
WHERE name ILIKE '%mælk%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"stk":60}'::jsonb
WHERE name ILIKE '%citron%' AND name NOT ILIKE '%saft%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"stk":80}'::jsonb
WHERE name ILIKE '%løg%'
  AND name NOT ILIKE '%forårsløg%'
  AND name NOT ILIKE '%purløg%'
  AND name NOT ILIKE '%hvidløg%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"stk":60}'::jsonb
WHERE name ILIKE '%gulerod%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"stk":80}'::jsonb
WHERE name ILIKE '%kartoffel%'
  AND name NOT ILIKE '%mos%'
  AND name NOT ILIKE '%chips%'
  AND name NOT ILIKE '%pommes%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"stk":150}'::jsonb
WHERE name ILIKE '%avocado%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"stk":80}'::jsonb
WHERE name ILIKE '%tomat%'
  AND name NOT ILIKE '%puré%'
  AND name NOT ILIKE '%pure%'
  AND name NOT ILIKE '%ketchup%'
  AND name NOT ILIKE '%soltørret%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"stk":130}'::jsonb
WHERE name ILIKE '%appelsin%' AND name NOT ILIKE '%juice%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"stk":130}'::jsonb
WHERE name ILIKE '%æble%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"stk":100}'::jsonb
WHERE name ILIKE '%banan%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"fed":3,"stk":3}'::jsonb
WHERE name ILIKE '%hvidløg%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"stk":56}'::jsonb
WHERE name ILIKE '%æg, høne%'
  AND name NOT ILIKE '%hvide%'
  AND name NOT ILIKE '%blomme%'
  AND name NOT ILIKE '%tørret%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"skive":12,"stk":12}'::jsonb
WHERE name ILIKE '%bacon%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"skive":12}'::jsonb
WHERE name ILIKE '%pålæg%'
   OR name ILIKE '%skinke%'
   OR name ILIKE '%salami%'
   OR name ILIKE '%spegepølse%'
   OR name ILIKE '%rullepølse%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"skive":20,"stk":20}'::jsonb
WHERE name ILIKE '%ost%'
  AND name NOT ILIKE '%ostesauce%'
  AND name NOT ILIKE '%flødeost%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"stk":50}'::jsonb
WHERE name ILIKE '%pølsebrød%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"stk":70}'::jsonb
WHERE name ILIKE '%burgerbolle%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"skive":12,"stk":12}'::jsonb
WHERE name ILIKE '%knækbrød%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"skive":30,"stk":30}'::jsonb
WHERE name ILIKE '%hvedebrød%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"skive":25,"stk":25}'::jsonb
WHERE name ILIKE '%toastbrød%';

UPDATE public.frida_ingredients
SET household_units = COALESCE(household_units, '{}'::jsonb) || '{"skive":45,"stk":45}'::jsonb
WHERE name ILIKE '%rugbrød%' AND name NOT ILIKE '%revet%';
