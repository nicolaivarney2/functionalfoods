-- Tilføj 'ai-voice' som gyldig kilde for foreløbige opskrifter.
-- Brugeren kan indtale hvad de har spist → Whisper transskriberer → GPT strukturerer
-- til en foreløbig opskrift (samme format som ai-photo). Idempotent.

ALTER TABLE provisional_recipes DROP CONSTRAINT IF EXISTS provisional_recipes_source_check;

ALTER TABLE provisional_recipes
  ADD CONSTRAINT provisional_recipes_source_check
  CHECK (source IN ('ai-photo', 'ai-voice', 'manual'));
