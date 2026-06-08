# Handoff til FunctionalFoods: fooddata ingrediens↔produkt matching

**Målgruppe:** FF Cursor (Composer)  
**Formål:** Samme model som Planomo — hold `product_ingredient_matches` korrekte mod **fooddata-kataloget**, uden Goma. Planomo og FF deler samme `ingredient_id`-UUID’er.

**Relateret:** [FF_HANDOFF_GOMA_FOODDATA_MAPPING.md](./FF_HANDOFF_GOMA_FOODDATA_MAPPING.md) (engangs-migration fra gamle Goma-ID’er), [FOODDATA_IMPORT_ANSWERS.md](../FOODDATA_IMPORT_ANSWERS.md) (import-felter).

---

## TL;DR

| Koncept | Værdi |
|--------|--------|
| Produkt-nøgle (canonical) | `products.id` = `{source_chain}-{source_id}` (fx `bilka-110606`) |
| Match-række | `product_ingredient_matches.product_external_id` = **samme** som `products.id` |
| Fooddata-butikker (matching) | Alle kæder i fooddata — se `FOODDATA_ALL_CHAIN_STORE_IDS` i `src/lib/fooddata-stores.ts` |
| Fuld katalog-sync (FF i dag) | `bilka`, `netto`, `foetex`, `rema-1000` (Salling + REMA) |
| Kun tilbud / delvis data | Fx `meny`, `kvickly`, `spar`, `lidl`, `nemlig` — ofte Goma-æra eller fremtidig Tjek-API; stadig i import hvis rækker findes i fooddata |
| Nye varer efter sync | Indsæt i `product_ingredient_match_queue` (status `pending`) |
| Manuel ingrediens→produkt | Søg partial (fx `agu` → agurk), vælg **alle** relevante varer på tværs af butikker |

**Planomo reference-kode:**

- Kø-logik: `src/lib/product-match-queue.ts`
- Import + enqueue: `scripts/import-fooddata-to-planomo.ts` (trin 5/5)
- Admin kø (pagineret): `/admin/product-ingredient-matching/nye-varer`
- Admin ingrediens→produkt: `/admin/product-ingredient-matching`
- API: `/api/admin/product-match-queue`, `/api/admin/products-for-matching`

---

## 1. Kontekst: hvorfor Goma er ude

1. **Katalog** kommer nu fra **fooddata** (FF skriver, Planomo importerer).
2. Gamle matches bruger `product_external_id` fra Goma/Nemlig/python — de resolver ikke i UI.
3. **Engangs:** manuel gen-match i Planomo (ingrediens for ingrediens) ELLER FF CSV-bro (kun sikre rækker).
4. **Løbende:** nye fooddata-produkter → kø → manuel ingrediens; nye imports må **ikke** kræve at I matcher alt igen.

Når FF er klar: **stop Goma sync** for de fire kæder, migrér Planomo-matches til **fooddata** (§10), brug samme nøgler og kø.

---

## 2. Datamodel (FF skal spejle)

### `product_ingredient_matches`

| Kolonne | Betydning |
|---------|-----------|
| `ingredient_id` | UUID — **samme** som Planomo `ingredients.id` |
| `product_external_id` | **`products.id`** (fooddata), ikke `store_product_id` alene |
| `match_type` | `manual` for kuraterede |
| `confidence` | 100 for manuelle |
| `is_manual` | `true` |

### `product_ingredient_match_queue`

| Kolonne | Betydning |
|---------|-----------|
| `product_id` | `products.id` (fooddata-nøgle) |
| `store_product_id` | Legacy-kolonne; sæt **samme** som `product_id` for fooddata |
| `store_id` | fx `bilka` |
| `product_name_snapshot` | Visningsnavn ved enqueue |
| `status` | `pending` \| `matched` \| `dismissed` |
| `queued_at` / `resolved_at` | Tidsstempler |

**Unikhed:** max én `pending` per `product_id` (partial unique index i Planomo).

