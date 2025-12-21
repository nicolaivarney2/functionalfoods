# 🔍 Analyse: Konsekvenser af forkert kategori-struktur

## Hvad bruges hvor?

### mainCategory (Aftensmad, Frokost, osv.)
**Bruges til:**
- ✅ Filtrering på meal type i opskriftsoversigt (`/opskriftsoversigt`)
- ✅ Filtrering på kategori-sider (`/keto/opskrifter`, `/meal-prep/opskrifter`)
- ✅ Søgning (`src/lib/search.ts` - inkluderet i søgetekst)
- ✅ Visning af meal type i UI

**Konsekvenser hvis forkert:**
- ❌ Opskrifter vises ikke korrekt når brugere filtrerer på "Aftensmad", "Frokost", osv.
- ❌ Opskrifter kan forsvinde fra kategori-lister
- ❌ Søgning kan være mindre præcis

### dietaryCategories (Keto, Meal Prep, osv.)
**Bruges til:**
- ✅ Filtrering på dietary type (`/keto/opskrifter`, `/meal-prep/opskrifter`)
- ✅ Visning af tags på opskrifts-sider
- ✅ Søgning (inkluderet i søgetekst)
- ✅ Blog kategori-sider (viser opskrifter med matching dietary category)

**Konsekvenser hvis forkert:**
- ❌ Opskrifter vises ikke på de rigtige dietary kategori-sider
- ❌ Tags vises ikke korrekt på opskrifts-sider
- ❌ Filtrering på dietary type virker ikke

### subCategories
**Bruges til:**
- ⚠️ Kun i admin interface (publishing page)
- ❌ IKKE vist til brugere i frontend
- ❌ IKKE brugt til filtrering
- ❌ IKKE brugt til søgning

**Konsekvenser:**
- ✅ Ingen konsekvenser for brugere hvis subCategories er forkert
- ⚠️ Kan forvirre i admin interface hvis der er duplikater

## Konklusion

**KRITISK at fikse:**
- Hvis mainCategory er sat til dietary category (fx "Keto" i stedet for "Aftensmad")
  - Påvirker filtrering og visning
  - Brugere kan ikke finde opskrifter korrekt

**IKKE kritisk, men godt at rydde op:**
- subCategories med duplikater
  - Ingen konsekvenser for brugere
  - Kan forvirre i admin interface

**Anbefaling:**
1. Kør `check-category-misplacement.sql` for at se om der er problemer
2. Hvis der er opskrifter med dietary categories som mainCategory → kør `fix-category-misplacement.sql`
3. Kør `cleanup-subcategories.sql` for at rydde op (valgfrit, ingen konsekvenser)

