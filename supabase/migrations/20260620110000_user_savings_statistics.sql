-- ───────────────────────────────────────────────────────────────────────────
-- Besparelses-statistik ("Du har sparet X kr med Functional Foods")
--
-- Model:
--   total_savings = item_savings (Motor A) + plan_savings (Motor B)
--   item_savings  = Σ (referencepris − betalt pris) for varer i indkøbslisten
--                   referencepris = median af price_history (90 dage) → fanger
--                   både tilbud OG butiksvalg uden cirkulær baseline.
--   plan_savings  = (gennemsnitsplan til normalpris) − (vores plan)
--
-- Alle beløb i øre (integer) for at undgå float-afrunding.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_savings_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Hvilken madplan snapshottet hører til. Vi snapshotter den AKTIVE plan, ikke
  -- hver regenerering. Re-beregning på samme plan = upsert på (user_id, meal_plan_id).
  meal_plan_id uuid,

  period_start date NOT NULL,            -- ugen besparelsen gælder (mandag)
  persons integer NOT NULL DEFAULT 1,
  num_dinners integer NOT NULL DEFAULT 0,
  store_id text,                         -- valgte/billigste butik

  -- Beløb i øre
  baseline_cost_cents integer NOT NULL DEFAULT 0,  -- "uden Functional Foods"-kurven
  planomo_cost_cents  integer NOT NULL DEFAULT 0,  -- det de faktisk betaler (app-feltnavn)
  item_savings_cents  integer NOT NULL DEFAULT 0,  -- Motor A (tilbud + butiksvalg)
  plan_savings_cents  integer NOT NULL DEFAULT 0,  -- Motor B (smartere planlægning)
  total_savings_cents integer NOT NULL DEFAULT 0,  -- A + B (== baseline − cost)

  -- Hvilken referencepris ærligheds-tallet er målt imod (anti-oppustning).
  reference_basis text NOT NULL DEFAULT 'history_median'
    CHECK (reference_basis IN ('history_median', 'normal_price', 'lowest_of')),

  -- Fuld dokumentation pr. vare/ret, så et stort tal kan forsvares ("kvittering").
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,

  currency text NOT NULL DEFAULT 'DKK',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_savings_snapshots_user
  ON public.user_savings_snapshots (user_id);
CREATE INDEX IF NOT EXISTS idx_user_savings_snapshots_user_period
  ON public.user_savings_snapshots (user_id, period_start DESC);

-- Én snapshot pr. aktiv madplan (re-beregning opdaterer i stedet for at duplikere).
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_savings_snapshots_plan
  ON public.user_savings_snapshots (user_id, meal_plan_id)
  WHERE meal_plan_id IS NOT NULL;

COMMENT ON TABLE public.user_savings_snapshots IS
  'Per-bruger besparelse pr. madplan/uge. Akkumuleres til "Du har sparet X kr".';

ALTER TABLE public.user_savings_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own savings snapshots" ON public.user_savings_snapshots;
CREATE POLICY "Users manage own savings snapshots"
  ON public.user_savings_snapshots
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- Akkumuleret total pr. bruger (til hero-tallet på forsiden + stats-siden).
-- security_invoker = view respekterer RLS for den kaldende bruger.
CREATE OR REPLACE VIEW public.user_savings_totals
WITH (security_invoker = true) AS
SELECT
  user_id,
  count(*)                              AS snapshot_count,
  coalesce(sum(total_savings_cents), 0) AS total_savings_cents,
  coalesce(sum(item_savings_cents), 0)  AS item_savings_cents,
  coalesce(sum(plan_savings_cents), 0)  AS plan_savings_cents,
  min(period_start)                     AS since_date,
  max(period_start)                     AS last_period
FROM public.user_savings_snapshots
GROUP BY user_id;

COMMENT ON VIEW public.user_savings_totals IS
  'Akkumuleret besparelse pr. bruger. Bruges til "I år har du sparet X kr".';
