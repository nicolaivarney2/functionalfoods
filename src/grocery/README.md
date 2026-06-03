# Grocery Service

**Isolated grocery data service.** Lives inside the `functionalfoods` repo for
convenience but is fully decoupled — it has its own Supabase project, its own
env vars, and never touches the main `functionalfoods` Supabase, types, or
business logic.

It powers both:
- `functionalfoods` (recipe price comparison, shopping lists)
- `planomo` (Goma-style meal planning for families) — future

## Architecture

```
src/grocery/
├── db/
│   ├── client.ts                       Supabase clients (secret + publishable)
│   ├── migrate.ts                      Migrations runner (ledger-tracked)
│   └── migrations/
│       ├── 001_initial_schema.sql      Idempotent: tables, indexes, RLS, seed
│       └── 002_truncate_helpers.sql    truncate_chain() RPC
├── adapters/
│   ├── salling-algolia/                Netto, Bilka, Føtex (shared Algolia index)
│   ├── rema1000/                       REMA 1000 (direct public API)
│   ├── tjek/                           Tilbud (offers) for ALL DK chains via squid-api.tjek.com
│   └── nemlig/TODO.md                  Nemlig.com full catalog (deferred — stateful API)
├── api/
│   ├── auth.ts                         Bearer token auth
│   ├── mappers.ts                      DB row → DTO
│   ├── responses.ts                    Standard envelopes
│   └── shapes.ts                       Public DTO types
├── types/index.ts                      Shared DB row types
└── README.md

src/app/api/grocery/                    Consumer-facing HTTP endpoints
├── products/route.ts                   GET    list with filters
├── products/[id]/route.ts              GET    single by uuid or GTIN
├── search/route.ts                     GET    name/GTIN search
├── offers/route.ts                     GET    only on-sale items
├── categories/route.ts                 GET    3-level category tree
└── sync/salling/route.ts               POST   trigger sync

src/lib/grocery-client.ts               Type-safe client for app code
scripts/grocery-*.ts                    CLI utilities
```

## Quick start

```bash
# 1. Run pending DB migrations (idempotent — safe to re-run)
npx tsx scripts/grocery-migrate.ts

# 2. Initial population — Salling (Netto/Bilka/Føtex) + REMA
npx tsx scripts/grocery-sync-netto.ts --chain=netto
npx tsx scripts/grocery-sync-netto.ts --chain=foetex
npx tsx scripts/grocery-sync-netto.ts --chain=bilka
npx tsx scripts/grocery-sync-rema.ts

# 3. Pull weekly offers for the remaining DK chains via Tjek
npx tsx scripts/grocery-sync-tjek.ts --dry-run --max=10   # preview
npx tsx scripts/grocery-sync-tjek.ts                       # real run

# 4. Verify with the consumer client
npx tsx scripts/test-grocery-client.ts
```

## Environment variables

Add to `.env.local`:

```bash
# Supabase (required)
GROCERY_SUPABASE_URL=https://kuwqzodesppknbjtrsgs.supabase.co
GROCERY_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
GROCERY_SUPABASE_SECRET_KEY=sb_secret_...         # server only — never expose

# API security
GROCERY_SYNC_SECRET=...                            # auth for /api/grocery/sync/*
GROCERY_INTERNAL_API_KEY=...                       # auth for read endpoints

# Migrations (for `npx tsx scripts/grocery-migrate.ts`)
# Find the DB password in: Supabase Dashboard → Project Settings → Database → Database password
GROCERY_SUPABASE_DB_PASSWORD=...                   # used to build pooler conn string
# Optional override if you prefer a full connection string:
# GROCERY_DATABASE_URL=postgresql://postgres.[ref]:[pw]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
# Optional region override (default: eu-central-1):
# GROCERY_SUPABASE_REGION=eu-central-1

# Optional override (defaults to public frontend key)
# SALLING_ALGOLIA_SEARCH_KEY=...
```

The `GROCERY_*` prefix is intentional: makes it impossible to accidentally
reach for the wrong Supabase project from main `functionalfoods` code.

## Data model

| Table | Purpose |
|---|---|
| `stores` | Chains (`netto`, `bilka`, `rema-1000`, …) and physical stores |
| `products` | Canonical product, unique on `(source_chain, source_id)` |
| `product_offers` | Current price/offer per `(product_id, store_id)` |
| `price_history` | Daily snapshots for "price chart" feature |
| `sync_logs` | Audit trail per sync run |
| `api_keys` | Future external API-key auth |
| `_grocery_migrations` | Ledger for the migrations runner |

RLS is enabled on every table with **no policies**, so all access must go
through the server-side secret key. Public/anon traffic must go through our
`/api/grocery/*` endpoints.

## Data sources

| Source | Chains | How | Products |
|---|---|---|---|
| **Salling Algolia** (`F9VBJLR1BK`) | Netto, Bilka, Føtex | Direct queries to the public search index. Includes prices + campaign offers. | ~61k combined |
| **REMA 1000 API** (`api.digital.rema1000.dk/api/v3`) | REMA 1000 | Public REST API, paginated by department. No GTIN (name-based cross-match only). | ~3.9k |
| **Tjek/Squid API** (`squid-api.tjek.com/v2`) | Lidl, MENY, SPAR, Min Købmand, Løvbjerg, ABC Lavpris, Kvickly, SuperBrugsen, Brugsen, 365discount, Nemlig | Weekly leaflet offers (no full catalog, no GTIN). Skips Salling + REMA by default since we have their canonical sources. | ~3.4k offers across 11 chains |
| **Nemlig (deferred)** | Nemlig.com full catalog | Stateful API — see `adapters/nemlig/TODO.md` | 0 |

### Tjek adapter operational guardrails