---

## 3. To workflows (begge skal virke i FF)

### A) Ingrediens → produkter (primær for ~600 ingredienser)

Bruger vælger **agurk**, søger `agurk` / `agu`, vælger alle agurk-varianter fra Bilka, Netto, Føtex, REMA.

**Krav til søg:**

- Min. 2 tegn; danske tegn + ascii (`æ`/`ae`)
- Søg i `product_offers.name_store` + `products.name_generic`, `brand`, `category`
- Filtrér til fooddata-kæder (ikke kun de 4 med fuld sync) — se `FOODDATA_STORE_IDS` i Planomo
- Returnér op til **500** hits, sorteret efter relevans
- `product_external_id` ved gem = **`product_id`**

Planomo: `GET /api/admin/products-for-matching?search=agu&ingredient_id=...&limit=500`

### B) Produkt → ingrediens (kø for nye varer)

Efter fooddata-sync/import: varer **uden** match → `product_ingredient_match_queue`.

Admin vælger ingrediens per række → opretter match → `status=matched`.

Planomo: pagineret side, 50 pr. side — `GET /api/admin/product-match-queue?page=1&limit=50`

---

## 4. FF: enqueue efter sync/import

Kopiér logik fra Planomo `enqueueUnmatchedFooddataProducts()`:

```
For hvert product_id med tilgængeligt tilbud i fooddata-butikker:
  Hvis product_id NOT IN product_ingredient_matches.product_external_id
  Og product_id NOT IN queue (pending)
  → INSERT product_ingredient_match_queue
```

**Triggers:**

| Hændelse | Handling |
|----------|----------|
| Nyt `products.id` i import | Enqueue det id (eller batch efter import) |
| `--enqueue-unmatched` / backfill | Enqueue alle umatchede fooddata-produkter én gang |
| Match oprettet | Opdater kø til `matched` + `resolved_at` |
| Afvis vare | `status=dismissed` |

Planomo scripts:

```bash
# Efter import (automatisk for nye product_id)
npx tsx scripts/import-fooddata-to-planomo.ts

# Første gang / efter skift fra Goma — fyld kø med alle umatchede
npx tsx scripts/backfill-fooddata-match-queue.ts

# Dry-run
npx tsx scripts/backfill-fooddata-match-queue.ts --dry-run
```

Import-flag:

- `--skip-queue` — ingen kø
- `--enqueue-unmatched` — vurder **alle** umatchede (ikke kun nye ids)

---

## 5. FF admin UI (anbefaling)

Spejl Planomo:

| Side | URL (Planomo) | Funktion |
|------|----------------|----------|
| Ingrediens-matching | `/admin/product-ingredient-matching` | Liste ingredienser, søg produkter, multi-select |
| Fooddata-kø | `/admin/product-ingredient-matching/nye-varer` | Pagineret tabel, **ikke** på hovedsiden |

**Vigtigt:** Fjern enhver “Kø: nye varer fra Goma” — kun fooddata.

---

## 6. Migration Planomo → FF (efter I matcher)

**Aftale:** Matches leveres til **fooddata (grocery Supabase, `GROCERY_SUPABASE_URL`)** — ikke FF main DB.  
Planomo ejer **katalog-import** (read-only fra fooddata). Planomo må **skrive matches** til fooddata (kun disse tabeller — ikke `products` / `product_offers`).

Rækkefølge:

1. **Planomo:** Færdiggør manuel matching (`product_external_id` = `bilka-…` osv.).
2. **FF:** Opret tabeller i fooddata (§10.2) hvis de ikke findes.
3. **Planomo → fooddata:** Engangs-export + upsert (§10.3) — script `sync-matches-to-fooddata.ts` (planlagt) eller CSV.
4. **FF:** Læs matches fra fooddata til madbudget (`shopping-list-prices`); stop at vedligeholde parallel match-liste i main DB for de fire kæder.
5. **FF:** Slå Goma product sync fra for Bilka/Netto/Føtex/REMA; kun fooddata pipeline + kø.
6. **Planomo:** Fortsæt `import-fooddata-to-planomo.ts` (produkter/tilbud). Valgfrit: importér matches **fra** fooddata til Planomo-cache (§10.5).

