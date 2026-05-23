# Komponent-inventar

Prioriteret liste over komponenter der skal designes i Figma og senere implementeres i React Native. Listen er sorteret efter rækkefølge — start fra toppen.

Hver komponent har et **kode-navn** der skal matche 1:1 med Figma-komponentens navn for at Code Connect senere kan auto-mappe.

---

## Fase 1: Atoms (uge 1 i Figma)

Foundationen. Uden disse kan ingen skærm bygges konsistent.

### Button
**Variants**: `primary` / `secondary` / `tertiary` / `danger` × `sm` / `md` / `lg` × `default` / `pressed` / `disabled` / `loading`
**Props**: `icon-left`, `icon-right`, `full-width`
**Web ref**: `.btn-primary` etc. i [src/app/globals.css](../src/app/globals.css)
**Touch target**: min 44pt
**Radius**: `lg` (12px)

### IconButton
**Variants**: `default` / `ghost` / `filled` × `sm` (32) / `md` (40) / `lg` (44)
**Props**: `icon` (slot)
**Brug**: Header actions, list-row trailing actions

### Input
**Variants**: `default` / `focused` / `error` / `disabled` / `with-icon-left` / `with-icon-right` / `with-action`
**Props**: `label`, `placeholder`, `helper-text`, `error-text`
**Touch target**: min 44pt
**Radius**: `md` (8px)

### Textarea
**Variants**: `default` / `focused` / `error` / `disabled`
**Min height**: 88pt (4 lines)

### Select / Picker trigger
**Variants**: `default` / `open` / `disabled`
**Note**: Selve valg-sheeten er en separat `SelectSheet` organism

### Checkbox / Radio / Switch
**Variants**: `unchecked` / `checked` / `disabled`
**Touch target**: min 44pt (selv om visuel boks er 20pt)

### Chip
**Variants**: `default` / `selected` / `disabled` × `sm` / `md`
**Props**: `icon`, `count`, `removable`
**Web ref**: `.chip`
**Brug**: Filter, kost-tags, kategorier
**Radius**: `full`

### Badge
**Variants**: `default` / `success` / `warning` / `danger` / `info` / `brand`
**Brug**: Notification count, "Ny", "Tilbud"
**Radius**: `sm` eller `full`

### Tag (dietary)
**Variants**: én per dietary token (`keto`, `paleo`, `antiInflammatory`, `flexitarian`, `proteinRich`, `fiveTwo`, `glp1`, `sense`, `weightLoss`, `calorieCounting`)
**Web ref**: brugt i [src/components/RecipeCard.tsx](../src/components/RecipeCard.tsx) for `validCategories`

### Avatar
**Variants**: `xs` (24) / `sm` (32) / `md` (40) / `lg` (56) / `xl` (80)
**States**: `image` / `initials` / `placeholder`

