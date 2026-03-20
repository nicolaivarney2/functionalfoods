# Stripe – opsætning (live først, uden CLI)

Du **behøver ikke Stripe CLI**. Det er kun til at simulere webhooks på `localhost`. Hvis du vil teste på **det rigtige domæne** (fx Vercel), er den rigtige vej:

1. Deploy app med miljøvariabler  
2. Opret **webhook i Stripe Dashboard** mod din **https://…**-URL  
3. Test med **testnøgler** (`sk_test_…`) på live-URL’en indtil du er klar til `sk_live_…`

---

## 1. Vercel (eller andet host) – miljøvariabler

Under **Project → Settings → Environment Variables** (Production – og evt. Preview hvis du vil):

| Variabel | Værdi |
|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | `https://dit-domæne.dk` (præcis med `https`, **ikke** slash til sidst) |
| `STRIPE_SECRET_KEY` | `sk_test_…` fra Stripe → Developers → API keys (start med test) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` fra webhook-endpointet du opretter i trin 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | Som du allerede bruger (webhook + signup bruger den) |

Deploy igen efter du har gemt variablerne.

**Tjek:** Åbn `https://dit-domæne.dk/api/stripe/status` – `stripe_secret_configured` skal være `true`.

---

## 2. Webhook i Stripe Dashboard (ingen CLI)

1. Gå til **Developers → Webhooks** (sørg for at du er i **Test mode** hvis du bruger `sk_test_…`).
2. **Add endpoint**
3. **Endpoint URL:**  
   `https://dit-domæne.dk/api/stripe/webhook`
4. **Select events** → vælg **`checkout.session.completed`** → gem.
5. Åbn det nye endpoint → **Reveal** under **Signing secret** → kopiér **`whsec_…`**
6. Læg den ind i Vercel som **`STRIPE_WEBHOOK_SECRET`** og **deploy igen** (eller “Redeploy”).

Stripe kalder nu din **live**-URL når en Checkout-session gennemføres.

---

## 3. Supabase

Kør **`add-user-profiles-stripe-consent.sql`** i Supabase SQL Editor (én gang), så `user_profiles` kan opdateres med Stripe-data.

---

## 4. Sådan tester du på live med testnøgler

- Brug stadig **`sk_test_…`** og **Test mode** i Stripe, så ingen rigtige penge trækkes.
- Gå til **`https://dit-domæne.dk/kom-i-gang`**, opret bruger, vælg fx 60 kr, betal med **`4242 4242 4242 4242`**.
- Efter betaling: **`/overblik?betaling=ok`**
- I Stripe: **Developers → Webhooks** → dit endpoint → **Recent deliveries** (tjek at kald lykkes).
- I Supabase: `user_profiles` skal have `stripe_customer_id` og `last_contribution_amount_ore` for brugeren.

Når alt virker: skift til **Live mode** i Stripe, nye **live** API-nøgler, nyt **live** webhook-endpoint (samme sti, men oprettet i Live mode), opdater Vercel med `sk_live_…` og den nye **`whsec_…`**.

---

## 5. “Pay what you can” i koden

Beløb vælges på `/kom-i-gang`. Checkout oprettes med dynamisk beløb (5–50.000 kr). **0 kr** = ingen Checkout, kun Supabase-signup.

---

## Valgfrit: Stripe CLI (kun localhost)

Kun hvis du senere vil debugge webhooks uden at deploye:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Brug den viste `whsec_…` i **`.env.local`** – det er **ikke** den samme som på Vercel.

---

## Testkort (test mode)

- `4242424242424242` – succes  
- [Stripe testing](https://docs.stripe.com/testing)

---

## Status-endpoint (ingen hemmeligheder i svaret)

`GET /api/stripe/status` på dit domæne viser om nøgler og webhook-secret er sat (uden at vise værdierne).