Valgfri engangs-bro for **gamle** Goma-ID’er: se [FF_HANDOFF_GOMA_FOODDATA_MAPPING.md](./FF_HANDOFF_GOMA_FOODDATA_MAPPING.md).

**Legacy export (kun fire kæder — brug §10.3 i stedet):**

```sql
SELECT ingredient_id, product_external_id, confidence, match_type, is_manual
FROM product_ingredient_matches
WHERE product_external_id ~ '^(bilka|netto|foetex|rema-1000)-';
```

---

## 7. Tjekliste for FF Composer

- [ ] `product_external_id` = `products.id` overalt (API, UI, export)
- [ ] Efter hver fooddata sync: `enqueueUnmatchedFooddataProducts` (eller tilsvarende)
- [ ] Admin: ingrediens-søgning med høj limit + alle 4 butikker
- [ ] Admin: separat pagineret kø-side (50/100 pr. side)
- [ ] Match-endpoint bruger `product_id` fra kø-rækken, ikke legacy `store_product_id` alene
- [ ] Goma sync og “Goma kø” fjernet fra UI og jobs
- [ ] Dokumentér import-kommandoer i FF README (som Planomo scripts ovenfor)

---

## 8. Oprydning: Unknown Product (Planomo)

Når I har (eller vil) droppe Goma-links, fjern matches der ikke resolver mod `products.id`:

```bash
# Tæl + backup CSV (ingen sletning)
npx tsx scripts/delete-unresolved-product-matches.ts

# Slet efter gennemgang af backup
npx tsx scripts/delete-unresolved-product-matches.ts --execute
```

Samme opløsningslogik som admin (`/api/admin/existing-matches`). Backup ligger i `.taskmaster/docs/backups/`.

---

## 9. Spørgsmål / svar

**Skal vi matche Nemlig/python i FF?**  
`python-*` matches: nej (død). **Nemlig/meny/kvickly osv.:** ja, hvis der findes `product_offers` i fooddata (ofte kun tilbudsvarer, ikke fuldt katalog). Planomo importerer alle kæder fra fooddata; søgning filtrerer ikke væk “kun tilbud”-kæder.

**Hvad er forskellen på fuld sync vs kun tilbud?**  
| Type | Kæder (typisk) | Data |
|------|----------------|------|
| Fuld sync | Bilka, Netto, Føtex, REMA | Hele kataloget + priser/tilbud via Algolia/REMA API |
| Kun tilbud / legacy | MENY, Kvickly, Spar, Lidl, … | Ofte kun varer der er på tilbud (Goma eller planlagt Tjek/eTilbudsavis) — færre rækker, men gyldige til match |

**Hvad hvis samme vare findes i Bilka og Netto?**  
To `product_id` (fx `bilka-X` og `netto-Y`). Begge kan matches til samme ingrediens (fx agurk) — to rækker i `product_ingredient_matches`.

**Gætter vi automatisk ingrediens?**  
Nej. Automatisk mapping Goma→fooddata blev fravalgt som usikkert. Kø + manuel kuratering er source of truth.

---

## 10. Leverance til FF efter matching (komplet pakke)

Brug denne sektion når Planomo-matching er **færdig** — send til FF Cursor som supplement til §6–7.

### 10.1 Hvad du sender til FF

