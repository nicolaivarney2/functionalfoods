# Handoff til FunctionalFoods: Bilka / Netto / REMA tilbud i fooddata

**Målgruppe:** FF Cursor (Composer 2.5)  
**Database:** FF Main / fooddata (`GROCERY_SUPABASE_URL` — samme Supabase som Planomo læser fra)  
**Planomo:** Læser kun via `scripts/import-fooddata-to-planomo.ts` — **skriver ikke** til fooddata.

---

## TL;DR — hvad der skal fixes i FF

| Problem | Rodårsag | Fix |
|--------|----------|-----|
| Bilka: kun ~6 “fødevare-tilbud” i downstream apps | `category_lvl0` taget fra `categories.lvl0` (“Non-food”) i stedet for `consumerFacingHierarchy` | Salling mapper: CFH først + normalisering |
| Netto: næsten ingen `before_price_cents` | Netto sætter sjældent `storeData.beforePrice`; tilbud i `unitsOfMeasurePrice` / `unitsOfMeasureOfferPrice` | Ny `pricing.ts` + infer før-pris fra enhedspris-ratio |
| REMA: falske tilbud / manglende før-pris | `is_on_sale` sat fra `is_campaign` uden at `regular.price > campaign.price` | Strammere REMA mapper |
| `is_on_sale=true` uden rabat | Flag sat uden `before_price_cents > price_cents` | Kun `is_on_sale` når proven discount |

**Reference-implementering (allerede testet mod live API + fooddata):** Planomo-repo  
`src/grocery/adapters/salling-algolia/pricing.ts`  
`src/grocery/adapters/salling-algolia/mapper.ts`  
`src/grocery/adapters/rema1000/mapper.ts`  
`scripts/backfill-fooddata-before-price.ts`

Port disse filer/ændringer til FF's tilsvarende `src/grocery/` (samme struktur ifølge `FOODDATA_IMPORT_ANSWERS.md`).

---

## Arkitektur (hvem gør hvad)

```
Salling Algolia API ──► FF sync (salling-algolia) ──► fooddata.product_offers
REMA digital API    ──► FF sync (rema-1000)       ──► fooddata.product_offers
                              │
                              ▼
                    Planomo import (read-only)
                              │
                              ▼
                    planomo.product_offers (dagligvarer UI)
```

FF ejer **sync + backfill**. Planomo ejer kun **import** efter FF har skrevet korrekt data.

---

## 1. Salling (Bilka, Netto, Føtex) — ny fil `pricing.ts`

Opret `src/grocery/adapters/salling-algolia/pricing.ts` (kopiér fra Planomo).

### Før-pris prioritet (alle i øre)

1. `storeData.beforePrice` hvis `beforePrice > price`
2. `hit.cpOriginalPrice` hvis `> price`
3. **Netto-specifikt:** hvis tilbudssignal og `unitsOfMeasurePrice > unitsOfMeasureOfferPrice`:
   - `beforePrice = round(price * (unitsOfMeasurePrice / unitsOfMeasureOfferPrice))`
   - Kun når `offerDescription` er sat, ELLER `hit.isInCurrentLeaflet`, ELLER `unitsOfMeasureShowPrice === unitsOfMeasureOfferPrice`
   - Cap: `before <= price * 3`

### `pickRepresentativeStore`

- Gå **alle** `storeData`-entries igennem (ikke kun første in-stock).
- Vælg den med størst dokumenteret rabat (`before - price`), tie-break: inStock.

### `is_on_sale`

```ts
const isOnSale = beforePriceCents !== null  // aldrig kun cpOffer-flag
```

### `product_offers.raw_data` skal indeholde

```json
{
  "storeId": "...",
  "storeData": { ... },
  "isInCurrentLeaflet": true,
  "cpOriginalPrice": 0
}
```

(Nødvendigt til backfill og debugging.)

---

## 2. Salling mapper — `mapper.ts`

### A) Kategori / department (Bilka-fix)

I `pickCategoryLevel`:

1. **Først** `consumerFacingHierarchy.lvl0|1|2`
2. **Derefter** `categories.lvl0|1|2`
3. På `lvl0`: kør `normalizeDepartmentLabel()` (`Mejeri & køl` → `Mejeri og køl`, osv.)

**Hvorfor:** Algolia `categories.lvl0` er ofte `"Non-food"` / `"Pleje"` for madvarer; CFH har `"Mejeri & køl"`, `"Kolonial"`, osv.

