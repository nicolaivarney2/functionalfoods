# Handoff til FunctionalFoods: Madbudget wizard & guest-demo

**Målgruppe:** FF Cursor (Composer)  
**Live reference:** [https://www.planomo.dk/madbudget](https://www.planomo.dk/madbudget)  
**Formål:** FF skal kunne bygge **samme oplevelse** som Planomo: fiktiv men **realistisk** demo for gæster (ikke logget ind) + fuld madplan-flow for brugere. Dummy-data skal bruge **rigtige opskrift-slugs** og samme datamodeller som produktion.

**Relateret:** [FF_HANDOFF_FOODDATA_INGREDIENT_MATCHING.md](./FF_HANDOFF_FOODDATA_INGREDIENT_MATCHING.md) (produkt↔ingrediens), [FOODDATA_IMPORT_ANSWERS.md](../FOODDATA_IMPORT_ANSWERS.md) (katalog/priser).

---

## TL;DR

| Lag | Planomo | FF skal spejle |
|-----|---------|----------------|
| **Gæst (demo)** | Klient-only dummy — intet gemmes i DB | Samme: `isGuest = !user` → load `guest-demo-data.ts` |
| **Onboarding-wizard** | 4-trins modal (`GuestGuidedTour`) — **findes i repo, ikke koblet til side endnu** | Kan aktiveres: Familie → Butikker → Fravalg → Funktioner |
| **Produkt-tour** | Spotlight-tour (`GuestPageTour`) — auto efter 5 s + knap i banner | `data-tour="..."` hooks på UI |
| **Logget ind** | `family_profiles` + `user_meal_plans` + generator + priser via matches | Auth + samme API-kontrakter |
| **Rester-wizard** | Kun logget ind, før ny generering | `LeftoversWizard` + `user_pantry_items` |

---

## 1. Produktvision (hvad siden skal demonstrere)

Madbudget er **ét skærmbillede** med:

1. **Ugeplanlægger** — 7 dage × måltider (primært aftensmad; valgfri madpakker på hverdage).
2. **Familieindstillinger** — voksne/børn, butikker, fravalg, opskrifts-nicher, økologi, ugentligt budget.
3. **Basisvarer** — faste ugentlige varer (mælk, æg, rugbrød…) adskilt fra madplan-indkøb.
4. **Indkøbsliste** — aggregeret fra plan + madpakker; pr. butik med tilbud (via `product_ingredient_matches`).
5. **Ernæring** — uge/dag-gennemsnit når opskrifter har FRIDA-data.
6. **Deling** — read-only link til partner (`/madplan/[token]`).

USP copy (fra produkt): *madplan koblet til ugens tilbud i den butik familien vælger* — ikke generisk AI uden prisdata.

---

## 2. To tilstande: gæst vs. bruger

```text
useAuth() → user?
  ├─ NEJ  → isGuest = true
  │         • Load GUEST_DEMO_* (client only)
  │         • Banner + GuestPageTour
  │         • generateMealPlan() → alert("Opret bruger")
  │         • Ingen API writes
  └─ JA   → Load family_profiles, user_meal_plans, basisvarer, pantry
            • mealPlanGenerator.generateOneWeekMealPlan()
            • POST shopping-list-prices
            • Autosave family profile (debounced)
```

**Detection (Planomo):**

```typescript
const { user, loading: authLoading } = useAuth()
const isGuest = !authLoading && !user
```

---

## 3. Wizard / tour — to komponenter

### 3A. `GuestGuidedTour` — onboarding-wizard (modal, 4 trin)

**Fil:** `src/components/madbudget/GuestGuidedTour.tsx`  
**Status i Planomo:** Komponent er færdig, men **ikke importeret** på `/madbudget` endnu. FF kan koble den ind før spotlight-touren.

| Trin | id | Indhold |
|------|-----|---------|
| 1 | `family` | Antal voksne/børn, aldersbånd (`0-3`, `4-8`, `8+`), live **portioner (PE)** |
| 2 | `stores` | Checkbox butikker (id 1–8, se §6) |
| 3 | `preferences` | Fravalg-grupper (rødt kød, fisk, gluten, …) — ids som `red-meat`, ikke ingrediens-UUID |
| 4 | `features` | Kort intro til madpakker, lås retter, indkøbsliste, næring |

**Output:** `onApply(GuestTourFamilyState)` → opdater `familyProfile` + `applyGuestDemoScaling()`.

**PE-formel (samme som demo-data):**

| Person | PE |
|--------|-----|
| Voksen | 1.0 |
| Barn 0–9 (`0-3`, `4-8`) | 0.5 |
| Barn 10+ (`8+`) | 1.0 |

```typescript
familyPe = max(1, adults * 1.0 + sum(childBands))
scaledAmount = baseAmount * (familyPe / GUEST_DEMO_BASE_PE)  // BASE_PE = 3.5
```

### 3B. `GuestPageTour` — spotlight-rundvisning (10 trin)

**Fil:** `src/components/madbudget/GuestPageTour.tsx`  
**Trigger:** `GuestDemoBanner` → "Tag en guidet tour", eller `setTimeout(5000)` hvis `localStorage.planomo-guest-tour-seen !== '1'`.

**Krav til UI:** Elementer skal have `data-tour="..."` (se §8).

**Trin (Planomo `guestTourSteps` i `page.tsx`):**

1. `meal-plan-grid` — ugeoversigt  
2. `swap-meal-example` — onsdag aftensmad (byt ret)  
3. `week-selector` — skift uge (demo: 3 fake uger)  
4. `family-settings` — modal  
5. `basisvarer` — modal  
6. `generate-meal-plan` — måltider + generer  
7. `lunchbox` — madpakker til børn  
8. `nutrition` — ernæringsoverblik  
9. `shopping-list` — indkøb + butikfaner  
10. `basisvarer-in-shopping` — basisvarer nederst på listen  

### 3C. `LeftoversWizard` — kun logget ind

**Fil:** `src/components/madbudget/LeftoversWizard.tsx`  
Vises **før** `generateMealPlan()` når bruger allerede har en plan.

Flow:

1. (Valgfrit) "Hvor handlede du sidste uge?" → `shop-survey`  
2. Markér rester fra sidste uges indkøbsliste + manuelle køleskabsvarer  
3. Gem `user_pantry_items` → send `availableIngredients` til generator  

---

## 4. Guest dummy-data — copy-paste spec

**Kilde:** `src/lib/madbudget/guest-demo-data.ts`  
**Vigtigt:** Dummy er **skaleret** til familie-PE; basis er `GUEST_DEMO_BASE_PE = 3.5` (2 voksne + barn 4–8 + barn 10+).

### 4.1 Default familie

```typescript
GUEST_DEMO_DEFAULT_FAMILY = {
  adults: 2,
  children: 2,
  childrenAges: ['4-8', '8+'],
  selectedStores: [1, 2, 3, 4], // REMA, Netto, Føtex, Bilka
}
```

### 4.2 Aftensmad — rigtige opskrifter (7 slugs)

Hentes live fra `GET /api/recipes/[slug]`; fallback-titler/billeder hvis API fejler.

| Dag | slug |
|-----|------|
| Man | `boernevenlige-mini-pizzaer` |
| Tir | `ovnbagt-fiskefilet-med-sproed-kartoffeltopping` |
| Ons | `boernevenlige-tacos-med-kylling-og-groentsager` |
| Tor | `bagte-fiskefileter-med-kartofler-og-groentsager` |
| Fre | `boernevenlige-gratineret-sommerpasta` |
| Lør | `one-pot-kylling-og-groentsager-med-pasta-` |
| Søn | `sloppy-joe-burger-med-hakket-oksekoed` |

`GUEST_DEMO_RECIPE_FALLBACKS` i filen har titel + `image` URL per slug.

### 4.3 Madpakker (ikke opskrifter)

```typescript
GUEST_DEMO_LUNCHBOX_CONFIG = {
  enabled: true,
  style: 'balanced',      // se lunchbox-templates.ts
  boxesPerChild: [1, 1],  // én kasse pr. barn pr. dag
  days: 5,                // man–fre kun
}
```

Implementering: `src/lib/madbudget/lunchbox-templates.ts` + `lunchbox-shopping.ts` — **kasse-baseret**, ikke recipe-slugs.

### 4.4 Basisvarer (for BASE_PE 3.5)

| ingredient | qty | unit | note |
|------------|-----|------|------|
| Mælk | 3 | L | |
| Vaniljeskyr | 1 | kg | produkt: Cheasy Vanilje Skyr |
| Æg | 20 | stk | |
| Rugbrød | 1 | stk | |
| Boller | 6 | stk | |
| Leverpostej | 1 | pk | |
| Agurk | 3 | stk | |
| Tomater | 500 | g | |
| Gulerødder | 1 | kg | |
| Frugt til madpakken | 8 | stk | blandet |
| Ostehapser | 1 | pk | |
| Figenstænger | 1 | pk | |
| Drikkeyoghurt | 4 | stk | |

### 4.5 Indkøbsliste — kategorier

Skal matche generator (`Protein`, `Grøntsager`, `Frugt`, `Mejeri`, `Kolonial & Diverse`) så madpakke-rækker kan flettes ind.

Se fuld liste i `GUEST_DEMO_SHOPPING_LIST` — mængder er **per PE** før skalering (intern: `amount` × BASE_PE i `applyGuestDemoScaling`).

### 4.6 Butikspriser (demo)

`buildGuestDemoStorePrices(shoppingList, familyPe)`:

- Butikker: `rema-1000`, `netto`, `føtex`, `bilka` (guest keys; DB kan bruge `foetex`/`fotex` alias)
- Deterministisk ±10 % variation pr. butik
- ~5 % varer markeret `isOnSale` med `totalNormalPrice`
- **Én vare mangler bevidst** i alle butikker → ~98 % coverage (realistisk)

### 4.7 Fake gemte uger (gæst)

```typescript
savedMealPlans = [
  { id: 'guest-week-current', week_number: currentWeekNum, is_active: true },
  { id: 'guest-week-prev-1',  week_number: currentWeekNum - 1 },
  { id: 'guest-week-prev-2',  week_number: currentWeekNum - 2 },
]
```

---

## 5. Meal-plan grid — datastruktur

```typescript
type DayKey = 'monday' | 'tuesday' | ... | 'sunday'
type MealType = 'breakfast' | 'lunch' | 'dinner'

mealPlan: Record<DayKey, Record<MealType, RecipeSlot | null>>

// RecipeSlot (aftensmad) — minimum felter UI forventer:
{
  id, slug, title,
  image, imageUrl,
  store: 'Tilbud denne uge',
  ingredients: [],
  servings: 4,
  prepTime: '30 min',
  category, dietaryTags,
  mealType: 'dinner',
  calories?, protein?, carbs?, fat?, fiber?, vitamins?, minerals?
}
```

**Lås retter:** `lockDishesMode` — bruger kan låse dage/retter; ved generering beholdes låste slots (gæst: generering blokeret).

**Byt ret:** Modal med opskriftssøgning — `data-tour="swap-meal-example"` på onsdag dinner.

---

## 6. Butiks-katalog (numeric id → DB slug)

**Fil:** `src/lib/madbudget-stores.ts`

| id | name | key (priser/katalog) |
|----|------|---------------------|
| 1 | REMA 1000 | `rema-1000` |
| 2 | Netto | `netto` |
| 3 | Føtex | `føtex` / `foetex` / `fotex` |
| 4 | Bilka | `bilka` |
| 5 | Nemlig.com | `nemlig` |
| 6 | MENY | `meny` |
| 7 | Spar | `spar` |
| 8 | Løvbjerg | `løvbjerg` / `lovbjerg` |

`family_profiles.selected_stores` = `number[]` (disse ids).

**Pris-API:** `POST /api/madbudget/shopping-list-prices` med `{ shoppingListItems, selectedStoreIds }` — kræver `product_ingredient_matches` + `product_offers` i FF/Planomo DB.

---

## 7. Familieprofil (logget ind + gæst UI)

Gemmes i `family_profiles` (autosave debounce 1 s).

```typescript
familyProfile = {
  adults: number,
  children: number,              // afledt af childrenAges.length
  childrenAges: string[],      // '0-3' | '4-8' | '8+'
  prioritizeOrganic: boolean,
  prioritizeAnimalOrganic: boolean,
  excludedIngredients: string[], // fravalg-ids ELLER ingrediens-navne (prod)
  selectedStores: number[],
  mealsPerDay: ('breakfast'|'lunch'|'dinner')[],  // dinner altid med
  includedRecipeCategories: string[],  // default ['familiemad']
  weeklyBudgetKr: number | null,
}
lunchboxConfig: {
  enabled: boolean,
  style: 'rugbrod_heavy' | 'balanced' | 'snack_varied' | 'low_bread',
  boxesPerChild: number[],  // length = children
  days: number,             // typisk 5
}
variationLevel: 0..3
```

**Opskriftskategorier (union-filter):** `familiemad`, `boernefavoritter`, `hurtig-men-sund`, `anti-inflammatory`, `vegetarisk`, `fuldkorn-lav-kulhydrat`, `proteinrig-hverdag` — se `RECIPE_CATEGORY_OPTIONS` i `page.tsx`.

**Planomo har droppet per-voksen vægttabs-wizard** — generator bruger fast `familiemad` diet approach.

---

## 8. `data-tour` hooks (FF UI skal have disse)

| Attribut | Element |
|----------|---------|
| `data-tour="meal-plan-grid"` | Uge/dag-grid container |
| `data-tour="swap-meal-example"` | Én celle (onsdag dinner) |
| `data-tour="week-selector"` | Uge-dropdown |
| `data-tour="family-settings"` | Knap Familieindstillinger |
| `data-tour="basisvarer"` | Knap Basisvarer |
| `data-tour="generate-meal-plan"` | Måltider + Generer + Lås |
| `data-tour="lunchbox"` | Checkbox madpakker |
| `data-tour="nutrition"` | Ernæringssektion |
| `data-tour="shopping-list"` | Indkøbsliste-blok |
| `data-tour="basisvarer-in-shopping"` | Basisvarer under listen |

---

## 9. API-kontrakter (Madbudget)

Alle under `src/app/api/madbudget/` — auth via `Authorization: Bearer <supabase_jwt>` medmindre gæst.

| Endpoint | Metode | Formål |
|----------|--------|--------|
| `/api/madbudget/family-profile` | GET/PUT | Load/save familie + lunchbox |
| `/api/madbudget/meal-plan` | GET/POST | Ugeplaner (`user_meal_plans`) |
| `/api/madbudget/shopping-list-prices` | POST | Match ingredienser → produkter + priser |
| `/api/madbudget/pantry-items` | GET/POST | Køleskab/rester |
| `/api/madbudget/pantry-items/[id]` | PATCH/DELETE | |
| `/api/madbudget/shop-survey` | POST | Hvilken butik handlede de i |
| `/api/madbudget/shop-survey/status` | GET | |
| `/api/madbudget/share` | POST | Opret delingslink |
| `/api/madbudget/share/[token]` | GET | Public read plan |

**Basisvarer:** `family_basisvarer` via separate routes (load i `loadBasisvarer()` på page).

**Opskrifter:** `GET /api/recipes/[slug]` — bruges i gæst-demo og recipe-modal.

---

## 10. Database (relevant for FF)

| Tabel | Rolle |
|-------|--------|
| `family_profiles` | Familie + `lunchbox_config` (jsonb) |
| `family_basisvarer` | Basisvarer pr. bruger |
| `user_meal_plans` | `meal_plan_data`, `shopping_list`, snapshots, costs |
| `user_pantry_items` | Rester til næste generering |
| `product_ingredient_matches` | **Kritisk** for indkøbspriser |
| `products` + `product_offers` | Fooddata-katalog |
| `ingredients` | Same UUID som Planomo if shared DB |

---

## 11. Generering (logget ind)

**Motor:** `src/lib/meal-plan-system/generator.ts` → `generateOneWeekMealPlan(familyProfile, variationLevel)`.

**UI-progress (fake steps + rigtig generering):**

1. Match recipes  
2. Balance nutrition  
3. Find deals  
4. Check family factors  

Derefter: `buildShoppingListFromMadbudgetGrid()` → `shopping-list-prices` for valgte butikker.

**Gæst:** Steps vises ikke rigtigt — alert ved "Generer ny madplan".

---

## 12. FF implementerings-rækkefølge

### Fase A — Gæst-demo (ingen auth)

1. Port `guest-demo-data.ts` (eller del med Planomo via monorepo).  
2. Byg `/madbudget` page med `isGuest` branch.  
3. `loadGuestDemoMealPlan()` + `applyGuestDemoScaling()`.  
4. `GuestDemoBanner` + `GuestPageTour` + `data-tour` hooks.  
5. (Valgfrit) Wire `GuestGuidedTour` på banner **før** spotlight — `onApply` opdaterer familie.  
6. Bloker persist/generer med tydelig CTA "Opret gratis bruger".

### Fase B — Auth + persistence

7. `family_profiles` CRUD + autosave.  
8. `user_meal_plans` save/load per uge.  
9. Integrér `MealPlanGenerator` med samme `familyProfile` shape.  
10. `shopping-list-prices` med **opdaterede** `product_ingredient_matches` (fooddata-id).  

### Fase C — Differentiators

11. Madpakker (`lunchbox_config`).  
12. `LeftoversWizard` + pantry.  
13. Deling (`/madplan/[token]`).  
14. Shop survey.

---

## 13. Acceptkriterier (FF “færdig” når)

- [ ] Gæst ser **fyldt ugeplan** med 7 rigtige opskrift-navne/billeder (eller fallback).  
- [ ] Madpakker vises man–fre når børn > 0 og toggle er slået til.  
- [ ] Indkøbsliste med 5 kategorier + butikfaner + ~98 % coverage + tilbud-flags.  
- [ ] Basisvarer modal + sektion i bunden af indkøbsliste.  
- [ ] Familieindstillinger ændrer **skalerede** mængder live (gæst).  
- [ ] Guided tour (spotlight) gennemløber alle 10 trin uden broken selectors.  
- [ ] Logget ind: generer plan, gem, genberegn priser, del link.  
- [ ] Priser kommer fra rigtige matches (ikke hardcoded) for authenticated users.  

---

## 14. Filer i Planomo-repo (kopier-liste)

```
src/app/madbudget/page.tsx              # Hoved-UI (~5000 linjer)
src/lib/madbudget/guest-demo-data.ts    # Dummy spec — START HER
src/lib/madbudget/lunchbox-templates.ts
src/lib/madbudget/lunchbox-shopping.ts
src/lib/madbudget/leftovers.ts
src/lib/madbudget-stores.ts
src/lib/meal-plan-system/generator.ts
src/components/madbudget/GuestDemoBanner.tsx
src/components/madbudget/GuestPageTour.tsx
src/components/madbudget/GuestGuidedTour.tsx   # Onboarding wizard (wire up)
src/components/madbudget/LeftoversWizard.tsx
src/app/api/madbudget/** 
src/content/funktioner-landing.ts       # Marketing bullets
```

---

## 15. Kendte forskelle / gotchas

1. **Føtex slug:** UI-katalog `føtex`; fooddata/Planomo kan have `foetex`/`fotex` — pris-API har alias-liste.  
2. **GuestGuidedTour** er ikke mounted i Planomo endnu — FF kan være først med fuld “wizard først, tour bagefter” flow.  
3. **Gæst butikpriser** er beregnede — ikke DB. Kun logged-in bruger `shopping-list-prices`.  
4. **Ingrediens-matches** skal være fooddata `product_id` for at priser virker efter Goma-oprydning.  
5. **Marketing** nævner 12 kæder; demo-priser bruger 4 (REMA/Netto/Føtex/Bilka) — resten kan være “tilbud only” i katalog.

---

*Sidst opdateret: maj 2026 — baseret på Planomo `main` implementation.*
