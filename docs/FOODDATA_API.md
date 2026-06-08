# Fooddata API

HTTP-API til det fælles dagligvare-katalog og kurering. Kører som del af FunctionalFoods-appen på `/api/grocery/*`.

**Eksterne katalog-brugere:** se [FOODDATA_API_KATALOG.md](./FOODDATA_API_KATALOG.md) — klar til at dele med partnere.

**Base URL (prod):** `https://functionalfoods.dk/api/grocery`  
**Base URL (lokal):** `http://localhost:3000/api/grocery`

---

## Auth

Alle endpoints kræver Bearer-token:

```http
Authorization: Bearer <api_key>
```

To typer nøgler:

| Type | Formål |
|------|--------|
| **Master key** (`GROCERY_INTERNAL_API_KEY`) | Kun FF internt — fuld adgang |
| **Consumer keys** (`fd_…`) | Til eksterne apps (Planomo m.fl.) — oprettes med script |

### Opret consumer key

```bash
# Fuld læseadgang (katalog + kurering)
npx tsx scripts/grocery-create-api-key.ts --name="Planomo prod"

# Kun katalog
npx tsx scripts/grocery-create-api-key.ts --name="Partner X" --scopes=read:catalog

# Kun kurering
npx tsx scripts/grocery-create-api-key.ts --name="Curation sync" --scopes=read:curation
```

Nøglen vises **kun én gang**. Den gemmes som SHA256-hash i `api_keys`-tabellen i fooddata Supabase.

---

## Discovery

```bash
curl -H "Authorization: Bearer $API_KEY" \
  https://functionalfoods.dk/api/grocery
```

Returnerer liste over endpoints og API-version.

---

## Katalog (scope: `read:catalog` eller `read`)

### Butikker / kæder

```http
GET /api/grocery/stores
```

Returnerer kæder med dækningsniveau (`full`, `offers-only`, `none`).

### Produkter

```http
GET /api/grocery/products?chain=netto&limit=50&offset=0
GET /api/grocery/products?gtin=5712873461653
GET /api/grocery/products?onSale=true&chain=rema-1000
```

| Param | Beskrivelse |
|-------|-------------|
| `chain` | `netto`, `bilka`, `rema-1000`, … |
| `category` | `category_lvl0` |
| `q` | Navnesøgning (ILIKE) |
| `gtin` | Eksakt stregkode |
| `onSale` | `true` = kun tilbud |
| `limit` | Max 200 (default 50) |
| `offset` | Pagination |

### Enkelt produkt

```http
GET /api/grocery/products/{uuid}
GET /api/grocery/products/{gtin}
```

Returnerer produkt med alle tilknyttede priser/tilbud.

### Søgning

```http
GET /api/grocery/search?q=banan&chain=netto&limit=25
```

`q` skal være mindst 2 tegn. Numerisk `q` søges som GTIN.

### Tilbud

```http
GET /api/grocery/offers?chain=netto&limit=50
```

Kun varer med aktivt tilbud (`is_on_sale = true`).

### Kategorier

```http
GET /api/grocery/categories?chain=netto
```

3-niveau træ med produktantal.

---

## Kurering (scope: `read:curation` eller `read`)

Fælles data mellem FF og Planomo. Se også [FF_HANDOFF_FOODDATA_SYNC.md](./FF_HANDOFF_FOODDATA_SYNC.md).

**Produktnøgle:** `productExternalId` = `{source_chain}-{source_id}` (fx `bilka-110606`).

### Ingrediens ↔ produkt matches

```http
GET /api/grocery/curation/matches?ingredientId=<uuid>&limit=100
GET /api/grocery/curation/matches?productExternalId=bilka-110606
GET /api/grocery/curation/matches?since=2026-06-01T00:00:00Z
```

### Match-kø (nye varer)

```http
GET /api/grocery/curation/queue?status=pending
```

| Param | Default | Værdier |
|-------|---------|---------|
| `status` | `pending` | `pending`, `matched`, `dismissed` |
| `source` | — | `planomo`, `ff` |
| `storeId` | — | fx `netto` |

### Fravalg-tags (ingrediens)

```http
GET /api/grocery/curation/ingredient-tags?ingredientId=<uuid>
```

### Øko-tags (produkt)

```http
GET /api/grocery/curation/organic-tags?productExternalId=rema-1000-306872
```

---

## Response-format

**Liste:**

```json
{
  "data": [ /* ... */ ],
  "meta": { "total": 1234, "limit": 50, "offset": 0 }
}
```

**Enkelt:**

```json
{ "data": { /* ... */ } }
```

**Fejl:**

```json
{ "error": "Unauthorized" }
```

HTTP-koder: `400` validering, `401` auth, `403` manglende scope, `404` ikke fundet, `500` server.

---

## Eksempel: Planomo integration

```typescript
const BASE = 'https://functionalfoods.dk'
const API_KEY = process.env.FOODDATA_API_KEY!

async function fetchMatches(since: string) {
  const url = new URL('/api/grocery/curation/matches', BASE)
  url.searchParams.set('since', since)
  url.searchParams.set('limit', '500')

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
```

Filtrér altid lokalt: ignorer `ingredient_id` og `productExternalId` som ikke findes i jeres egen DB.

---

## Skriv-adgang

Kurering **skrives** stadig via Supabase service role + publish-scripts (`sync-*-to-fooddata.ts`) eller FF admin — ikke via dette read-API. Kontakt FF for write-adgang hvis I har brug for det senere.

---

## Env (FF server)

```bash
GROCERY_SUPABASE_URL=           # fooddata Supabase
GROCERY_SUPABASE_SECRET_KEY=    # service role (server only)
GROCERY_INTERNAL_API_KEY=       # master read key
```

Consumer keys oprettes i fooddata DB — de behøver ikke env på FF-serveren ud over at `api_keys`-tabellen findes (migration `001_initial_schema.sql`).
