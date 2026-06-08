# FF Master Handoff — Jun 2026

> **Leverance til FF:** Start her. Giv FF hele `docs/`-mappen med handoff-filerne, eller minimum denne fil + [FF_HANDOFF_CURATION_WORKFLOW.md](./FF_HANDOFF_CURATION_WORKFLOW.md).

**Målgruppe:** FunctionalFoods (FF) Cursor  
**Formål:** Sunset Goma. Fooddata hele vejen rundt. Indhent Planomos funktioner (matching, tagging, madbudget) fra jun 2026.  
**Planomo reference-repo:** `planomo` — kopiér mønstre derfra; links nedenfor.

---

## LEVERANCE — læs dette først (FF)

### Hvad Planomo allerede har lagt i fooddata

| Data | Status |
|------|--------|
| Schema 001 + 002 + 003 | Kørt i grocery Supabase |
| `product_ingredient_matches` | **11.540** rækker (`source=planomo`) — klar til FF pull |
| `ingredient_dietary_tags` | **148** ingredienser med fravalg-tags |
| `product_organic_tags` | **2.984** varer med øko-tags |
| `product_ingredient_match_queue` | **0 pending** — historisk backlog slettet; frisk start |
| Core-ingrediens-id'er | Planomo = FF (verify grøn) |

### Fælles kataloger (efter Goma sunset)

| Katalog | Fælles? | Hvor |
|---------|---------|------|
| **Produkter + tilbud** | **Ja** | fooddata — **I scraper**, begge læser |
| **Ingredienser** | **Nej** | Lokal per app |
| **Matches + tags** | **Ja (kurering)** | fooddata — begge skriver, begge puller |

**Goma er ude.** Ingen nye features mod Goma-id'er. Produktnøgle = `{chain}-{source_id}` (fx `bilka-110606`).

### Kø-regler fra nu

- **Én fælles kø** i fooddata — ikke separate Goma/Planomo-lister
- Kun **nye mad-varer** enqueuees efter katalog-sync
- **Non-food aldrig** i køen (shampoo, pleje osv.)
- **FF onsdag** · **Planomo torsdag** — pull + arbejd kø + push

### FF: første 5 skridt

1. Læs [FF_HANDOFF_CURATION_WORKFLOW.md](./FF_HANDOFF_CURATION_WORKFLOW.md) (15 min)
2. Verificér schema + pull Planomos data: `npm run fooddata:verify-uuid` → `npm run fooddata:pull-curation`
3. Byg `src/lib/fooddata-publish/` (`source='ff'`) + `src/lib/fooddata-import/curation-pull.ts`
4. Madbudget: læs matches fra fooddata (ikke Goma)
5. Ugentlig: `npm run fooddata:weekly-curation -- --app=ff` hver **onsdag**

### Læserækkefølge

| # | Dokument | Hvornår |
|---|----------|---------|
| 1 | **[FF_HANDOFF_CURATION_WORKFLOW.md](./FF_HANDOFF_CURATION_WORKFLOW.md)** | Først — kø, sync, delt vs. lokalt |
| 2 | **[FF_HANDOFF_MASTER.md](./FF_HANDOFF_MASTER.md)** | Funktionskatalog til godkendelse (denne fil) |
| 3 | [FF_HANDOFF_FOODDATA_SYNC.md](./FF_HANDOFF_FOODDATA_SYNC.md) | Push/pull, merge-regler, SQL |
| 4 | [FF_HANDOFF_FOODDATA_INGREDIENT_MATCHING.md](./FF_HANDOFF_FOODDATA_INGREDIENT_MATCHING.md) | Admin matching, sticky katalog |
| 5 | [FF_HANDOFF_TILBUD_BILKA_NETTO_REMA.md](./FF_HANDOFF_TILBUD_BILKA_NETTO_REMA.md) | Salling/REMA pris-fixes (I ejer sync) |
| 6 | [FF_HANDOFF_MADBUDGET_WIZARD.md](./FF_HANDOFF_MADBUDGET_WIZARD.md) | Madbudget UX (senere) |
| 7 | [FF_HANDOFF_GOMA_FOODDATA_MAPPING.md](./FF_HANDOFF_GOMA_FOODDATA_MAPPING.md) | Kun hvis legacy Goma-matches skal migreres |

### Planomo-kode FF skal spejle (copy-paste start)

