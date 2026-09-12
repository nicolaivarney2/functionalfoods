-- Partner-konto: egen login og madlog, fælles madplan.
-- Husstandsdata bliver på primær (linked_owner_id). Max én partner pr. primær.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS account_kind text NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS linked_owner_id uuid;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_account_kind_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_account_kind_check
  CHECK (account_kind = ANY (ARRAY['primary'::text, 'partner'::text]));

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_partner_owner_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_partner_owner_check CHECK (
    (account_kind = 'primary' AND linked_owner_id IS NULL)
    OR (
      account_kind = 'partner'
      AND linked_owner_id IS NOT NULL
      AND linked_owner_id <> id
    )
  );

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_linked_owner_id_fkey;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_linked_owner_id_fkey
  FOREIGN KEY (linked_owner_id) REFERENCES public.user_profiles(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_one_partner_per_owner
  ON public.user_profiles (linked_owner_id)
  WHERE account_kind = 'partner' AND linked_owner_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.partner_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text])),
  expires_at timestamptz NOT NULL,
  accepted_user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_invitations_one_pending_per_owner
  ON public.partner_invitations (owner_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS partner_invitations_email_idx
  ON public.partner_invitations (lower(email));

ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_household_member(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    auth.uid() = p_owner_id
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.account_kind = 'partner'
        AND up.linked_owner_id = p_owner_id
    )
$$;

REVOKE ALL ON FUNCTION public.is_household_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.reject_partner_owned_household_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  kind text;
BEGIN
  SELECT account_kind INTO kind FROM public.user_profiles WHERE id = NEW.user_id;
  IF kind = 'partner' THEN
    RAISE EXCEPTION 'Partner accounts cannot own household data';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reject_partner_family_profiles ON public.family_profiles;
CREATE TRIGGER reject_partner_family_profiles
  BEFORE INSERT OR UPDATE OF user_id ON public.family_profiles
  FOR EACH ROW EXECUTE FUNCTION public.reject_partner_owned_household_row();

DROP TRIGGER IF EXISTS reject_partner_user_meal_plans ON public.user_meal_plans;
CREATE TRIGGER reject_partner_user_meal_plans
  BEFORE INSERT OR UPDATE OF user_id ON public.user_meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.reject_partner_owned_household_row();

DROP TRIGGER IF EXISTS reject_partner_user_basisvarer ON public.user_basisvarer;
CREATE TRIGGER reject_partner_user_basisvarer
  BEFORE INSERT OR UPDATE OF user_id ON public.user_basisvarer
  FOR EACH ROW EXECUTE FUNCTION public.reject_partner_owned_household_row();

DROP TRIGGER IF EXISTS reject_partner_manual_shopping ON public.user_manual_shopping_items;
CREATE TRIGGER reject_partner_manual_shopping
  BEFORE INSERT OR UPDATE OF user_id ON public.user_manual_shopping_items
  FOR EACH ROW EXECUTE FUNCTION public.reject_partner_owned_household_row();

DROP TRIGGER IF EXISTS reject_partner_adult_profiles ON public.adult_weight_loss_profiles;
CREATE TRIGGER reject_partner_adult_profiles
  BEFORE INSERT OR UPDATE OF user_id ON public.adult_weight_loss_profiles
  FOR EACH ROW EXECUTE FUNCTION public.reject_partner_owned_household_row();

CREATE OR REPLACE FUNCTION public.protect_account_kind()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND auth.uid() IS NOT NULL
     AND (
       NEW.account_kind IS DISTINCT FROM OLD.account_kind
       OR NEW.linked_owner_id IS DISTINCT FROM OLD.linked_owner_id
     ) THEN
    RAISE EXCEPTION 'Cannot change account kind';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_account_kind ON public.user_profiles;
CREATE TRIGGER protect_account_kind
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_account_kind();

DROP POLICY IF EXISTS "Users can delete own family profile" ON public.family_profiles;
DROP POLICY IF EXISTS "Users can insert own family profile" ON public.family_profiles;
DROP POLICY IF EXISTS "Users can update own family profile" ON public.family_profiles;
DROP POLICY IF EXISTS "Users can view own family profile" ON public.family_profiles;

CREATE POLICY "Household can view family profile"
  ON public.family_profiles FOR SELECT
  USING (public.is_household_member(user_id));
CREATE POLICY "Household can insert family profile"
  ON public.family_profiles FOR INSERT
  WITH CHECK (public.is_household_member(user_id));
CREATE POLICY "Household can update family profile"
  ON public.family_profiles FOR UPDATE
  USING (public.is_household_member(user_id))
  WITH CHECK (public.is_household_member(user_id));
CREATE POLICY "Household can delete family profile"
  ON public.family_profiles FOR DELETE
  USING (public.is_household_member(user_id));

DROP POLICY IF EXISTS "Users can delete own meal plans" ON public.user_meal_plans;
DROP POLICY IF EXISTS "Users can insert own meal plans" ON public.user_meal_plans;
DROP POLICY IF EXISTS "Users can update own meal plans" ON public.user_meal_plans;
DROP POLICY IF EXISTS "Users can view own meal plans" ON public.user_meal_plans;

CREATE POLICY "Household can view meal plans"
  ON public.user_meal_plans FOR SELECT
  USING (
    public.is_household_member(user_id)
    OR ((is_shared = true) AND (share_token IS NOT NULL))
  );
CREATE POLICY "Household can insert meal plans"
  ON public.user_meal_plans FOR INSERT
  WITH CHECK (public.is_household_member(user_id));
CREATE POLICY "Household can update meal plans"
  ON public.user_meal_plans FOR UPDATE
  USING (public.is_household_member(user_id))
  WITH CHECK (public.is_household_member(user_id));
CREATE POLICY "Household can delete meal plans"
  ON public.user_meal_plans FOR DELETE
  USING (public.is_household_member(user_id));

DROP POLICY IF EXISTS "Users can delete their own basisvarer" ON public.user_basisvarer;
DROP POLICY IF EXISTS "Users can insert their own basisvarer" ON public.user_basisvarer;
DROP POLICY IF EXISTS "Users can update their own basisvarer" ON public.user_basisvarer;
DROP POLICY IF EXISTS "Users can view their own basisvarer" ON public.user_basisvarer;

CREATE POLICY "Household can view basisvarer"
  ON public.user_basisvarer FOR SELECT
  USING (public.is_household_member(user_id));
CREATE POLICY "Household can insert basisvarer"
  ON public.user_basisvarer FOR INSERT
  WITH CHECK (public.is_household_member(user_id));
CREATE POLICY "Household can update basisvarer"
  ON public.user_basisvarer FOR UPDATE
  USING (public.is_household_member(user_id))
  WITH CHECK (public.is_household_member(user_id));
CREATE POLICY "Household can delete basisvarer"
  ON public.user_basisvarer FOR DELETE
  USING (public.is_household_member(user_id));

DROP POLICY IF EXISTS "Users manage own manual shopping items" ON public.user_manual_shopping_items;

CREATE POLICY "Household manage manual shopping items"
  ON public.user_manual_shopping_items
  FOR ALL
  USING (public.is_household_member(user_id))
  WITH CHECK (public.is_household_member(user_id));

DROP POLICY IF EXISTS "Users can delete own adult profiles" ON public.adult_weight_loss_profiles;
DROP POLICY IF EXISTS "Users can insert own adult profiles" ON public.adult_weight_loss_profiles;
DROP POLICY IF EXISTS "Users can update own adult profiles" ON public.adult_weight_loss_profiles;
DROP POLICY IF EXISTS "Users can view own adult profiles" ON public.adult_weight_loss_profiles;

CREATE POLICY "Household can view adult profiles"
  ON public.adult_weight_loss_profiles FOR SELECT
  USING (public.is_household_member(user_id));
CREATE POLICY "Household can insert adult profiles"
  ON public.adult_weight_loss_profiles FOR INSERT
  WITH CHECK (public.is_household_member(user_id));
CREATE POLICY "Household can update adult profiles"
  ON public.adult_weight_loss_profiles FOR UPDATE
  USING (public.is_household_member(user_id))
  WITH CHECK (public.is_household_member(user_id));
CREATE POLICY "Household can delete adult profiles"
  ON public.adult_weight_loss_profiles FOR DELETE
  USING (public.is_household_member(user_id));
