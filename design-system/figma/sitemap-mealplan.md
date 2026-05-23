# Sitemap — Madplan + Opskrifter

Første prioritet i Figma-designet. Kernen i app-oplevelsen.

## Overordnet app-navigation

```mermaid
flowchart TD
    splash[Splash / Auth gate]
    splash --> onboarding{F\u00f8rste gang?}
    onboarding -->|Ja| wizard[Onboarding wizard]
    onboarding -->|Nej| main
    wizard --> main

    main[Main app - BottomNav]
    main --> tabHome[Tab: Hjem]
    main --> tabMealplan[Tab: Madplan]
    main --> tabRecipes[Tab: Opskrifter]
    main --> tabShopping[Tab: Indk\u00f8b]
    main --> tabProfile[Tab: Profil]
```

## Madplan-flow

```mermaid
flowchart TD
    tabMealplan[Tab: Madplan]
    tabMealplan --> weekView[Uge-view - 7 DayCards horizontal scroll]
    weekView --> dayDetail[Dag detail - 4 m\u00e5ltider list]
    weekView --> weekActions{Action}
    weekActions -->|Gener\u00e9r| genSheet[Gener\u00e9r madplan sheet]
    weekActions -->|Skift uge| weekPicker[Uge-picker sheet]
    weekActions -->|Indstillinger| settings[Madplan settings]

    dayDetail --> mealSlot[Tryk p\u00e5 MealSlot]
    mealSlot -->|Tom slot| addRecipe[Tilf\u00f8j opskrift sheet]
    mealSlot -->|Udfyldt slot| recipeDetail[Opskrift detail]

    addRecipe --> recipeSearch[Search/browse opskrifter]
    addRecipe --> manualMeal[Manuel m\u00e5ltid - ikke opskrift]
    recipeSearch --> recipeDetail

    genSheet --> confirmReplace{Erstat eksisterende?}
    confirmReplace -->|Ja| weekView
    confirmReplace -->|Nej| weekView
```

## Opskrifter-flow

```mermaid
flowchart TD
    tabRecipes[Tab: Opskrifter]
    tabRecipes --> browse[Browse - grid 2-col]
    browse --> searchBar[Tap search bar]
    browse --> chipFilter[Tap dietary chip]
    browse --> fabFilter[Tap Filter FAB]
    browse --> cardTap[Tap RecipeCard]

    searchBar --> searchScreen[Search screen med history]
    searchScreen --> searchResults[Resultater - samme grid]
    searchResults --> cardTap

    chipFilter --> filteredBrowse[Browse filtreret]
    filteredBrowse --> cardTap

    fabFilter --> filterSheet[Filter bottom sheet]
    filterSheet --> applyFilter[Apply -> filteredBrowse]
    filterSheet --> resetFilter[Reset -> browse]

    cardTap --> recipeDetail[Opskrift detail screen]
```

## Opskrift detail-flow

Hjertet i appen. Her bruger brugeren mest tid.

```mermaid
flowchart TD
    recipeDetail[Opskrift detail screen]
    recipeDetail --> tabIngredients[Tab: Ingredienser]
    recipeDetail --> tabSteps[Tab: Tilberedning]
    recipeDetail --> tabNutrition[Tab: N\u00e6ring]

    recipeDetail --> servingsAdjust[Justering: portioner]
    servingsAdjust --> recalc[Genberegn ingredienser]

    recipeDetail --> heartAction[Favorit toggle]
    recipeDetail --> shareAction[Del]
    recipeDetail --> addToMealplan[Tilf\u00f8j til madplan]
    recipeDetail --> addAllToShopping[Tilf\u00f8j alle ingredienser til indk\u00f8b]

    tabIngredients --> ingredientRow[Tap IngredientRow]
    ingredientRow --> addOneToShopping[Tilf\u00f8j enkelt til indk\u00f8b]

    tabSteps --> stepCard[Swipeable step cards]
    stepCard --> startTimer[Start timer p\u00e5 step]
    startTimer --> activeTimer[Floating timer pill]

    addToMealplan --> mealplanPicker[V\u00e6lg dag + m\u00e5ltid]
    mealplanPicker --> backToRecipe[Tilbage til opskrift]
```

## Skærme der skal designes (i rækkefølge)

Når du har lavet atoms og molecules, designer du disse skærme i denne rækkefølge:

1. **RecipeBrowseScreen** — det første en bruger ser når de tapper Opskrifter-tab
2. **RecipeDetailScreen** — vigtigste skærm, definerer det visuelle sprog
3. **RecipeDetailScreen / Steps tab** — swipeable step cards (designvalg her sætter standarden)
4. **RecipeFilterSheet** — bottom sheet med dietary chips, time, servings
5. **MealPlanWeekScreen** — uge-view med horizontal day cards
6. **MealPlanDayScreen / detail** — 4 meal slots + dagens næring
7. **AddRecipeToMealPlanSheet** — vælg dag + måltid
8. **ShoppingListScreen** — grouped by kategori, swipe-to-delete
9. **ServingsAdjustSheet** — stepper med live-genberegning
10. **ActiveTimerPill** — floating bottom-anchored timer
11. **EmptyState varianter** — én for tomme madplaner, tomme indkøbslister, ingen søgeresultater

## Eksplicit IKKE i første runde

- Profil / settings (kommer i fase 2)
- Onboarding wizard (kommer i fase 2)
- Hjem-tab (defineres senere — er det dashboard? Quick-actions? Feed?)
- Vægttracker / kalorietælling (separate flows, fase 3)
- Push notifications design
- Dark mode
- Tablet-layouts

## Vigtige designvalg du møder undervejs

Skriv din løsning ned i Figma-filens "02 — Changelog"-side når du træffer disse beslutninger:

1. **Step-by-step layout**: Horizontal swipeable cards (anbefalet — føles app-native) eller scroll-down list?
2. **Ingredient tap-action**: Direkte tilføj til indkøb, eller åbn detail sheet med substitutter?
3. **Servings adjuster placement**: Inline øverst i ingredients-tab eller sticky bottom-anchored?
4. **Timer behaviour**: Floating pill der følger bruger på tværs af skærme, eller modal der låser brugeren til opskriften?
5. **Day-view i madplan**: Vertikal list (4 meals stacked) eller horizontal pager (swipe mellem måltider)?
6. **Filter sheet height**: Compact (40%), half (50%) eller large (80%)?