```
src/lib/fooddata-publish/
src/lib/fooddata-import/curation-pull.ts
src/lib/fooddata-curation/
src/lib/product-match-queue.ts
src/lib/product-food-classification.ts
src/lib/dietary-exclusions/
src/lib/madbudget/organic-preference.ts
src/components/admin/IngredientTagEditor.tsx
scripts/fooddata-weekly-curation.ts
scripts/sync-planomo-to-fooddata.ts          → sync-ff-to-fooddata.ts
scripts/sync-fooddata-curation-to-planomo.ts → sync-fooddata-curation-to-ff.ts
scripts/oko-scan-products.ts
scripts/fooddata-schema/001_*.sql + 002 + 003
```

---

**Under-dokumenter (detaljer):**

| Dokument | Emne |
|----------|------|
| **[FF_HANDOFF_CURATION_WORKFLOW.md](./FF_HANDOFF_CURATION_WORKFLOW.md)** | **Én fælles kø, ugentlig sync, delt vs. lokalt — LÆS FØRST** |
| [FF_HANDOFF_FOODDATA_SYNC.md](./FF_HANDOFF_FOODDATA_SYNC.md) | Fælles kurering — push/pull, merge-regler |
| [FF_HANDOFF_FOODDATA_INGREDIENT_MATCHING.md](./FF_HANDOFF_FOODDATA_INGREDIENT_MATCHING.md) | Match-workflows, kø, sticky katalog |
| [FF_HANDOFF_TILBUD_BILKA_NETTO_REMA.md](./FF_HANDOFF_TILBUD_BILKA_NETTO_REMA.md) | Salling/REMA pris-fixes |
| [FF_HANDOFF_GOMA_FOODDATA_MAPPING.md](./FF_HANDOFF_GOMA_FOODDATA_MAPPING.md) | Legacy Goma→fooddata (kun engangs) |
| [FF_HANDOFF_MADBUDGET_WIZARD.md](./FF_HANDOFF_MADBUDGET_WIZARD.md) | Madbudget UX, gæstedemo, wizard |

---

## 0. Status lige nu (efter Planomo merge, jun 2026)

Planomo har **pushed til fooddata** (grocery Supabase):

| Data i fooddata | Antal | Kilde |
|-----------------|-------|-------|
| `product_ingredient_matches` | **11.540** | Planomo (`source=planomo`) |
| `ingredient_dietary_tags` | **148** | Planomo |
| `product_organic_tags` | **2.984** | Planomo |
| `product_ingredient_match_queue` (pending) | **0** (backlog slettet jun 2026) | Fælles — kun nye mad-varer fremover |
| `products` + `product_offers` | FF ejer | FF scrape/sync |

**Core-ingredienser:** Planomo og FF bruger **samme `ingredient_id`-strings** for agurk, mælk, løg osv. (verificeret med `npm run fooddata:verify-uuid`).

**FF har endnu ikke:** pull af Planomos kurering, push af eget arbejde, tagging-admin, fooddata-baseret madbudget-priser.

---

## 1. Produktvision (hvad I bygger mod)

```
┌─────────────────────────────────────────────────────────────┐
│  FOODDATA (grocery Supabase) — fælles sandhed               │
│  • products + product_offers     ← FF scraper                │
│  • product_ingredient_matches    ← begge apps kuraterer      │
│  • ingredient_dietary_tags       ← begge apps                │
│  • product_organic_tags          ← begge apps                │
│  • product_ingredient_match_queue← begge apps                │
└──────────────▲──────────────────────────▲───────────────────┘
               │ push/pull                 │ push/pull
        ┌──────┴──────┐            ┌──────┴──────┐
        │  Planomo    │            │     FF      │
        │  (admin +   │            │  (admin +   │
        │  madbudget) │            │  madbudget) │
        └─────────────┘            └─────────────┘
               ✗ Goma main DB — SUNSET
```

**Tre regler:**

1. **Goma er ude** — ingen nye features mod Goma-produkt-id'er.
2. **Fooddata er fælles lager** for **produktkatalog**, tilbud, matches og tags.
3. **Ingrediens-kataloger forbliver lokale** — matches deles når id'er overlapper.

### Fælles vs. lokalt (kataloger)

| Katalog | Delt? | Efter Goma sunset |
|---------|-------|-------------------|
| **Produkter + tilbud** (`products`, `product_offers`) | **Ja** | fooddata — FF scraper, begge importerer/læser |
| **Ingredienser** (`ingredients`) | **Nej** | Lokal per app — opskrifter er forskellige |
| **Matches + tags** | **Delvist** | fooddata — begge bidrager; pull filtrerer lokalt |

---

## 2. Goma sunset — hvad det betyder konkret