| # | Leverance | Format |
|---|-----------|--------|
| 1 | Dette dokument | `docs/FF_HANDOFF_FOODDATA_INGREDIENT_MATCHING.md` |
| 2 | Tilbud/katalog (kun hvis de spørger) | `docs/FF_HANDOFF_TILBUD_BILKA_NETTO_REMA.md` + `docs/FF_QUESTIONNAIRE_TILBUD.md` |
| 3 | Madbudget API-kontrakt | `docs/FF_HANDOFF_MADBUDGET_WIZARD.md` (priser kræver matches) |
| 4 | **Match-export** | CSV eller direkte upsert til fooddata (§10.3) |
| 5 | **Kø-export** (valgfri) | Kun `pending` / `dismissed` hvis FF skal overtage kø-arbejde |
| 6 | **Ingrediens-UUID’er** | Bekræft at FF `ingredients.id` = Planomo `ingredients.id` (samme master) |

**Send ikke** `FF_HANDOFF_GOMA_FOODDATA_MAPPING.md` medmindre I stadig har umatchede Goma-ID’er.

**One-liner til FF:**

> Planomo har færdigmatchet ingredienser mod fooddata-nøgler (`{chain}-{source_id}`). Upsert `product_ingredient_matches` (+ evt. kø) i **grocery Supabase**. I læser derfra til madbudget; Planomo skriver ikke til `products`/`product_offers`. Goma på main DB er legacy.

---

### 10.2 Fooddata: tabeller FF skal oprette

Kør i **grocery Supabase** (`GROCERY_SUPABASE_URL`). Produkt-nøgle er **tekst** `source_chain || '-' || source_id` — samme som Planomo `products.id`, **ikke** fooddata `products.id` (UUID).

```sql
-- Matches (source of truth efter leverance)
CREATE TABLE IF NOT EXISTS public.product_ingredient_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL,
  product_external_id text NOT NULL,
  confidence integer DEFAULT 100,
  is_manual boolean DEFAULT true,
  match_type text DEFAULT 'manual',
  source text DEFAULT 'planomo',
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (product_external_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_pim_ingredient
  ON public.product_ingredient_matches (ingredient_id);
CREATE INDEX IF NOT EXISTS idx_pim_product
  ON public.product_ingredient_matches (product_external_id);

COMMENT ON TABLE public.product_ingredient_matches IS
  'Ingrediens↔produkt. product_external_id = source_chain-source_id (Planomo/FF canonical).';

-- Kø (nye fooddata-varer uden match)
CREATE TABLE IF NOT EXISTS public.product_ingredient_match_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  store_product_id text NOT NULL,
  store_id text NOT NULL,
  product_name_snapshot text,
  queued_at timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'matched', 'dismissed')),
  resolved_at timestamptz,
  source text DEFAULT 'fooddata-sync'
);

CREATE UNIQUE INDEX IF NOT EXISTS product_ingredient_match_queue_one_pending_per_product
  ON public.product_ingredient_match_queue (product_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS product_ingredient_match_queue_pending_queued
  ON public.product_ingredient_match_queue (queued_at DESC)
  WHERE status = 'pending';
```

**Join mod fooddata-katalog:**

```sql
SELECT m.*, p.name AS product_name, p.source_chain, p.source_id
FROM product_ingredient_matches m
JOIN products p
  ON p.source_chain || '-' || p.source_id = m.product_external_id
WHERE p.active = true;
```

---

### 10.3 Planomo: export-SQL (send til FF / CSV)

**Kun rækker der resolver mod Planomo `products.id`** (anbefalet — alle kæder):

```sql
SELECT
  m.ingredient_id::uuid,
  m.product_external_id,
  m.confidence,
  m.match_type,
  m.is_manual,
  m.created_at,
  m.updated_at
FROM product_ingredient_matches m
INNER JOIN products p ON p.id = m.product_external_id
ORDER BY m.ingredient_id, m.product_external_id;
```

**Statistik før export:**

```sql
SELECT
  COUNT(*) AS total_matches,
  COUNT(DISTINCT ingredient_id) AS ingredients_with_match,
  COUNT(DISTINCT product_external_id) AS products_matched,
  COUNT(*) FILTER (WHERE NOT EXISTS (
    SELECT 1 FROM products p WHERE p.id = m.product_external_id
  )) AS orphan_matches
FROM product_ingredient_matches m;
```