The Tjek adapter ships with operational safeguards because the `squid-api.tjek.com`
endpoint is unauthenticated but **not officially licensed** for our use-case.
The adapter is deliberately quiet:

- Browser-realistic headers (`User-Agent`, `Accept-Language`, `Origin`/`Referer` mimic the eTilbudsavis web app).
- 600-1400ms jitter sleep between requests (configurable).
- Auto-pause after 3 consecutive 4xx/5xx responses (`TjekAutoPausedError`).
- Hard kill-switch: set `GROCERY_TJEK_DISABLED=true` in Vercel env to abort all outbound requests immediately.
- Image URLs are **not** populated on product rows (left in `raw_data` only) to prevent accidental hotlinking from public UI.

Sample size of a full nightly run (verified 27. May 2026): 11 dealers, 3,420 offers, ~43 seconds total, ~50-100 HTTP requests.

Live preview / verification: `/dev/grocery-tjek-explorer?chain=lidl` (server-rendered, no DB writes).

The nightly cron at `/api/grocery/sync/cron` runs on Vercel at `0 4 * * *`
(04:00 UTC ≈ 05:00 Danish time). **Default = light scheduled sync** — only
chains whose stores published new offers the **previous calendar day** (same
weekly rhythm as Goma, but we sync the **morning after** so evening updates
are included). Schedule lives in `src/lib/grocery/sync-schedule.ts`.

| Cron day (DK) | Catches releases from | What runs |
|---|---|---|
| Wednesday | Tuesday | Tjek: ABC Lavpris |
| Thursday | Wednesday | Tjek: 365discount |
| Friday | Thursday | Føtex (Salling) + Tjek: MENY, SPAR, Kvickly, SuperBrugsen, Løvbjerg |
| Saturday | Friday | Netto + Bilka (Salling) + Tjek: Brugsen |
| Sunday | Saturday | REMA 1000 + Tjek: Lidl |
| Monday | Sunday | Tjek: Nemlig |
| Tuesday | — | Skipped (no HTTP work) |

Manual overrides: `?full=true` (all chains, like the old nightly job),
`?only=netto,rema-1000` (explicit subset). Price snapshot runs only on days
that actually synced at least one chain.

### Catalog retention (Planomo sticky matches)

Sync is **upsert-only** — rows are never deleted because a tilbud ended.
See `docs/FF_HANDOFF_FOODDATA_INGREDIENT_MATCHING.md` §11 and
`src/grocery/sync/catalog-retention.ts`:

- Udløbet tilbud → `in_stock=false`, `is_on_sale=false`, pris bevares
- Efter fuld REMA/Salling-sync: varer der forsvandt fra API → `products.active=false`
- Efter Tjek-sync per kæde: tilbud ikke rørt i run → `in_stock=false`
- `/dagligvarer` (main Supabase) er uændret

### Chain coverage (single source of truth)

Different chains have different data quality. The truth lives in
`src/grocery/types/index.ts` as the `CHAIN_COVERAGE` map and `CatalogCoverage`
type. Both the sync layer and any consumer UI should import it instead of
hard-coding lists.

| Coverage | Meaning | Chains |
|---|---|---|
| `full` | Direct primary-source API. Normal shelf prices **and** offers. | Netto, Bilka, Føtex, REMA 1000 |
| `offers-only` | Tjek/Squid only — this week's tilbudsavis, no regular prices, no out-of-campaign products. | Lidl, MENY, SPAR, Min Købmand, Løvbjerg, Kvickly, SuperBrugsen, Brugsen, 365discount, ABC Lavpris |
| `none` | No working adapter yet (chain is seeded for forward-compat). | Nemlig |

All Tjek offers are persisted with `is_on_sale = true` and `source = 'tjek:offers'`,
so consumer queries can distinguish them from canonical catalog rows. Frontends
that mix chains should surface the `offers-only` status to users (e.g. a "Kun
ugens tilbud"-badge on those chains' product cards or store-filter chips) so it's
clear why the result set looks thin compared to chains with a full catalog.

## Consumer client

From any server-side code (App Router server components, route handlers,
scripts):

```ts
import { getGroceryClient } from '@/lib/grocery-client'

const client = getGroceryClient()

// Search across all chains
const { data } = await client.search({ q: 'banan' })

// Compare prices for one product across stores via GTIN
const banana = await client.getProduct('5712873461653')

// Get only items currently on sale
const offers = await client.listOffers({ chain: 'rema-1000' })

// Category navigation
const tree = await client.getCategoryTree({ chain: 'netto' })
```

The client throws `GroceryClientError` (with `.status` and `.endpoint`) on
non-2xx responses and returns `null` for `getProduct` 404s.

## How to add a new chain

1. Add the chain to the `stores` seed (already done for common DK chains).
2. Create `adapters/<chain>/` with the standard four files
   (`types.ts`, `client.ts`, `mapper.ts`, `sync.ts`, `index.ts`).
3. Map every product to `ProductInsert` (use `source_chain` matching the
   `stores.id`).
4. Add a runner script in `scripts/grocery-sync-<chain>.ts`.
5. (Optional) Add to the cron orchestrator (see `src/app/api/grocery/sync/cron`).

## How to add a migration

1. Drop a new `.sql` file in `db/migrations/` with a higher numeric prefix
   (`003_...`, `004_...`).
2. Make it idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE
   FUNCTION`, `INSERT ... ON CONFLICT DO NOTHING`).
3. Run `npx tsx scripts/grocery-migrate.ts --status` to confirm it shows up
   as pending, then run without `--status` to apply.

The runner uses a `_grocery_migrations` ledger table — applied migrations are
recorded so they don't re-run. If you ever edit a previously-applied file,
the runner will warn about a checksum mismatch and skip it.