### STOP (fra nu)

| # | Stop |
|---|------|
| G1 | Læs **ikke** `product_ingredient_matches` fra Goma/main DB til madbudget |
| G2 | Opret **ikke** nye matches med Goma `product_external_id` |
| G3 | Kør **ikke** Goma-sync for Bilka/Netto/Føtex/REMA (I har fooddata) |
| G4 | Byg **ikke** ny admin UI der siger "Kø: nye varer fra Goma" |
| G5 | Brug **ikke** Goma-id'er som nøgle i nye features |

### ERSTAT med

| Goma (gammelt) | Fooddata (nyt) |
|----------------|----------------|
| Goma produkt-id | `products.id` = `{source_chain}-{source_id}` |
| Goma match-tabel | `product_ingredient_matches` i fooddata |
| Goma tilbud | `product_offers` i fooddata |
| FF lokal Goma-cache | Pull fra fooddata → FF lokal cache |
| Planomo DB for matches | **Læs fooddata** — Planomo har pushet 11.540 matches |

### Engangs (valgfrit)

Gamle Goma-matches kan migreres via CSV — se [FF_HANDOFF_GOMA_FOODDATA_MAPPING.md](./FF_HANDOFF_GOMA_FOODDATA_MAPPING.md). Planomo anbefaler **ikke** at stole på automatisk mapping; manuel re-match + Planomos fooddata-kurering er master.

---

## 3. Implementeringsfaser

| Fase | Mål | Estimat |
|------|-----|---------|
| **F0** | Schema + verify (SQL 001–003, uuid-check) | 1 dag — **FF: tjek at 003 er kørt** |
| **F0b** | **Ugentlig kuration** — onsdag FF / torsdag Planomo | løbende — se [CURATION_WORKFLOW](./FF_HANDOFF_CURATION_WORKFLOW.md) |
| **F1** | Pull Planomos kurering + madbudget læser fooddata | 2–3 dage |
| **F2** | Publish-lib + push-on-save (FF bidrager til fooddata) | 2–3 dage |
| **F3** | Matching admin (2 sider) + kø + non-food filter | 3–5 dage |
| **F4** | Tagging (fravalg + øko-scan) — **ofte glemt** | 2–3 dage |
| **F5** | Tilbud-fixes (Salling pricing, REMA mapper, sticky katalog) | 2–4 dage |
| **F6** | Madbudget polish (guide prices, organic preference) | 2–3 dage |
| **F7** | Recipe resolution, guest wizard (nice-to-have) | senere |

**Minimum for "det virker":** F0 + F1 + F5 (tilbud) + F3 (mindst læse matches i madbudget).

---

## 4. Funktionskatalog — til godkendelse

Brug `[ ]` / `[x]` når I godkender scope.  
**Type:** `BUILD` = kode i FF-app · `RUN` = SQL/script · `READ` = kun læs fooddata · `STOP` = udfas

---

### EPIC A — Goma sunset

| ID | Funktion | P | Type | Beskrivelse | Acceptkriterie | Planomo reference |
|----|----------|---|------|-------------|----------------|-------------------|
| **A1** | Stop Goma match-kilde | P0 | STOP | Madbudget og admin læser ikke Goma matches | Ingen SQL/API mod Goma match-tabel for priser | — |
| **A2** | Fooddata produktnøgle overalt | P0 | BUILD | Alle nye matches bruger `{chain}-{source_id}` | 100% nye matches joiner `products` i fooddata | `src/lib/fooddata-stores.ts` |
| **A3** | Legacy Goma CSV (valgfri) | P2 | BUILD | Engangs-import af sikre Goma→fooddata links | Kun rækker med verificeret `same_id`/`ean` | `FF_HANDOFF_GOMA_FOODDATA_MAPPING.md` |

**Godkend Epic A:** [ ]

---

### EPIC B — Fooddata foundation (schema)

| ID | Funktion | P | Type | Beskrivelse | Acceptkriterie | Planomo reference |
|----|----------|---|------|-------------|----------------|-------------------|
| **B1** | Publish-tabeller | P0 | RUN | Opret kurering-tabeller i grocery Supabase | 4 tabeller findes | `scripts/fooddata-schema/001_*.sql` |
| **B2** | Source-kolonne planomo\|ff | P0 | RUN | Union merge mellem apps | `source` check constraint | `scripts/fooddata-schema/002_*.sql` |
| **B3** | ingredient_id som text | P0 | RUN | Accepter `ingredient-*` + UUID | ALTER COLUMN til text | `scripts/fooddata-schema/003_*.sql` |
| **B4** | Verify ingredient overlap | P0 | RUN | Core-ingredienser samme id i begge apps | 0 mismatch på verify-script | `scripts/verify-ingredient-uuid-overlap.ts` |