### Icon
**Brug**: Wrapper. Vi bruger [lucide-react](https://lucide.dev/) — design Figma-ikoner så de matcher Lucide's 24×24 stroke-style
**Sizes**: 16, 20, 24, 32

### Divider
**Variants**: `horizontal` / `vertical` × `subtle` (neutral-100) / `default` (neutral-200) / `strong` (neutral-300)

### Skeleton
**Variants**: `line` / `circle` / `rect`
**Brug**: Loading-states

### Spinner
**Variants**: `sm` (16) / `md` (24) / `lg` (32)
**Brug**: Inline loading, button loading state

---

## Fase 2: Molecules (uge 2 i Figma)

Atoms kombineret til genbrugelige byggeklodser.

### ListRow
**Variants**: med/uden `leading-icon`, `leading-avatar`, `trailing-chevron`, `trailing-toggle`, `trailing-value`, `divider`
**Touch target**: hele rækken min 56pt høj
**Brug**: Settings, ingredients list, alle navigation lister

### MealSlot
**Variants**: `empty` / `filled` × `breakfast` / `lunch` / `dinner` / `snack`
**Props**: meal name, image thumb, time-of-day icon
**Brug**: Madplan dag-view

### DayCard
**Indeholder**: 4× MealSlot + dag-label + dato
**Variants**: `today` / `past` / `future`
**Brug**: Madplan uge-view

### RecipeCard
**Variants**: `default` / `compact` / `featured` / `horizontal`
**Web ref**: [src/components/RecipeCard.tsx](../src/components/RecipeCard.tsx)
**Indeholder**: image (4:3), title, shortDescription, time, servings, dietary-tags
**Radius**: `2xl` (24px)

### IngredientRow
**Variants**: `default` / `checked` / `swiped`
**Props**: amount, unit, name, image-thumb (optional), trailing add-to-shopping action
**Brug**: Opskrift detail + indkøbsliste

### StepRow / InstructionCard
**Variants**: `default` / `active` / `completed`
**Props**: step number, image (optional), title, body, timer (optional)
**Brug**: Opskrift step-by-step view (swipeable horizontal)

### NutritionFactsRow
**Web ref**: [src/components/NutritionFactsBox.tsx](../src/components/NutritionFactsBox.tsx)
**Props**: nutrient name, value, daily%, color-coding

### TabBarItem
**Variants**: `default` / `selected` × ikon + label
**Touch target**: full bar-height (49pt)

### AppBarTitle / AppBarAction
**Slots**: back, title, action-left, action-right

### SheetHandle
**Brug**: Drag-handle i toppen af bottom sheets (32×4 rounded-full neutral-300)

### EmptyState
**Variants**: `no-data` / `error` / `search-empty` / `coming-soon`
**Indeholder**: icon, title, body, optional CTA

### ServingsStepper
**Variants**: standard `- N +` med min/max
**Touch target**: hver knap 44pt

### Rating display
**Variants**: 5-star × `sm` / `md` / `lg`, `with-count`

### Search bar
**Variants**: `default` / `focused` / `with-value`
**Props**: placeholder, clear-button, leading-icon

---

## Fase 3: Organisms / screens (uge 3 i Figma)

Komplette sektioner og skærme.

### AppHeader (mobile)
**Mapper til**: simplified mobile variant af [src/components/Header.tsx](../src/components/Header.tsx)
**Variants**: `default` / `with-back` / `large-title` / `transparent`
**Height**: 44pt + safe-area-top

### BottomNav
**5 tabs**: Hjem / Madplan / Opskrifter / Indkøb / Profil
**Height**: 49pt + safe-area-bottom
**Variants**: `default` / `with-fab` (Floating Action Button overlay)

### RecipeFilterSheet
**Indeholder**: dietary chips, time slider, servings range, kategori list, apply/reset buttons
**Variants**: `default` / `with-results-count`

### RecipeDetailScreen
**Sections**:
- Hero image (16:9, parallax scroll)
- Title + meta (time, servings, rating)
- Dietary tags
- ServingsStepper
- Tabs: Ingredienser / Tilberedning / Næring
- Ingredients list (IngredientRow's)
- Instructions (StepRow's - swipeable)
- Nutrition facts (NutritionFactsRow's)
- Related recipes (RecipeCard horizontal)
- Floating action: "Tilføj til madplan" + "Tilføj til indkøb"

### MealPlanWeekScreen
**Sections**:
- AppHeader med uge-vælger
- Horizontal scroll: 7× DayCard
- Below: list of today's meals (MealSlot expanded)
- FAB: "Generér madplan" / "Tilføj måltid"

### RecipeBrowseScreen
**Sections**:
- AppHeader med search-trigger
- Horizontal chips: hurtigt-filter på dietary
- Grid: 2-kolonne RecipeCard
- Sticky bottom: "Filter (3)" knap → åbner RecipeFilterSheet

### ShoppingListScreen
**Sections**:
- AppHeader med "Ryd købte" action
- Section list grouped by kategori (frugt, kød, mejeri...)
- IngredientRow med checkbox + swipe-to-delete
- Bottom: total estimeret pris

### OnboardingWizard
**Web ref**: [src/components/wizard/](../src/components/wizard/) + [src/app/wizard/](../src/app/wizard/)
**Screens**: 5-7 step flow med progress indicator
- Step 1: Velkomst
- Step 2: Kost-præferencer (multi-select chips)
- Step 3: Mål (vægttab, vedligehold, opbygning)
- Step 4: Allergier
- Step 5: Husstand størrelse + budget
- Step 6: Konto / login
- Step 7: Done + næste skridt

### Profile / Settings screen

---

## Fase 4: Templates & utilities

### BottomSheet (template)
**Variants**: `compact` (40% screen) / `half` (50%) / `large` (80%) / `full`
**Radius**: top corners `3xl` (32px)
**Drag handle**: SheetHandle øverst

### Modal (full-screen)
**Brug**: Sjældent. Til opgaver der kræver fuld opmærksomhed (fx ny opskrift, betalingsflow)

### Toast / Snackbar
**Variants**: `success` / `error` / `info`
**Position**: Top-anchored med safe-area-top respekt
**Duration**: 3000ms standard

### LoadingScreen
**Variants**: `splash` / `inline` / `overlay`

---

## Naming-konvention for Figma

Brug `PascalCase` og match præcis koden:

| Figma component name | Maps to React component |
|---|---|
| `Button` | `<Button variant="..." size="..." />` |
| `Button / Primary / md / default` | Specific variant |
| `RecipeCard` | `<RecipeCard recipe={...} />` |
| `RecipeCard / Compact` | Variant prop |
| `BottomNav` | `<BottomNav active="..." />` |
| `AppHeader / WithBack` | Variant prop |

Code Connect kan så automatisk pege Figma-komponentnavnet på den faktiske React-komponent — se [figma/SETUP.md](./figma/SETUP.md).

---

## Hvad der bevidst ER UDELADT i fase 1-3

- Admin-skærme (intern, ikke kunde-facing app)
- Blog-system (web-only feature)
- Comment system (overvejes til senere)
- Reddit-integration (web-only)
- Email/marketing materialer

App'en er fokuseret på **madplan + opskrifter + indkøb + vægttracker + profil**. Web'en beholder admin og content-marketing.
