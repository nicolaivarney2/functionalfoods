# 🍽️ Madbudget - Kompleks Analyse & Implementeringsplan

## 📋 Nuværende Status

### ✅ Allerede Implementeret:
1. **Basic familieindstillinger:**
   - Antal voksne og børn
   - Børnenes aldre (4-8 år dropdown)
   - Økologi prioritet (ja/nej)
   - Animalsk økologi prioritet (ja/nej)
   - Dagligvarebutikker valg (checkbox liste)

2. **Systemer der findes:**
   - `product_ingredient_matches` tabel - matcher produkter med ingredienser
   - `FridaDTUMatcher` - matcher ingredienser med Frida ernæringsprofiler
   - `meal-plan-system/generator.ts` - genererer 6-ugers madplaner
   - `kombi-supplements.ts` - håndterer kombi-tags og supplements

3. **Mock data:**
   - Mock recipes med priser
   - Mock stores
   - Basic meal plan struktur

---

## ❌ Mangler & Skal Implementeres

### 1. **Vægttabsprofil pr. Voksen** (KRITISK)

**Nuværende:** Ingen vægttabsprofil for voksne

**Skal implementeres:**
- Modal/formular pr. voksen med 5 sider (ligesom wizard):
  
  **Side 1: Grundlæggende info**
  - Køn (mand/kvinde)
  - Alder (år)
  - Højde (cm)
  - Vægt (kg)
  - Aktivitetsniveau (lav/moderat/høj/meget høj)

  **Side 2: Kostretning**
  - Dropdown/radio: Keto, Sense, GLP-1, Anti-inflammatorisk, Fleksitarisk, 5:2, Meal prep, Sund familiemad

  **Side 3: Fødevarer at ekskludere**
  - Checkboxes: Rødt kød, Fjerkræ, Svinekød, Fisk, Æg, Skaldyr, Nødder, Mælkeprodukter, Gluten, Soja

  **Side 4: Måltider om dagen**
  - Checkboxes: Aftensmad (altid valgt), Morgenmad, Frokost

  **Side 5: Mål**
  - Radio: Ønsker at tabe sig, Ønsker at bibeholde vægt, Ønsker at tage på i vægt

**UI:** 
- Knap "Tilføj vægttabsprofil" ved hver voksen
- Modal med wizard-lignende flow (5 sider)
- Gem profil i `familyProfile.adultsProfiles[]`

---

### 2. **Ekskludering af Madvarer** (KRITISK)

**Nuværende:** `dislikedIngredients: ['oliven', 'fetaost']` - hardcoded

**Skal implementeres:**
- UI til at tilføje/fjerne ekskluderede ingredienser
- Dropdown/autocomplete med ingredienser fra systemet
- Gem i `familyProfile.excludedIngredients[]`
- Brug i madplan-generering til at filtrere opskrifter

**UI:**
- Sektion i familieindstillinger: "Madvarer vi ikke kan lide"
- Input med autocomplete (hent fra `/api/ingredients`)
- Liste med tags (kan fjernes med X)
- Gem automatisk når modal lukkes

---

### 3. **Kombi-Tag Håndtering i Madplan** (KRITISK)

**Nuværende:** Kombi-tags findes, men bruges ikke i madplan-generering

**Skal implementeres:**
- Tjek om familie har både keto-voksne OG børn
- Hvis ja: Prioriter opskrifter med "Kombi-familiemad" eller "Kombi-keto" tags
- Tilføj automatisk supplements til indkøbsliste (se `kombi-supplements.ts`)
- Vis tydeligt i madplanen hvilke retter der er kombi-egnede

**Logik:**
```typescript
// Pseudokode
const hasKetoAdults = adultsProfiles.some(p => p.dietaryApproach === 'keto')
const hasChildren = children > 0

if (hasKetoAdults && hasChildren) {
  // Prioriter kombi-opskrifter
  // Tilføj supplements automatisk
}
```

---

### 4. **Kalorieberegning** (VIKTIGT)

**Nuværende:** Kalorier beregnes ikke (eller delvist via Frida)

**Skal implementeres:**
- Brug `FridaDTUMatcher` til at matche ingredienser
- Beregn kalorier pr. opskrift baseret på ingredienser
- Beregn total kalorier pr. dag for hver person
- Sammenlign med mål (tabe sig/bibeholde/tage på)

**Note:** Du sagde "lige nu er intet kalorieberegnet, så det skal du ikke tage med i udregningen" - men systemet findes allerede! Vi kan aktivere det.

---