**Godkend Epic B:** [ ]  
**Note:** Planomo merge er kørt — B1–B3 skal være kørt i FF/grocery Supabase.

---

### EPIC C — Fælles kurering (read/write fooddata)

| ID | Funktion | P | Type | Beskrivelse | Acceptkriterie | Planomo reference |
|----|----------|---|------|-------------|----------------|-------------------|
| **C1** | fooddata-publish lib | P0 | BUILD | Push matches, queue, tags, øko med `source=ff` | Union upsert; delete kun `source=ff` | `src/lib/fooddata-publish/` |
| **C2** | fooddata-import pull | P0 | BUILD | Pull kurering → FF lokal cache; filtrér ukendte ids | Kun kendte `ingredient_id` + `product_external_id` | `src/lib/fooddata-import/curation-pull.ts` |
| **C3** | Bulk push script | P0 | BUILD | Reconcile FF → fooddata | `--queue=pending`, `--matches=resolved-only` | `scripts/sync-planomo-to-fooddata.ts` → `sync-ff-to-fooddata.ts` |
| **C4** | Bulk pull script | P0 | BUILD | Reconcile fooddata → FF | Matcher Planomo pull | `scripts/sync-fooddata-curation-to-ff.ts` |
| **C5** | Push-on-save: match opret | P0 | BUILD | Admin gem → upsert fooddata | Best-effort; lokal gem fejler ikke | `api/admin/add-product-match` |
| **C6** | Push-on-save: match slet | P0 | BUILD | Admin slet → delete kun `source=ff` | Sletter aldrig Planomo-rækker | `api/admin/remove-product-match` |
| **C7** | Push-on-save: kø match/dismiss | P0 | BUILD | Kø-handlinger syncer queue + match | Status `matched`/`dismissed` i fooddata | `api/admin/product-match-queue/*` |
| **C8** | Shareable ingredient id regler | P0 | BUILD | Accepter UUID + `ingredient-*` | Samme regex som Planomo | `fooddata-publish/config.ts` |
| **C9** | Første FF pull af Planomo data | P0 | RUN | Hent 11.540 matches til FF cache | Madbudget finder agurk-match fra fooddata | `npm run fooddata:pull-curation` (FF variant) |

**Godkend Epic C:** [ ]

**Merge-regler (obligatorisk):**

| Handling | Regel |
|----------|-------|
| Upsert match | Union på `(product_external_id, ingredient_id)` |
| Delete match | Kun `source = ff` |
| Bulk queue | Kun `status = pending` (ikke 60k historik) |
| Pull | Filtrér på FF's lokale ingredients + products |

---

### EPIC D — Katalog & tilbud (FF ejer fooddata writes)

| ID | Funktion | P | Type | Beskrivelse | Acceptkriterie | Planomo reference |
|----|----------|---|------|-------------|----------------|-------------------|
| **D1** | Salling pricing.ts | P0 | BUILD | Korrekt `before_price_cents`, Netto unit-price infer | Bilka fødevare-tilbud > 6 stk | `src/grocery/adapters/salling-algolia/pricing.ts` |
| **D2** | Salling mapper CFH | P0 | BUILD | `category_lvl0` fra consumerFacingHierarchy | Ikke "Non-food" på madvarer | `salling-algolia/mapper.ts` |
| **D3** | REMA mapper stramning | P0 | BUILD | `is_on_sale` kun når `regular > campaign` | Ingen falske tilbud | `rema1000/mapper.ts` |
| **D4** | Backfill before_price | P0 | RUN | Ret historiske rækker i fooddata | Script kørt efter D1–D3 | `scripts/backfill-fooddata-before-price.ts` |
| **D5** | Sticky products.active | P0 | BUILD | Varer forsvinder ikke når tilbud udløber | Matched produkter findes stadig i fooddata | FF_HANDOFF §11 |
| **D6** | Sticky product_offers | P0 | BUILD | Ved udløbet tilbud: `in_stock=false`, slet ikke produkt | Matches overlever uge-skift | FF_HANDOFF §11 |
| **D7** | Stabil source_id | P0 | BUILD | Samme vare = samme `{chain}-{source_id}` uge til uge | Ingen nyt UUID hver leaflet-uge | FF_HANDOFF §11 |
| **D8** | Import alle kæder | P1 | BUILD | Matching dækker alle fooddata-kæder, ikke kun 4 sync | Søgning inkl. Meny, Spar, Lidl osv. | `src/lib/fooddata-stores.ts` |

