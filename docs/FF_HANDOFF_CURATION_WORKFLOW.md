# FF Handoff: Fælles kø, ugentlig kurering & delt vs. lokalt

**Målgruppe:** FF + Planomo  
**Formål:** Én skarp sandhed for "nye varer der skal matches og tagges" — uden at smadre noget.

**Relateret:** [FF_HANDOFF_MASTER.md](./FF_HANDOFF_MASTER.md) · [FF_HANDOFF_FOODDATA_SYNC.md](./FF_HANDOFF_FOODDATA_SYNC.md)

---

## TL;DR — det I skal forstå

| Spørgsmål | Svar |
|-----------|------|
| Fælles **produkt**katalog? | **Ja** — `products` + `product_offers` i **fooddata** (efter Goma sunset). FF scraper, begge læser. |
| Fælles **ingrediens**katalog? | **Nej** — lokalt per app. Matches deles via fooddata når id'er overlapper. |
| Er køen én eller to? | **ÉN** — `product_ingredient_match_queue` i **fooddata** |
| Hvad kommer i køen fra nu? | Kun **nye mad-varer** efter katalog-sync. **Non-food aldrig.** |
| Historisk 37k backlog? | **Slettet** — `npm run fooddata:clear-queue-backlog -- --execute` |

---

## 1. To forskellige "lister" — bland dem ikke

### Liste A — Fælles produkt-kø (fooddata)

**Hvad:** Nye **mad-varer** i kataloget uden ingrediens-match endnu.  
**Hvor:** `product_ingredient_match_queue` i **fooddata** (sandhed) + lokal cache i hver app.  
**Nøgle:** `product_id` = `{chain}-{source_id}` — **én pending række pr. vare globalt**.  
**UI:** `/admin/product-ingredient-matching/nye-varer`

```
Ny vare i katalog
      ↓
Enqueue (mad only, non-food springes over)
      ↓
fooddata kø (pending)  ←─── FF onsdag / Planomo torsdag arbejder her
      ↓
Match + tag → fooddata matches + tags
      ↓
status = matched (kø lukket for begge efter pull)
```

### Liste B — Lokal ingrediens-backlog (per app)

**Hvad:** Ingredienser i **din** `ingredients`-tabel uden **nogen** match endnu.  
**Hvor:** Kun lokalt — **ikke** i fooddata.  
**UI:** `/admin/product-ingredient-matching` (ingrediens-listen)

```
Agurk har 0 matches lokalt  →  du skal søge varer og matche (ingrediens→produkter)
```

**Vigtigt:** Liste A er **fælles**. Liste B er **lokal** — FF kan have ingredienser Planomo ikke har (og omvendt).

---

## 2. Delt vs. lokalt — knivskarpe regler

### Delt i fooddata (begge apps)

| Data | Nøgle | Hvornår deles |
|------|-------|---------------|
| Match | `(product_external_id, ingredient_id)` | Begge apps kender produkt + ingrediens lokalt |
| Fravalg-tags | `ingredient_id` | Samme ingrediens-id i begge apps |
| Øko-tags | `product_external_id` | Altid (produktniveau) |
| Produkt-kø | `product_id` | Altid én global kø |

### Lokalt only (den anden app ignorerer ved pull)

| Data | Eksempel |
|------|----------|
| Match på FF-only ingrediens | FF opskrift-ingrediens Planomo ikke har |
| Ingrediens-backlog | "Liste B" — kun din app |
| Hele `ingredients`-tabellen | Aldrig fuld sync |
| Opskrifter | Altid lokalt |

### Flow når Planomo matcher agurk → Bilka-agurk

```
1. Planomo admin: match + evt. fravalg-tags på agurk
2. Lokal DB gemmes først
3. Push til fooddata (matches + ingredient_dietary_tags + queue=matched)
4. FF onsdag: pull → FF lokal cache opdateres
5. FF madbudget kan nu bruge samme match
```

### Flow når FF matcher FF-only ingrediens

```
1. FF admin matcher
2. Push til fooddata (ok — rækken ligger der)
3. Planomo pull: ingredient_id ukendt lokalt → SPRING OVER
4. Ingen skade — Planomo ser det ikke
```

---

## 3. Non-food — aldrig i køen

**Regel:** Kun **madvarer** enqueuees. **Non-food kommer aldrig i køen.**

| Lag | Hvad sker |
|-----|-----------|
| Enqueue | `isFoodCatalogProduct()` — spring non-food over |
| Admin kø-API | Filtrerer non-food fra visning |

**Fra jun 2026:** Historisk backlog (~37k) er slettet. Køen vokser kun når **nye mad-varer** dukker op i katalog-sync.

### Hvornår enqueue sker (kun nye varer)

| App | Trigger |
|-----|---------|
| **FF** | Efter scrape/sync — kun `product_id` der er **nye** i den kørsel |
| **Planomo** | Efter `import-fooddata-to-planomo.ts` — kun nye `product_id` (default) |

