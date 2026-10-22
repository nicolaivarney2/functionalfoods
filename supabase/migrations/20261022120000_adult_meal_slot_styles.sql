-- Morgenmad- og frokost-stil på husstandens plan-ejer (voksen 0).
-- skip | fast | home | repeat  og  skip | leftovers | packed | home

ALTER TABLE public.adult_weight_loss_profiles
  ADD COLUMN IF NOT EXISTS breakfast_style text,
  ADD COLUMN IF NOT EXISTS lunch_style text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'adult_profiles_breakfast_style_check'
  ) THEN
    ALTER TABLE public.adult_weight_loss_profiles
      ADD CONSTRAINT adult_profiles_breakfast_style_check
      CHECK (
        breakfast_style IS NULL
        OR breakfast_style IN ('skip', 'fast', 'home', 'repeat')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'adult_profiles_lunch_style_check'
  ) THEN
    ALTER TABLE public.adult_weight_loss_profiles
      ADD CONSTRAINT adult_profiles_lunch_style_check
      CHECK (
        lunch_style IS NULL
        OR lunch_style IN ('skip', 'leftovers', 'packed', 'home')
      );
  END IF;
END $$;