**Godkend Epic D:** [ ]

---

### EPIC E — Ingrediens↔produkt matching (admin)

| ID | Funktion | P | Type | Beskrivelse | Acceptkriterie | Planomo reference |
|----|----------|---|------|-------------|----------------|-------------------|
| **E1** | Side: ingrediens→produkter | P0 | BUILD | Vælg agurk, søg varer, multi-select match | Søg min 2 tegn, 500 hits, alle kæder | `/admin/product-ingredient-matching` |
| **E2** | Side: produkt→ingrediens kø | P0 | BUILD | Pagineret kø (50/side), match eller dismiss | **Separat side** `/nye-varer` | `/admin/product-ingredient-matching/nye-varer` |
| **E3** | API: products-for-matching | P0 | BUILD | Produktsøgning til matching | Relevans-sort, ekskl. allerede matchet | `api/admin/products-for-matching` |
| **E4** | API: ingredients-for-matching | P0 | BUILD | Ingrediensliste med tags + grams_per_unit | Paginering | `api/admin/ingredients-for-matching` |
| **E5** | API: add/remove match | P0 | BUILD | CRUD + snapshots + fooddata push | Snapshots gemmes ved opret | `add-product-match`, `remove-product-match` |
| **E6** | API: existing-matches | P0 | BUILD | Vis matches med live pris eller snapshot-fallback | Virker når tilbud udløbet | `api/admin/existing-matches` |
| **E7** | API: match-kø CRUD | P0 | BUILD | GET queue, POST match, POST dismiss | Paginering + filtre | `api/admin/product-match-queue/*` |
| **E8** | Enqueue efter sync | P0 | BUILD | Nye fooddata-varer → fælles kø i fooddata | Mad only; tjek fooddata dedup; push fooddata | `src/lib/product-match-queue.ts` |
| **E8b** | Ugentlig kuration onsdag | P0 | RUN | Pull + reconcile + enqueue + status | `npm run fooddata:weekly-curation -- --app=ff` | `scripts/fooddata-weekly-curation.ts` |
| **E9** | Non-food filter | P1 | BUILD | Shampoo, pleje osv. i kø filtreres fra | Department + navne-heuristik | `src/lib/product-food-classification.ts` |
| **E10** | Dismiss non-food script | P1 | RUN | Engangs/oprydning af kø | Pending non-food → dismissed | `scripts/dismiss-non-food-match-queue.ts` |
| **E11** | Match snapshots | P1 | BUILD | Gem navn, butik, sidste pris på match-række | UI viser match uden aktivt tilbud | `src/lib/product-match-snapshots.ts` |
| **E12** | Backfill match queue | P1 | RUN | Fyld kø med umatchede fooddata-varer | Efter Goma-sunset | `scripts/backfill-fooddata-match-queue.ts` |
| **E13** | Copy matches fra anden ingrediens | P2 | BUILD | Admin: kopier match-liste | Som Planomo UI | matching page |
| **E14** | AI-match (valgfri) | P2 | BUILD | AI-forslag til matches | | `api/admin/ai-match-products` |

**Godkend Epic E:** [ ]

---

### EPIC F — Tagging (KRITISK — ofte glemt i tidligere handoffs)

Der er **to helt separate tag-systemer**:

| Tag-type | Lag | Hvor gemmes | Fooddata tabel | Bruges til |
|----------|-----|-------------|----------------|------------|
| **Fravalg** | Ingrediens | `ingredients.exclusions` + fooddata | `ingredient_dietary_tags` | Madplan: filtrer opskrifter (svin, gluten, …) |
| **Øko** | **Produkt/varer** | `products.organic_tags` + fooddata | `product_organic_tags` | Madbudget: prioriter øko-varer i indkøbsliste |

**VIGTIGT:** Øko ligger **ikke** længere på ingredienser. Det er flyttet til **varer** via øko-scan.

#### F1 — Fravalg-tags (ingrediens)

