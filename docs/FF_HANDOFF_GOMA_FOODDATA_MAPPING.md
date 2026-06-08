# Handoff til FunctionalFoods: Goma → fooddata produkt-mapping

**Status (maj 2026):** FF Composer vurderede at **automatisk Goma↔fooddata-mapping ikke kan laves sikkert** på tværs af hele kataloget. Planomo går videre med **manuel gen-match** mod fooddata-kataloget (se nedenfor).

**Løbende matching + kø (fooddata, ikke Goma):** se [FF_HANDOFF_FOODDATA_INGREDIENT_MATCHING.md](./FF_HANDOFF_FOODDATA_INGREDIENT_MATCHING.md).

**Målgruppe:** FF Cursor (Composer 2.5) — valgfri, hvis I senere får en **entydig** bridge for enkelte kæder  
**Formål:** Planomo har ~7.500 `product_ingredient_matches` fra **Goma-æraen**. `product_external_id` (fx `bilka-110606`, `nemlig-5070553`, `python-101632`) matcher ofte **ikke** fooddata/Planomo-kataloget → UI viser "Unknown Product".

Planomo kan stadig anvende `scripts/apply-ff-product-mapping.ts` hvis I **alligevel** leverer en CSV med kun `same_id`/`ean`/`explicit_link` + `active` rækker.

---

## TL;DR

| Hvem | Opgave |
|------|--------|
| **FF** | Generér CSV: for hver Goma-ID der bruges i matches → fooddata `source_chain` + `source_id` (eller `none`) |
| **Planomo** | Kør `npx tsx scripts/apply-ff-product-mapping.ts --input=ff-goma-fooddata-mapping.csv` |

**Planomo produkt-nøgle (mål):** `{source_chain}-{source_id}` (fx `bilka-110606`, `netto-89221500340-EA`).

---

## Baggrund (Planomo-analyse)

| `product_external_id`-format | Ca. matches | Kan mappes via fooddata? |
|------------------------------|-------------|---------------------------|
| `chain-id` (Goma, fx `bilka-110606`) | ~5.800 | **Ja**, når I finder samme vare i fooddata |
| `nemlig-*` | ~1.700 | Kun hvis I har Nemlig i fooddata |
| `python-*` | ~900 | **Nej** (død scraper) |
| `meny-*` / andre | ~1.100+ | Afhænger af katalog |

Kun ~**1.700** resolver allerede i Planomo uden bro. Resten kræver **jeres** mapping eller `status=none`.

**Vigtigt:** Nogle Goma-ID’er **er** allerede fooddata `source_id` (fx `bilka-110606` → fooddata `source_id=110606`). Andre (fx `bilka-104327`) findes **ikke** i fooddata — marker `discontinued` eller `goma_only`, ikke gæt.

---

## Output: CSV-fil til Planomo

Lever fil: `ff-goma-fooddata-mapping.csv` (UTF-8, header-række, komma-separeret).

### Obligatoriske kolonner

| Kolonne | Beskrivelse | Eksempel |
|---------|-------------|----------|
| `goma_id` | Nuværende `product_external_id` i matches (Goma-nøgle) | `bilka-110606` |
| `planomo_product_id` | Mål-id i Planomo = `{source_chain}-{source_id}` | `bilka-110606` |
| `source_chain` | fooddata `products.source_chain` | `bilka` |
| `source_id` | fooddata `products.source_id` | `110606` |
| `match_method` | Hvordan I fandt koblingen (se nedenfor) | `same_id` |
| `status` | Om varen kan bruges i Planomo nu | `active` |

### Anbefalede ekstra kolonner (debug + manuel review)

| Kolonne | Beskrivelse |
|---------|-------------|
| `name_goma` | Produktnavn i Goma/FF Main |
| `name_fooddata` | Navn i fooddata `products.name` |
| `ean` | GTIN/EAN hvis kendt |
| `store` | Butik/kæde (human-readable) |
| `notes` | Fx "discontinued", "2 candidates" |

### `match_method` — tilladte værdier

| Værdi | Betydning | Planomo auto-apply? |
|-------|-----------|---------------------|
| `same_id` | `goma_id` = `{chain}-{source_id}` og produkt findes aktivt i fooddata | **Ja** |
| `ean` | Samme EAN/GTIN i Goma og fooddata (entydigt) | **Ja** |
| `explicit_link` | Jeres interne link (metadata, bridge-tabel, manuel kuratering) | **Ja** |
| `name_store` | Kun navn+butik match (entydigt) — angiv i `notes` | **Nej** (review) |
| `ambiguous` | Flere fooddata-kandidater | **Nej** |
| `none` | Intet sikkert fooddata-hit | **Nej** |

### `status` — tilladte værdier

| Værdi | Betydning | Planomo auto-apply? |
|-------|-----------|---------------------|
| `active` | Produkt findes i fooddata (`active=true`) og må bruges | **Ja** (med passende `match_method`) |
| `discontinued` | Kendt i Goma, ikke aktiv/i fooddata længere | **Nej** |
| `goma_only` | Kun i Goma (fx Nemlig uden fooddata-række) | **Nej** |
| `conflict` | Modstridende data — kræver manuel fix | **Nej** |

**Planomo script opdaterer KUN rækker med:**  
`match_method` ∈ `{same_id, ean, explicit_link}` **og** `status` = `active` **og** `planomo_product_id` findes i Planomo `products`.

---

## FF: foreslået fremgangsmåde

### 1. Input: alle unikke `product_external_id` fra matches