### 5. **Tilbud-Integration** (KRITISK)

**Nuværende:** Mock data med priser

**Skal implementeres:**
- Hent aktuelle tilbud fra valgte dagligvarebutikker
- Match tilbud med ingredienser i opskrifter
- Prioriter opskrifter med mange tilbuds-ingredienser
- Vis besparelser tydeligt i madplanen

**Data flow:**
1. Hent tilbud fra `supermarket_products` (filtrer på `is_on_sale = true` og valgte butikker)
2. Match tilbud med ingredienser via `product_ingredient_matches`
3. Score opskrifter baseret på antal tilbuds-ingredienser
4. Vælg opskrifter med højeste score

---

### 6. **Indkøbsliste med Priser** (KRITISK)

**Nuværende:** Mock indkøbsliste

**Skal implementeres:**
- Aggreger alle ingredienser fra madplanen
- Match ingredienser med produkter (via `product_ingredient_matches`)
- Find bedste pris fra valgte butikker
- Gruppér efter kategori (protein, grøntsager, etc.)
- Vis total pris og besparelser
- Inkludér kombi-supplements med priser

**Struktur:**
```typescript
interface ShoppingListItem {
  ingredientName: string
  totalAmount: number
  unit: string
  products: Array<{
    name: string
    store: string
    price: number
    originalPrice?: number
    isOnSale: boolean
  }>
  bestPrice: number
  savings: number
  isSupplement?: boolean
  supplementReason?: string
}
```

---

### 7. **Portioner & Servings** (KRITISK)

**Nuværende:** Opskrifter har `servings: 4` - hardcoded

**Skal implementeres:**
- Beregn nødvendige portioner baseret på:
  - Antal voksne
  - Antal børn
  - Børnenes aldre (små børn spiser mindre)
- Skalér ingrediensmængder op/ned
- Skalér priser tilsvarende

**Formel:**
```typescript
const totalServings = adults + children * (childrenAge < 4 ? 0.5 : childrenAge < 8 ? 0.75 : 1)
const scaleFactor = totalServings / recipe.servings
```

---

### 8. **Loading Screen** (VIKTIGT)

**Nuværende:** Ingen loading state

**Skal implementeres:**
- Loading modal når madplan genereres
- Progress indicator (fx "Henter tilbud...", "Matcher ingredienser...", "Genererer madplan...")
- Estimeret tid: 30+ sekunder
- Cancel-knap (hvis muligt)

---

### 9. **Filtrering af Dagligvarebutikker** (VIKTIGT)

**Nuværende:** Alle butikker hentes

**Skal implementeres:**
- Filtrer `supermarket_products` på kun valgte butikker
- Dette reducerer data-mængden betydeligt
- Hurtigere queries

**SQL:**
```sql
WHERE store IN ('REMA 1000', 'Netto', ...) -- kun valgte butikker
```

---

### 10. **Match Dagligvarer ↔ Ingredienser** (PÅKRÆVET)

**Nuværende:** Systemet findes (`product_ingredient_matches`), men skal bruges aktivt

**Skal implementeres:**
- Brug eksisterende matches fra databasen
- Hvis match mangler, brug AI matching (se `/api/admin/ai-match-products`)
- Cache matches for hurtigere queries

---

### 11. **Match Ingredienser ↔ Frida** (PÅKRÆVET)

**Nuværende:** `FridaDTUMatcher` findes og bruges delvist

**Skal implementeres:**
- Match alle ingredienser i opskrifter med Frida
- Cache matches for at undgå gentagne API-kald
- Brug til kalorieberegning

---

## 🎯 Prioriteteret Implementeringsplan

### Fase 1: Grundlæggende Struktur (KRITISK)
1. ✅ Vægttabsprofil pr. voksen (wizard-modal)
2. ✅ Ekskludering af madvarer UI
3. ✅ Opdater `familyProfile` struktur

### Fase 2: Madplan Generering (KRITISK)
4. ✅ Kombi-tag håndtering
5. ✅ Portioner beregning
6. ✅ Filtrering baseret på ekskluderede ingredienser
7. ✅ Filtrering baseret på voksnes kostretninger

### Fase 3: Priser & Tilbud (KRITISK)
8. ✅ Hent tilbud fra valgte butikker
9. ✅ Match tilbud med ingredienser
10. ✅ Score opskrifter baseret på tilbud
11. ✅ Indkøbsliste med priser

### Fase 4: Supplements & Kombi (VIKTIGT)
12. ✅ Tilføj kombi-supplements automatisk
13. ✅ Vis supplements i indkøbsliste med forklaringer