| ID | Funktion | P | Type | Beskrivelse | Acceptkriterie | Planomo reference |
|----|----------|---|------|-------------|----------------|-------------------|
| **F1a** | Exclusion tag definitions | P0 | BUILD | Stabile tag-id'er: `pork`, `gluten`, `fish`, … | Samme ids som Planomo | `src/lib/dietary-exclusions/constants.ts` |
| **F1b** | IngredientTagEditor komponent | P0 | BUILD | Inline tag-redigering (chips/checkboxes) | Genbruges i matching + exclusions | `src/components/admin/IngredientTagEditor.tsx` |
| **F1c** | Admin side: exclusions | P0 | BUILD | Oversigt, søg, bulk-tag, statistik | `/admin/exclusions` | `src/app/admin/exclusions/page.tsx` |
| **F1d** | API: exclusions overview | P0 | BUILD | GET tag-statistik + produkt-øko counts | | `api/admin/exclusions/route.ts` |
| **F1e** | API: PATCH ingredient tags | P0 | BUILD | Gem tags + push til fooddata | `ingredient_dietary_tags` upsert | `api/admin/exclusions/ingredients/route.ts` |
| **F1f** | Inline tags i matching UI | P0 | BUILD | Tag ingrediens **mens** I matcher | Editor på begge matching-sider | matching pages |
| **F1g** | Dietary registry i generator | P1 | BUILD | Madplan filtrerer opskrifter på tags | Respekterer familie-fravalg | `dietary-exclusions/registry.ts` |
| **F1h** | Seed auto-suggest (valgfri) | P2 | BUILD | Foreslå tags fra ingrediensnavn | | `api/admin/exclusions/seed/route.ts` |

**Godkend Epic F1 (fravalg):** [ ]

**Tag-id'er (kopiér 1:1):**  
`red-meat`, `poultry`, `pork`, `fish`, `eggs`, `shellfish`, `nuts`, `dairy`, `gluten`, `soy`

#### F2 — Øko-tags (produkt)

| ID | Funktion | P | Type | Beskrivelse | Acceptkriterie | Planomo reference |
|----|----------|---|------|-------------|----------------|-------------------|
| **F2a** | products.organic_tags kolonne | P0 | BUILD | `text[]` på FF lokale products | Migration i FF DB | `supabase/migrations/20260606130000_add_products_labels.sql` |
| **F2b** | Øko-scan regler | P0 | BUILD | øko i navn → `organic-priority`; + mejeri/kød → `organic-animal` | | `src/lib/madbudget/organic-preference.ts` |
| **F2c** | oko-scan-products script | P0 | BUILD+RUN | Batch scan alle varer + push fooddata | Kør efter sync + ved behov | `scripts/oko-scan-products.ts` |
| **F2d** | Organic preference i madbudget | P0 | BUILD | Bruger vælger "prioriter øko" → vælg taggede varer | Kun produkter med rigtige tags | `organic-preference.ts` + shopping-list API |
| **F2e** | Publish product_organic_tags | P0 | BUILD | Øko-scan pusher til fooddata | `product_organic_tags` upsert | `fooddata-publish/product-organic-tags.ts` |

**Godkend Epic F2 (øko):** [ ]

**Deprecated — byg IKKE:** `scripts/one-time-oko-ingredient-tags.ts` (gammel ingrediens-øko).

---

### EPIC G — Madbudget & indkøbsliste-priser

| ID | Funktion | P | Type | Beskrivelse | Acceptkriterie | Planomo reference |
|----|----------|---|------|-------------|----------------|-------------------|
| **G1** | Shopping-list-prices API | P0 | BUILD | Ingrediens → match → tilbud → pris per butik | Læser fooddata matches (via lokal cache) | `api/madbudget/shopping-list-prices/route.ts` |
| **G2** | Match resolution | P0 | BUILD | Slå op i `product_ingredient_matches` med fooddata-nøgler | Ingen Goma-fallback | samme API |
| **G3** | Organic preference i prissøgning | P0 | BUILD | Foretræk `organic-priority` / `organic-animal` varer | Kræver F2 + F2d | `organic-preference.ts` |
| **G4** | Guide prices (vejledende) | P1 | BUILD | Meny/Spar/Løvbjerg: udfyld manglende priser fra REMA+Netto | Marker "vejledende" i UI; nævn ikke REMA/Netto | `src/lib/madbudget/guide-prices.ts` |
| **G5** | Guide price toggle | P1 | BUILD | Bruger kan slå vejledende priser fra | localStorage | madbudget page |
| **G6** | Typical pack sizes | P2 | BUILD | Fallback pakkestørrelser | | `typical-pack-sizes.ts` |
| **G7** | Guest demo data | P2 | BUILD | Klient-only demo uden login | | `guest-demo-data.ts` |
| **G8** | GuestGuidedTour wizard | P2 | BUILD | 4-trins onboarding modal | | `GuestGuidedTour.tsx` |
| **G9** | GuestPageTour spotlight | P2 | BUILD | 10-trins produkt-tour | `data-tour` hooks | `GuestPageTour.tsx` |
| **G10** | LeftoversWizard | P2 | BUILD | Rester før ny madplan (kun logged in) | | `LeftoversWizard.tsx` |