```sql
-- FF Main eller Planomo (samme ingredient_id ift. jeres setup)
SELECT DISTINCT product_external_id
FROM product_ingredient_matches
WHERE product_external_id IS NOT NULL
ORDER BY 1;
```

Ca. **5.500–5.600** unikke id’er (Planomo har ~7.500 match-rækker).

### 2. For hvert `goma_id`, find fooddata-produkt

Prioritet (samme som Planomo accepterer som sikkert):

1. **same_id** — parse `goma_id` som `{chain}-{rest}`:
   ```sql
   SELECT source_chain, source_id, name, gtin, active
   FROM products  -- fooddata/grocery products table
   WHERE source_chain = :chain AND source_id = :rest;
   ```
   Hvis `active` og findes → `planomo_product_id = chain || '-' || source_id`.

2. **ean** — hvis Goma-række har EAN og præcis én fooddata-række med samme `gtin`:
   ```sql
   SELECT source_chain, source_id, name, gtin
   FROM products
   WHERE gtin = :ean AND active = true;
   ```
   Kun hvis **count = 1**.

3. **explicit_link** — hvis I har `metadata.goma_store_product_id`, bridge-tabel, eller Goma `product_id` → fooddata UUID map.

4. Ellers `match_method=none` + passende `status` (`goma_only`, `discontinued`, `ambiguous`).

### 3. Nemlig / Meny / python

| Prefix | Anbefaling |
|--------|------------|
| `python-*` | `status=goma_only`, `match_method=none` (alle) |
| `nemlig-*` | Map kun hvis I har tilsvarende række i fooddata; ellers `goma_only` |
| `meny-*` | Samme |

### 4. Validering før leverance

```sql
-- Ingen duplikerede goma_id i CSV
-- planomo_product_id skal matche source_chain-source_id
-- active rows: produkt findes i fooddata
SELECT COUNT(*) FROM products p
WHERE p.source_chain || '-' || p.source_id = :planomo_product_id AND p.active;
```

Lever også en kort **summary.txt**:

```
total_goma_ids: 5567
auto_apply (same_id|ean|explicit_link + active): 2100
review (name_store|ambiguous): 150
goma_only: 900
discontinued: 1200
nemlig_unmapped: 1200
...
```

---

## Eksempel-CSV

```csv
goma_id,planomo_product_id,source_chain,source_id,match_method,status,name_goma,name_fooddata,ean,store,notes
bilka-110606,bilka-110606,bilka,110606,same_id,active,Syltede agurker,Syltede agurker,5701018012737,Bilka,
bilka-104327,,bilka,,none,discontinued,Some old product,,,Bilka,not in fooddata catalog
python-101632,,,,none,goma_only,REMA scraper item,,,REMA,dead python-* id
nemlig-5070553,,,,none,goma_only,Nemlig item,,,Nemlig,no fooddata row
bilka-41286,bilka-41286,bilka,41286,ean,active,Agurk 3stk,Agurk,5711044475956,Bilka,matched via gtin from goma export
```

---

## Planomo: anvend mapping

```bash
# Dry-run (rapport only)
npx tsx scripts/apply-ff-product-mapping.ts \
  --input=.taskmaster/docs/ff-goma-fooddata-mapping.csv \
  --dry-run

# Apply auto-safe rows
npx tsx scripts/apply-ff-product-mapping.ts \
  --input=ff-goma-fooddata-mapping.csv

# Kun én match_method (test)
npx tsx scripts/apply-ff-product-mapping.ts \
  --input=ff-goma-fooddata-mapping.csv \
  --only-method=same_id,ean
```

Efter apply:

```bash
npx tsx scripts/verify-fooddata-import.ts
```

Tjek "match resolution rate" — forvent stor stigning for Bilka/Netto/REMA.

---

## Acceptkriterier (FF færdig når)

- [ ] CSV med alle unikke `goma_id` fra `product_ingredient_matches` (FF eller eksporteret fra Planomo)
- [ ] Kolonner som specifikation ovenfor
- [ ] `python-*` markeret `goma_only` / `none`
- [ ] Ingen `active` + `same_id` uden at produktet findes i fooddata
- [ ] Summary med antal per `match_method` / `status`
- [ ] Fil leveret til Planomo (shared drive / repo / Slack)

---

## Relateret

- [FOODDATA_IMPORT_ANSWERS.md](../FOODDATA_IMPORT_ANSWERS.md) — produkt-id format, match-statistik
- [FF_HANDOFF_TILBUD_BILKA_NETTO_REMA.md](./FF_HANDOFF_TILBUD_BILKA_NETTO_REMA.md) — tilbud/priser i fooddata (separat spor)

---

## Copy-paste prompt til FF Composer

```markdown
Generér ff-goma-fooddata-mapping.csv til Planomo.

For hver DISTINCT product_external_id i product_ingredient_matches:
1. Find tilsvarende fooddata product (source_chain, source_id, active).
2. Udfyld CSV med kolonner: goma_id, planomo_product_id, source_chain, source_id, match_method, status, name_goma, name_fooddata, ean, store, notes.
3. match_method: same_id | ean | explicit_link | name_store | ambiguous | none
4. status: active | discontinued | goma_only | conflict
5. planomo_product_id = source_chain + '-' + source_id når active.
6. python-* → goma_only/none. Nemlig/meny kun hvis fooddata har række.
7. Kun marker same_id/eans/explicit_link+active når I er sikre (entydigt).
8. Lever summary.txt med counts.

Spec: docs/FF_HANDOFF_GOMA_FOODDATA_MAPPING.md i Planomo-repo (eller vedhæftet).
```