### Fase 5: Kalorier (KAN VENTE)
14. ⏸️ Kalorieberegning (hvis ønsket)
15. ⏸️ Sammenligning med mål

### Fase 6: UX Forbedringer (NICE TO HAVE)
16. ⏸️ Loading screen med progress
17. ⏸️ Error handling
18. ⏸️ Cache optimering

---

## 🔍 Ting Du Har Misset (Som Jeg Har Fundet)

### 1. **Børnenes Aldre → Opskrift Valg**
- Små børn (0-3 år): Prioriter Familiemad (ikke kombi)
- Store børn (4-8 år): Kan spise kombi-opskrifter
- Teenagere (9+ år): Kan spise næsten alt

**Logik:**
```typescript
const hasSmallChildren = childrenAges.some(age => age === '0-3')
if (hasSmallChildren) {
  // Prioriter Familiemad (ikke kombi)
} else {
  // Kan bruge kombi-opskrifter
}
```

### 2. **Flere Voksne med Forskellige Kostretninger**
- Hvad hvis 1 voksen er Keto og 1 er Sense?
- Skal vi lave separate madplaner eller finde fælles opskrifter?

**Forslag:** 
- Prioriter opskrifter der matcher FLESTE voksnes behov
- Eller: Lav separate portioner (komplekst!)

### 3. **Aktivitetsniveau → Kaloriebehov**
- Høj aktivitet = flere kalorier
- Skal portionerne justeres?

### 4. **Mål (tabe sig/bibeholde/tage på) → Kaloriejustering**
- Tabe sig: -500 kalorier/dag
- Bibeholde: Normal kalorier
- Tage på: +500 kalorier/dag

### 5. **Økologi Prioritering → Produkt Valg**
- Hvis økologi prioriteres: Vælg økologiske produkter (hvis tilgængelige)
- Dette påvirker priser!

### 6. **Basisvarer**
- Du har allerede et basisvarer-system
- Skal basisvarer ekskluderes fra indkøbslisten? (fordi man allerede har dem)

### 7. **Ingrediens Overlap mellem Retter**
- Hvis 2 retter bruger samme ingrediens, kan man købe større pakker
- Dette sparer penge!

### 8. **Variation**
- Undgå samme ret flere dage i træk
- Undgå samme kategori flere dage i træk (fx kylling 3 dage i træk)

### 9. **Tilberedningstid**
- Nogle familier har mere tid end andre
- Skal vi filtrere på prepTime/cookTime?

### 10. **Allergier vs. Ekskludering**
- Allergier = MUST ekskluder (livsfare)
- Ekskludering = PREFERENCE (kan undgås)
- Skal vi skelne mellem dem?

---

## 💡 Anbefalinger

### 1. **Start Simpelt**
- Først: Kun aftensmad (som du sagde)
- Først: Kun 1 kostretning pr. familie (fx alle voksne er Keto)
- Først: Ingen kalorieberegning (tilføj senere)

### 2. **Caching er Kritisk**
- Cache produkt-ingrediens matches
- Cache Frida matches
- Cache tilbud (opdater dagligt)

### 3. **Progressive Enhancement**
- Start med mock data
- Tilføj rigtige data gradvist
- Test hver komponent isoleret

### 4. **Error Handling**
- Hvad hvis ingen opskrifter matcher?
- Hvad hvis ingen tilbud findes?
- Hvad hvis priser mangler?

### 5. **Performance**
- 30+ sekunder er lang tid
- Overvej at generere madplanen i baggrunden
- Send notifikation når klar
- Eller: Generer kun 3-4 dage først, resten senere

---

## 🚀 Næste Skridt

1. **Diskuter prioriteter** - Hvad er vigtigst først?
2. **Design vægttabsprofil UI** - Skal det være modal eller side?
3. **Implementer basic struktur** - Vægttabsprofil + ekskludering
4. **Test madplan generering** - Med mock data først
5. **Tilføj rigtige data** - Gradvist

---

## 📝 Noter

- Kombi-tags systemet er allerede implementeret ✅
- Frida matching findes allerede ✅
- Product-ingrediens matching findes allerede ✅
- Meal plan generator findes allerede (men til 6 uger, ikke 1 uge)

**Spørgsmål:**
- Skal vi bruge den eksisterende 6-ugers generator eller lave en ny 1-ugers?
- Skal kalorieberegning være aktiv fra start eller kan det vente?
- Hvordan håndterer vi flere voksne med forskellige kostretninger?