**Godkend Epic G:** [ ]

---

### EPIC H — Opskrifter & ingrediens-katalog

| ID | Funktion | P | Type | Beskrivelse | Acceptkriterie | Planomo reference |
|----|----------|---|------|-------------|----------------|-------------------|
| **H1** | Ingredient name resolution | P1 | BUILD | Sikker dansk navnematching (purløg ≠ løg) | | `ingredient-name-resolution.ts` |
| **H2** | Recipe ingredient catalog | P1 | BUILD | Opskrift-linjer → katalog-id ved gem | Blokerer gem hvis unresolved | `recipe-ingredient-catalog.ts` |
| **H3** | Recipe save validation | P1 | BUILD | Admin opskrift API validerer katalog | | `api/admin/save-generated-recipe`, `validate-recipe` |
| **H4** | People-per-meal scaling | P2 | BUILD | PE-formel til portioner | | `people-per-meal.ts` |

**Godkend Epic H:** [ ]

**Deprecated — byg IKKE:** `ingredient-registry-sync.ts` (no-op erstattet af H2).

---

## 5. P0 minimum — "det virker hele vejen rundt"

Hvis I kun har tid til det nødvendige:

```
[ ] B1–B3  Schema kørt i grocery Supabase
[ ] B4     verify-uuid grøn
[ ] C2+C4  Pull 11.540 Planomo-matches til FF cache
[ ] G1+G2  Madbudget priser fra fooddata matches (ikke Goma)
[ ] A1+A2  Goma sunset for priser/matches
[ ] D1–D3  Tilbud-fixes (ellers forkerte priser)
[ ] D5–D7  Sticky katalog (ellers matches dør hver uge)
```

**Nice-to-have men stærkt anbefalet (Planomo har det, FF mangler):**

```
[ ] F1a–F1f  Fravalg-tags (madplan filtering)
[ ] F2a–F2e  Øko på varer (madbudget øko-prioritering)
[ ] E1–E8    Matching admin (ellers I kan ikke kuratere nye varer)
[ ] C1+C5–C7 Publish tilbage til fooddata
```

---

## 6. FF fil-struktur (kopiér fra Planomo)

```
src/lib/
  fooddata-publish/           # source = 'ff'
    config.ts
    matches.ts
    queue.ts
    ingredient-tags.ts
    product-organic-tags.ts
  fooddata-import/
    curation-pull.ts
  product-match-queue.ts
  product-food-classification.ts
  product-match-snapshots.ts
  fooddata-stores.ts
  dietary-exclusions/
    constants.ts
    index.ts
    registry.ts
  madbudget/
    organic-preference.ts
    guide-prices.ts              # P1
    typical-pack-sizes.ts        # P2
  ingredient-name-resolution.ts  # P1
  recipe-ingredient-catalog.ts   # P1

src/components/admin/
  IngredientTagEditor.tsx

src/app/admin/
  exclusions/page.tsx
  product-ingredient-matching/page.tsx
  product-ingredient-matching/nye-varer/page.tsx

src/app/api/admin/
  exclusions/
  products-for-matching/
  add-product-match/
  remove-product-match/
  existing-matches/
  product-match-queue/

scripts/
  sync-ff-to-fooddata.ts
  sync-fooddata-curation-to-ff.ts
  verify-ingredient-uuid-overlap.ts
  oko-scan-products.ts
  backfill-fooddata-match-queue.ts
  dismiss-non-food-match-queue.ts
  backfill-fooddata-before-price.ts
```

---

## 7. Environment variables (FF)

```bash
# Fooddata (grocery Supabase) — read + write kurering
GROCERY_SUPABASE_URL=
GROCERY_SUPABASE_SECRET_KEY=

# FF egen app-db
NEXT_PUBLIC_SUPABASE_URL=          # eller FF equivalent
SUPABASE_SERVICE_ROLE_KEY=

# Verify overlap (kør fra FF eller Planomo repo)
FF_SUPABASE_URL=                   # FF app db
FF_SUPABASE_SERVICE_ROLE_KEY=
PLANOMO_SUPABASE_URL=              # optional cross-check
```

---

## 8. Runbook — scripts FF skal have