### B) Produktnavn

```ts
const name = hit.name?.trim() || hit.article?.trim() || `Vare ${hit.objectID}`
```

Undgår NOT NULL fejl ved upsert.

### C) Offers

Brug `pickRepresentativeStore(hit.storeData, hit)` fra `pricing.ts` — erstat gammel “første in-stock” logik.

---

## 3. REMA — `rema1000/mapper.ts`

### `pickCurrentPrice`

- Hvis `is_campaign`: vælg **laveste** kampagnepris.

### `pickRegularPrice(prices, current)`

- Foretræk højeste pris blandt `!is_campaign`.
- Ellers højeste pris hvor `price > current.price + 0.01`.

### `is_on_sale`

```ts
const beforePriceCents = regular && regular.price > current.price + 0.01 ? toCents(regular.price) : null
const isOnSale = beforePriceCents !== null
```

**Fjern:** `isOnSale = current.is_campaign || current.is_advertised` uden pris-check.

---

## 4. Backfill (efter mapper-deploy, før næste fulde sync)

Script: `scripts/backfill-fooddata-before-price.ts` (port fra Planomo).

- Scanner `product_offers` med `raw_data`
- Salling: samme `resolveBeforePriceCents` som sync
- REMA: parse `raw_data.prices[]` med samme logik som mapper
- Sæt `before_price_cents` + `is_on_sale` + `discount_percentage`
- Ryd `is_on_sale` hvor ingen rabat kan bevises

```bash
npx tsx scripts/backfill-fooddata-before-price.ts
```

---

## 5. Sync-kommandoer (FF)

```bash
# Salling — hver kæde
npx tsx scripts/grocery-sync-netto.ts --chain=netto
npx tsx scripts/grocery-sync-netto.ts --chain=bilka
npx tsx scripts/grocery-sync-netto.ts --chain=foetex

# REMA
npx tsx scripts/grocery-sync-rema.ts
```

Algolia client skal bruge `attributesToRetrieve: ['*']` (ellers mangler `storeData`, `gtin`, `cpOriginalPrice`).

---

## 6. Verifikation i fooddata (SQL eller script)

Efter sync + backfill (verificeret 2026-05-31):

| `store_id` | total | `in_stock` | `on_sale` | `real_discount` |
|------------|------:|-----------:|----------:|----------------:|
| bilka | 40.175 | 39.109 | 14.671 | 14.669 |
| foetex | 17.731 | 15.438 | 6.388 | 6.388 |
| netto | 4.493 | 4.493 | 431 | 431 |
| rema-1000 | 4.450 | 4.450 | 298 | 298 |

FF vurderer **431 / 298 som “done”** (forventet interval 350–550 / 250–400). Se [FF_QUESTIONNAIRE_TILBUD.md](./FF_QUESTIONNAIRE_TILBUD.md) for fuldt spørgeskema + svar.

Test-query (Supabase SQL — **fooddata bruger `in_stock`, ikke `is_available`**):

```sql
SELECT store_id,
  COUNT(*) AS total_offers,
  COUNT(*) FILTER (WHERE in_stock) AS in_stock,
  COUNT(*) FILTER (WHERE is_on_sale) AS on_sale,
  COUNT(*) FILTER (WHERE before_price_cents > price_cents + 1) AS real_discount
FROM product_offers
WHERE store_id IN ('bilka','netto','foetex','rema-1000')
GROUP BY store_id;
```

Bilka fødevare-test (products.category_lvl0 i food-taxonomy):

```sql
SELECT COUNT(*)
FROM product_offers o
JOIN products p ON p.id = o.product_id
WHERE o.store_id = 'bilka'
  AND o.before_price_cents > o.price_cents + 1
  AND p.category_lvl0 IN (
    'Frugt og grønt','Brød og kager','Kød og fisk','Kolonial',
    'Mejeri og køl','Frost','Køl','Mejeri','Drikkevarer'
  );
```

Forvent **hundredvis** (ikke 6).

### Live API spot-check (Netto)

Netto leaflet-varer har typisk:

- `offerDescription: "Avisvare"`
- `beforePrice` mangler ofte
- `unitsOfMeasurePrice` > `unitsOfMeasureOfferPrice` → infer før-pris

---

## 7. Hvad Planomo gør bagefter (ikke FF's job)

Når fooddata er korrekt:

```bash
# I Planomo-repo
npx tsx scripts/import-fooddata-to-planomo.ts --skip-history
```

