-- Valgfrit ugentligt budgetloft (DKK) til madplansgenerering (prioriterer tilbud mere ved lavere loft)
ALTER TABLE family_profiles
  ADD COLUMN IF NOT EXISTS weekly_budget_kr INTEGER NULL;

COMMENT ON COLUMN family_profiles.weekly_budget_kr IS 'Valgfrit max-indkøbsbudget pr. uge i kr; NULL = intet loft';
