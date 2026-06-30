-- adult_weight_loss_profiles.activity_level var DECIMAL(3,2), som afrunder 1.375 → 1.38
-- og 1.725 → 1.73. App/web bruger ActivityLevel enum med tre decimaler.
ALTER TABLE public.adult_weight_loss_profiles
  ALTER COLUMN activity_level TYPE DECIMAL(4,3);