| Script | Kommando (FF variant) | Hvornår |
|--------|----------------------|---------|
| Verify UUID overlap | `npm run fooddata:verify-uuid` | Før merge, efter ingrediens-ændringer |
| Pull Planomo kurering | `npm run fooddata:pull-curation` | Dagligt / efter Planomo admin-arbejde |
| Push FF kurering | `npm run fooddata:sync-publish` | Efter FF admin-arbejde |
| Initial merge | `npm run fooddata:initial-merge:execute` | Første gang + efter schema-ændring |
| Øko-scan | `npm run oko:scan-products` | Efter product sync |
| Backfill kø | `npx tsx scripts/backfill-fooddata-match-queue.ts` | Efter Goma-sunset, engangs |
| Dismiss non-food | `npx tsx scripts/dismiss-non-food-match-queue.ts` | Oprydning |
| Backfill before_price | `npx tsx scripts/backfill-fooddata-before-price.ts` | Efter D1–D3 port |

---

## 9. Verifikation (SQL i fooddata)

```sql
-- Matches findes og joiner katalog
SELECT COUNT(*) FROM product_ingredient_matches;
SELECT COUNT(*)
FROM product_ingredient_matches m
JOIN products p ON p.source_chain || '-' || p.source_id = m.product_external_id;

-- Planomo vs FF bidrag
SELECT source, COUNT(*) FROM product_ingredient_matches GROUP BY source;

-- Tags
SELECT COUNT(*) FROM ingredient_dietary_tags;
SELECT COUNT(*) FROM product_organic_tags;

-- Pending kø
SELECT COUNT(*) FROM product_ingredient_match_queue WHERE status = 'pending';
```

**FF accept efter F1:**

- [ ] Madbudget for "agurk" returnerer pris fra fooddata-match (ikke Goma)
- [ ] `product_external_id` starter med `bilka-`, `netto-`, `rema-1000-`, osv.
- [ ] verify-uuid: 0 mismatch på core-ingredienser
- [ ] Efter uge-skift: matches for udløbne tilbud vises stadig (snapshots)

---

## 10. Hvad tidligere handoffs glemte (checkliste)

Sørg for at FF-projektet **eksplicit** inkluderer:

- [ ] **Fravalg-tags** (`ingredient_dietary_tags`) — ikke kun lokal `exclusions`
- [ ] **Øko på produkter** — ikke ingredienser; `oko-scan-products.ts`
- [ ] **IngredientTagEditor inline** i matching — ikke kun separat side
- [ ] **Non-food filter** — aldrig i køen; kun mad ved nye varer
- [ ] **003 ingredient_id text** — ellers kun ~30% af matches deles
- [ ] **Push-on-save** på alle admin-handlinger
- [ ] **Sticky katalog** — produkter forsvinder ikke når tilbud udløber
- [ ] **Match snapshots** — navn/pris når tilbud er væk
- [ ] **Guide prices** for tilbuds-only-butikker (Meny, Spar, …)
- [ ] **Alle fooddata-kæder** i søgning — ikke kun Bilka/Netto/Føtex/REMA

---

## 11. Samlet godkendelse

| Epic | Scope | Godkend |
|------|-------|---------|
| A | Goma sunset | [ ] |
| B | Fooddata schema | [ ] |
| C | Fælles kurering read/write | [ ] |
| D | Katalog & tilbud | [ ] |
| E | Matching admin | [ ] |
| F1 | Fravalg-tags | [ ] |
| F2 | Øko-tags på varer | [ ] |
| G | Madbudget & priser | [ ] |
| H | Opskrifter & katalog | [ ] |

**Projektleder sign-off:** _______________ **Dato:** _______________

---

## 12. One-liner til FF Cursor

> Sunset Goma. Fooddata er fælles produktkatalog + fælles kurering (matches/tags). Pull Planomos 11.540 matches. Byg publish/pull (`source=ff`). Én mad-only kø — tom nu, kun nye varer fremover. Onsdag FF, torsdag Planomo. Non-food aldrig i køen.

---

## 13. Leverance-checkliste (Planomo → FF)

- [x] fooddata schema 001 + 002 + 003 kørt
- [x] Planomo merge: 11.540 matches, 148 tags, 2.984 øko
- [x] ingredient_id text (UUID + `ingredient-*`)
- [x] Kø-backlog slettet (37k → 0)
- [x] Dokumentation klar (MASTER + CURATION_WORKFLOW + under-handoffs)
- [ ] FF: pull + implementér (se § LEVERANCE)

---

*Sidst opdateret: jun 2026 — merge done, queue cleared, klar til FF-leverance.*