`orphan_matches` skal være **0** før leverance (ellers kør §8 oprydning).

**Kø (valgfri export):**

```sql
SELECT product_id, store_product_id, store_id, product_name_snapshot,
       queued_at, status, resolved_at
FROM product_ingredient_match_queue
WHERE status IN ('pending', 'dismissed');
```

---

### 10.4 FF: upsert efter modtagelse

```sql
INSERT INTO product_ingredient_matches (
  ingredient_id, product_external_id, confidence, match_type, is_manual, source, synced_at
)
VALUES
  -- ... fra Planomo export
ON CONFLICT (product_external_id, ingredient_id) DO UPDATE SET
  confidence = EXCLUDED.confidence,
  match_type = EXCLUDED.match_type,
  is_manual = EXCLUDED.is_manual,
  source = EXCLUDED.source,
  synced_at = now(),
  updated_at = now();
```

**Verifikation i fooddata:**

```sql
SELECT COUNT(*) AS matches,
  COUNT(DISTINCT ingredient_id) AS ingredients,
  COUNT(DISTINCT product_external_id) AS products
FROM product_ingredient_matches;

SELECT COUNT(*) AS matches_join_products
FROM product_ingredient_matches m
JOIN products p ON p.source_chain || '-' || p.source_id = m.product_external_id;
```

`matches` og `matches_join_products` skal være tæt på hinanden (alle produkt-nøgler findes i katalog).

---

### 10.5 Løbende sync (efter engangs-leverance)

| Fase | Hvem | Handling |
|------|------|----------|
| **Nu** | Planomo admin | Matcher i Planomo DB |
| **Engangs** | Planomo | `sync-matches-to-fooddata.ts` (planlagt) eller CSV → fooddata upsert |
| **Fremtid A** | Planomo | Ved gem i admin → upsert til fooddata + lokal DB |
| **Fremtid B** | Planomo import | Hent `product_ingredient_matches` fra fooddata ved `import-fooddata-to-planomo.ts` |
| **FF** | Efter product sync | `enqueueUnmatchedFooddataProducts` → kø i **fooddata** |

Planomo skriver **kun** til match-tabeller i fooddata — aldrig til `products` / `product_offers` (se [FF_HANDOFF_TILBUD_BILKA_NETTO_REMA.md](./FF_HANDOFF_TILBUD_BILKA_NETTO_REMA.md)).

---

### 10.6 FF acceptkriterier (efter Planomo-leverance)

- [ ] `product_ingredient_matches` i fooddata med samme antal ±0 som Planomo-export
- [ ] 100 % af `product_external_id` joiner `products` via `source_chain-source_id`
- [ ] `ingredient_id` findes i FF/Planomo `ingredients` (samme UUID)
- [ ] Madbudget `shopping-list-prices` læser fra fooddata matches + `product_offers`
- [ ] Goma match-tabel på main DB **ikke** bruges til Bilka/Netto/Føtex/REMA-priser
- [ ] Efter næste product-sync: enqueue kører mod fooddata-match-tabel

---

### 10.7 Planomo-scripts (reference)

| Script | Formål |
|--------|--------|
| `scripts/import-fooddata-to-planomo.ts` | Produkter/tilbud fooddata → Planomo |
| `scripts/backfill-fooddata-match-queue.ts` | Kø i Planomo |
| `scripts/delete-unresolved-product-matches.ts` | Oprydning før export |
| `scripts/sync-matches-to-fooddata.ts` | **Planlagt** — engangs/løbende push matches → fooddata |

---

## 11. Sticky katalog vs. tilbud (jun 2026) — FF fooddata + Planomo matches

**Problem:** Tilbudskatalog-varer (Tjek, leaflet-only) forsvinder mellem uger. Planomo-match må **ikke** tvinges til gen-matching. `/dagligvarer` skal stadig kun vise **aktuelle** tilbud.