Import-regler (allerede i Planomo):

- `is_offer_active` kun hvis `normal_price > current_price` og `sale_valid_to` ikke udløbet
- `resolveBeforePriceKr` læser også `raw_data` (unit-pris fallback)

---

## 8. Acceptkriterier (FF er færdig når)

- [ ] `pricing.ts` portet og brugt i Salling mapper
- [ ] CFH bruges til `category_lvl0` (Bilka mad ikke længere "Non-food")
- [ ] Netto: `product_offers` med `is_on_sale` >> 5 (efter sync)
- [ ] REMA: ingen rækker med `is_on_sale` hvor `before_price_cents IS NULL` eller `<= price_cents`
- [ ] REMA: `active` + `in_stock` fra navn+pris; `is_available_in_all_stores` kun i `raw_data` (§10)
- [ ] Backfill kørt én gang på prod/staging fooddata
- [ ] Cron/scheduled sync kører opdateret kode (ikke gammel goma-only pipeline for disse kæder)

---

## 9. Kendte FF-gotchas

- **Duplicate `products`:** Flere fooddata UUID'er kan mappe til samme `source_chain-source_id`. Dedupe ved upsert på conflict key.
- **Goma-importer:** Gammel pipeline kan overskrive `product_offers` — sikr at Salling/REMA sync er **source of truth** for `bilka`, `netto`, `rema-1000`.
- **Priser i fooddata:** `price_cents` / `before_price_cents` er **øre** (integer). Planomo konverterer til kroner ved import.

---

## 10. REMA: `active` / `in_stock` vs. `is_available_in_all_stores` (jun 2026)

REMA API kan returnere `is_available_in_all_stores: false` selvom varen sælges (fx **AUBERGINE** 306872, 9 kr på shop.rema1000.dk).

**Gammel regel (forkert):** `active` og synlighed afhænger af `is_available_in_all_stores !== false` → ~595 varer skjult i Fooddata/Planomo.

**Politik nu (FF + Planomo reference-mapper):**

| Felt (Fooddata) | Regel | Planomo efter import |
|-----------------|-------|----------------------|
| `products.active` | `true` hvis navn + pris i REMA API | Produkt importeres (`activeOnly`) |
| `product_offers.in_stock` | Samme: `true` hvis navn + pris | `is_available: true` |
| `is_available_in_all_stores` | Kun i `raw_data` — **styrer ikke** active/in_stock | UI kan vise “måske ikke i din lokale Rema” senere |

**Stadig inaktiv / ingen række:** intet navn, ingen pris, eller 404 i API (fx ØKO. AUBERGINE 306871).

Reference: `src/grocery/adapters/rema1000/mapper.ts` (`hasRemaCatalogPrice`).

### Verifikation efter sync + Planomo-import

**Fooddata** (ikke `name_store` / `current_price` — det er Planomo-felter):

```sql
SELECT p.name, p.active, o.price_cents, o.in_stock, o.is_on_sale,
       o.raw_data->>'is_available_in_all_stores' AS not_in_all_stores
FROM products p
LEFT JOIN product_offers o ON o.product_id = p.id AND o.store_id = 'rema-1000'
WHERE p.source_chain = 'rema-1000' AND p.source_id = '306872';
```

Forventet: `active = true`, `in_stock = true`, `price_cents = 900`, `not_in_all_stores = false`.

```sql
-- Efter fix: ingen REMA-tilbud med pris men in_stock false
SELECT COUNT(*) AS bad
FROM product_offers o
JOIN products p ON p.id = o.product_id
WHERE o.store_id = 'rema-1000'
  AND o.price_cents > 0
  AND o.in_stock = false;
```

Forventet: `bad = 0`.

**Planomo** (efter `npx tsx scripts/import-fooddata-to-planomo.ts`):

```sql
SELECT name_store, current_price, is_on_sale, is_available, product_id
FROM product_offers
WHERE store_id = 'rema-1000' AND name_store ILIKE 'aubergine%';
```

Forventet: én række, 9 kr, `is_available = true` **uden** manuel `UPDATE`.

**UI:** `/dagligvarer` → søg `aubergine`, REMA, “Kun tilbud” **fra** → AUBERGINE 9 kr.

---

## 11. Kontakt / reference

Planomo undersøgelse + test-sync kørt mod shared fooddata (maj–jun 2026).  
Spørgsmål: se `FOODDATA_IMPORT_ANSWERS.md` og Planomo `src/grocery/README.md`.