**Ikke:** bulk `--enqueue-unmatched` eller ugentlig sync (medmindre eksplicit backfill).

**Planomo reference:** `scripts/import-fooddata-to-planomo.ts` trin 5, `src/lib/product-match-queue.ts`

---

## 4. Ugentlig ritual (obligatorisk)

| App | Dag | Kommando |
|-----|-----|----------|
| **FF** | **Onsdag** | `npm run fooddata:weekly-curation -- --app=ff` |
| **Planomo** | **Torsdag** | `npm run fooddata:weekly-curation -- --app=planomo` |

### Scriptet gør (3 trin)

```
1. Pull fra fooddata  → matches, tags, øko, kø-status
2. Reconcile          → luk lokal pending hvis produkt allerede har match
3. Status dashboard   → fælles vs. lokale tal
```

**Enqueue sker IKKE i weekly script** — kun ved katalog-sync af nye mad-varer.

**Planomo reference:** `scripts/fooddata-weekly-curation.ts`

### Hvad I gør manuelt efter scriptet

1. Åbn **nye varer** — arbejd produkt-kø (Liste A)
2. Åbn **ingrediens-matching** — tag ingredienser uden matches (Liste B)
3. Tag fravald/øko mens I matcher (`IngredientTagEditor`)
4. Ved gem pusher I automatisk til fooddata (push-on-save)

---

## 5. Sandhedshierarki — så I ikke smadrer noget

```
fooddata (master for kø + shared curation)
    ↕ pull / push
lokal cache (Planomo DB / FF DB)
    ↕ admin UI
menneske kuraterer
```

| Handling | Skriv til | Derefter |
|----------|-----------|----------|
| Match oprettet | Lokal → fooddata | Anden app puller ved ugentlig sync |
| Match slettet | Lokal → fooddata (kun egen `source`) | Anden app beholder sin række hvis `source=anden` |
| Tag gemt | Lokal → fooddata | Pull merger tags |
| Enqueue | Lokal → fooddata | Tjekker fooddata først (ingen duplikat) |
| Katalog/tilbud | fooddata only | FF scraper — Planomo importerer |

**Aldrig:** To parallelle køer (Goma + fooddata). **Goma kø er dead.**

---

## 6. Enqueue deduplication (fix jun 2026)

Før enqueue tjekkes **både**:

- Lokal `product_ingredient_matches`
- Lokal pending kø
- **Fooddata** matches (den anden app kan have matchet)
- **Fooddata** pending kø

→ Forhindrer at FF og Planomo indsætter samme vare to gange.

**Planomo reference:** `src/lib/product-match-queue.ts` + `src/lib/fooddata-curation/fooddata-ids.ts`

---

## 7. FF implementering — minimum

| # | Hvad | Reference |
|---|------|-----------|
| 1 | Pull kurering + fuld kø sync | `curation-pull.ts` med `pullQueue: true` |
| 2 | Enqueue med fooddata dedup | `product-match-queue.ts` |
| 3 | Push-on-save match/tag/kø | admin API routes |
| 4 | Non-food filter | `product-food-classification.ts` |
| 5 | Ugentlig script onsdag | `fooddata-weekly-curation.ts` |
| 6 | Admin: én side nye varer | `nye-varer/page.tsx` |
| 7 | Inline tagging | `IngredientTagEditor.tsx` |

---

## 8. Acceptkriterier — "det er knivskarpt"

- [ ] FF og Planomo viser **samme pending count** i fooddata (± pull-timing)
- [ ] Vare matchet i FF → **forsvinder fra Planomos kø** efter torsdag pull
- [ ] Vare matchet i Planomo → **forsvinder fra FF kø** efter onsdag pull
- [ ] Non-food produkter **aldrig** i pending kø (enqueue + UI filter)
- [ ] Ingen nye Goma-kø referencer
- [ ] `npm run fooddata:verify-uuid` grøn på core-ingredienser
- [ ] Ingrediens-backlog (Liste B) synlig separat i admin

---

## 9. FAQ — kompleksitet uden panik

**Q: Er det ikke for komplekst?**  
A: Det *var* komplekst med Goma + fooddata + to køer. Nu: **én kø i fooddata**, lokal cache, ugentlig sync. Simpelt ritual.

**Q: Hvad hvis vi begge matcher samme vare samtidig?**  
A: Unik nøgle `(product_external_id, ingredient_id)`. Forskellige ingredienser = begge ok. Samme par = union upsert.

**Q: 37k pending — skal vi fixe alt?**  
A: **Nej.** Backlog er slettet jun 2026. Køen starter forfra — kun nye mad-varer fremover.

**Q: Skal FF trække Planomos 11.540 matches først?**  
A: Ja — første pull (`fooddata:pull-curation --pull-queue` eller weekly script). Derefter onsdags-ritual.

---

*Sidst opdateret: jun 2026 — fælles kø, ugentlig sync, non-food only, delt vs. lokalt.*