### Ansvar

| Data | Ejer | Regel |
|------|------|--------|
| `products` / `product_offers` i **fooddata** | **FF** | Katalog-persistens; tilbud må “sove” |
| `product_ingredient_matches` | **Planomo** | Matches slettes ikke af import; snapshots på match-række |
| `/dagligvarer` UI | **Planomo** | Uændret: `is_available` + tilbudsfilter — **påvirkes ikke** |

### FF skal i fooddata

1. **`products.active`**
   - `true` når varen har haft navn + pris i API (fast sortiment + tilbudsvarer der vender tilbage).
   - `false` kun ved ægte udgang (404, ingen pris) — ikke pga. `is_available_in_all_stores` alene (se [FF_HANDOFF_TILBUD_BILKA_NETTO_REMA.md](./FF_HANDOFF_TILBUD_BILKA_NETTO_REMA.md) §10).

2. **`product_offers` ved udløbet tilbud**
   - **Slet ikke** produkt-rækken fordi tilbuddet er slut.
   - Sæt `in_stock = false` (Planomo → `is_available = false` ved import).
   - Behold `price_cents` / sidste kendte pris som reference (valgfrit `offer_until` i fortid).

3. **Nye tilbuds-uger**
   - **Samme** `source_chain` + `source_id` når det er samme vare (undgå nyt UUID hver uge).
   - Hvis kæden skifter id: dokumentér i `raw_data` (evt. `previous_source_id`) — Planomo kan senere alias'e; indtil da manuel match.

4. **Import til Planomo læser ikke tilbage**
   - Planomo `import-fooddata-to-planomo.ts` henter **ekstra** inaktive `products` for ids der allerede står i `product_ingredient_matches` (sticky katalog).
   - Import **sletter ikke** `product_offers` der mangler i dagens fooddata-feed (upsert-only) — gamle tilbud-rækker i Planomo kan blive liggende med `is_available=false` (skjult i dagligvarer, fine til matching).

5. **Verifikation FF (SQL)**

```sql
-- Produkter med match i Planomo bør stadig findes i fooddata ( også inactive )
SELECT COUNT(*) FROM products p
WHERE p.source_chain = 'rema-1000' AND p.source_id = '306872' AND p.active = true;

-- Tilbud sover, ikke forsvinder
SELECT p.name, o.in_stock, o.price_cents
FROM products p
JOIN product_offers o ON o.product_id = p.id AND o.store_id = 'rema-1000'
WHERE p.source_chain = 'rema-1000' AND p.source_id = '306872';
```

### Planomo (implementeret i repo — skal køres i drift)

| # | Hvem | Handling |
|---|------|----------|
| 1 | Planomo | Kør migration `20260603120000_match_product_snapshots.sql` i **Planomo** Supabase |
| 2 | FF | Fooddata sync kører (natlig cron / manuel) med §10+§11 politik |
| 3 | Planomo | `npx tsx scripts/import-fooddata-to-planomo.ts` (efter FF-sync) |
| 4 | Planomo | `npx tsx scripts/backfill-match-snapshots.ts --execute` (engangs) |
| 5 | Planomo | Deploy app med sticky-match kode (allerede i repo) |
| 6 | Planomo | Opryd ~54 legacy Goma-id’er (`101830` osv.) — separat spor, se [FF_HANDOFF_GOMA_FOODDATA_MAPPING.md](./FF_HANDOFF_GOMA_FOODDATA_MAPPING.md) |
| 7 | Planomo (valgfri) | Automatiser import efter FF-sync (cron/GitHub — findes ikke i repo endnu) |

Kode: `src/lib/product-match-snapshots.ts`, `scripts/backfill-match-snapshots.ts`, `scripts/audit-sticky-matches.ts`.

- **Ingen** ændring i `/dagligvarer` filtre.
- Nye matches får snapshot automatisk ved gem.

---

*Sidst opdateret: jun 2026 — Planomo sticky matches + FF §11.*
