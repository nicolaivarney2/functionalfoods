# Stripe – abonnementer (Madbudget + Premium)

Functional Foods bruger **faste månedlige abonnementer** — ikke “pay what you can”. Det matcher App Store-krav og vores 3-plan-model:

| Plan | Pris | `subscription_tier` |
|------|------|---------------------|
| Gratis | 0 kr | `free` |
| Madbudget | 29 kr/md | `plus` |
| Premium | 249 kr/md | `premium` |

Web-betaling: **Stripe Checkout** (`mode: subscription`).  
App-betaling: **App Store** via RevenueCat (separat opsætning).

---

## 1. Miljøvariabler (Vercel + lokal override)

| Variabel | Beskrivelse |
|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | `https://functionalfoods.dk` (uden trailing slash) |
| `STRIPE_SECRET_KEY` | `sk_test_…` → senere `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` fra webhook-endpoint |
| `STRIPE_PRICE_PLUS_MONTHLY` | `price_…` for 29 DKK/md *(anbefalet)* |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | `price_…` for 249 DKK/md *(anbefalet)* |
| `SUPABASE_SERVICE_ROLE_KEY` | Bruges af webhook til at sætte `subscription_tier` |

Uden Price ID'er opretter checkout **dynamiske priser** — det virker, men faste Price ID'er er bedre til rapportering og Customer Portal.

**Tjek:** `GET https://functionalfoods.dk/api/stripe/status` → `stripe_secret_configured: true`.

---

## 2. Opret produkter i Stripe Dashboard

Under **Products** (Test mode først):

1. **Functional Foods Madbudget** — 29 DKK, recurring monthly  
2. **Functional Foods Premium** — 249 DKK, recurring monthly  

Kopiér **Price ID** (`price_…`) til env-variablerne ovenfor.

---

## 3. Webhook (ingen CLI nødvendig på produktion)

1. **Developers → Webhooks → Add endpoint**
2. URL: `https://functionalfoods.dk/api/stripe/webhook`
3. Vælg events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Kopiér **Signing secret** → `STRIPE_WEBHOOK_SECRET` → redeploy

Webhook sætter `user_profiles.subscription_tier` og `stripe_subscription_id`. Ved opsigelse sættes tier tilbage til `free`.

---

## 4. Customer Portal

**Settings → Billing → Customer portal:**

- Aktivér portal
- Tillad opsigelse og plan-skift (hvis begge priser er i samme produktfamilie)

Brugere med web-abonnement åbner portal via `POST /api/stripe/create-portal-session` (fx fra profil).

---

## 5. Test-flow (test mode)

1. Deploy med `sk_test_…` og webhook-secret
2. Gå til **`/lav-din-plan`**, gennemfør wizarden, vælg Madbudget eller Premium
3. Betal med `4242 4242 4242 4242`
4. Verificer:

**Stripe:** Webhooks → Recent deliveries → grøn

**Supabase:**
```sql
SELECT subscription_tier, stripe_subscription_id, last_contribution_amount_ore
FROM user_profiles WHERE id = 'din-user-uuid';
```

**API (logget ind):** `GET /api/subscription/status`

---

## 6. Manuel test uden Stripe

```sql
UPDATE user_profiles SET subscription_tier = 'plus' WHERE id = 'din-uuid';
-- eller 'premium' for Messenger-adgang
```

---

## 7. API-endpoints

| Endpoint | Formål |
|----------|--------|
| `POST /api/stripe/create-subscription-checkout` | `{ tier: 'plus' \| 'premium' }` → Checkout URL |
| `POST /api/stripe/create-portal-session` | Administrer/opsig abonnement |
| `GET /api/subscription/status` | Tier + forbrug (madplaner/alarmer) |
| `POST /api/subscription/consume-meal-plan` | Tæl madplan (web client-side generator) |

`/api/stripe/create-checkout-session` (gammel pay-what-you-can) er **deprecated**.

---

## 8. Valgfrit: Stripe CLI (localhost)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Brug den viste `whsec_…` i **`.env.local`** — ikke den samme som på Vercel.

---

## 9. Go live

1. Live mode i Stripe  
2. Nye live API-nøgler + live webhook-endpoint  
3. Opdater Vercel med `sk_live_…` og ny `whsec_…`  
4. Opret live Price ID'er og opdater env

---

## 10. Supabase-migration

Kør `supabase/migrations/20260709120000_subscription_tiers.sql` hvis ikke allerede gjort.

Tidligere: `add-user-profiles-stripe-consent.sql` (stripe_customer_id m.m.) skal også være kørt.

---

## 11. App Store (RevenueCat)

Appen bruger **RevenueCat** med produkter:

| Tier | Product ID |
|------|------------|
| Madbudget | `dk.functionalfoods.plus.29` |
| Premium | `dk.functionalfoods.premium.249` |

Efter køb kalder appen `POST /api/subscription/apply-iap-tier` så `subscription_tier` opdateres med det samme.

**Anbefalet:** Opsæt også RevenueCat server-webhook mod FF-API, så tier synkes ved fornyelse/opsigelse uden at appen er åben.

