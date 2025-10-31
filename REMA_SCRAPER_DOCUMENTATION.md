# REMA 1000 Scraper Documentation

## 🚨 KRITISK: Læs denne dokumentation FØR du laver ændringer!

### Hvad virker og hvad virker IKKE

#### ✅ VIRKER - Brug disse endpoints:

1. **`/api/admin/dagligvarer/batch-scrape`** - HOVEDENDPOINTET
   - Scraper 100 produkter ad gangen
   - Undgår Vercel 10-sekunders timeout
   - Kan køre mange batches i træk
   - **BRUG DETTE TIL ALT SCRAPING!**

2. **Frontend Batch Scraper** (Admin Dashboard)
   - Knap i admin dashboard der kører batch scraper automatisk
   - Håndterer alle 3700+ produkter
   - Viser progress og statistik
   - **BRUG DETTE TIL FULD SCRAPING!**

3. **`/api/admin/dagligvarer/delete-all-rema`**
   - Sletter alle REMA produkter fra databasen
   - Brug før fuld rescrape

4. **`/api/admin/dagligvarer/check-store-branding`**
   - Tjekker hvor mange produkter har korrekt branding
   - Viser status for 'rema1000' vs 'REMA 1000'

#### ❌ VIRKER IKKE - Brug IKKE disse:

1. **`/api/admin/dagligvarer/full-scrape`** - BRUG IKKE!
   - Timeout efter 10 sekunder
   - Kan kun scrape ~300 produkter
   - **ALDRIG BRUG DETTE ENDPOINT!**

2. **`/api/admin/dagligvarer/auto-batch-scrape`** - BRUG IKKE!
   - Kører på Vercel og har også timeout
   - Returnerer 0 produkter
   - **ALDRIG BRUG DETTE ENDPOINT!**

### Korrekt workflow for REMA scraping

#### 1. Fuld rescrape (alle produkter):
```javascript
// 1. Slet alle REMA produkter først
fetch('/api/admin/dagligvarer/delete-all-rema', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})

// 2. Brug frontend batch scraper knappen i admin dashboard
// Gå til /admin og klik på "REMA Batch Scraper" knappen
```

#### 2. Enkelt batch scrape:
```javascript
fetch('/api/admin/dagligvarer/batch-scrape?page=1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
```

#### 3. Tjek store branding status:
```javascript
fetch('/api/admin/dagligvarer/check-store-branding')
.then(response => response.json())
.then(data => console.log('Store branding status:', data))
```

### Vigtige tekniske detaljer

#### REMA API struktur:
- **URL**: `https://api.digital.rema1000.dk/api/v3`
- **Departments**: `/departments` - henter alle afdelinger
- **Products**: `/departments/{id}/products?page={page}&limit=100`
- **Pagination**: Hver side har 100 produkter

#### Pris struktur:
```javascript
// REMA har 2 priser i array:
product.prices[0] // Campaign price (tilbud)
product.prices[1] // Regular price (normal pris)

// Hvis is_campaign = true, brug campaign price som current_price
// og regular price som original_price
```

#### Database struktur:
```javascript
// Korrekt external_id format:
external_id: `python-${product.id}`

// Korrekt store branding:
store: 'REMA 1000' // IKKE 'rema1000'

// Pris felter:
price: currentPrice,           // Aktuel pris
original_price: originalPrice, // Original pris (for tilbud)
is_on_sale: onSale,           // Boolean for tilbud
```

### Fejlfinding

#### Problem: Kun få produkter scrapet
- **Årsag**: Brugt full-scrape i stedet for batch-scrape
- **Løsning**: Brug batch-scrape eller frontend knappen

#### Problem: Timeout fejl
- **Årsag**: Vercel 10-sekunders limit
- **Løsning**: Brug batch-scrape (100 produkter ad gangen)

#### Problem: Forkert store branding
- **Årsag**: Gamle produkter har 'rema1000' i stedet for 'REMA 1000'
- **Løsning**: Brug `/api/admin/dagligvarer/fix-store-branding`

#### Problem: Manglende produkter
- **Årsag**: Cleanup processer har slettet for mange
- **Løsning**: Fuld rescrape med delete-all-rema + batch scraper

### Maintenance endpoints

#### Discontinued products:
- **`/api/admin/dagligvarer/handle-discontinued`**
- Skjuler produkter der ikke længere findes i REMA API
- Bevarer historik hvis andre butikker har produktet

#### Missing original prices:
- **`/api/admin/dagligvarer/fix-missing-original-prices`**
- Fixer produkter der er markeret som tilbud men mangler original_price

#### Duplicate cleanup:
- **`/api/admin/dagligvarer/cleanup-duplicates`**
- Fjerner duplikate produkter baseret på external_id

### Vercel deployment notes

- **Timeout**: 10 sekunder for serverless functions
- **Batch size**: Max 100 produkter per batch
- **Delay**: 1 sekund mellem batches for at undgå rate limiting
- **Environment**: Brug `NEXT_PUBLIC_VERCEL_URL` for API calls

### Test procedure

1. **Tjek antal produkter**:
   ```javascript
   fetch('/api/admin/dagligvarer/check-store-branding')
   ```

2. **Test enkelt batch**:
   ```javascript
   fetch('/api/admin/dagligvarer/batch-scrape?page=1', { method: 'POST' })
   ```

3. **Fuld test**:
   - Gå til `/admin`
   - Klik "REMA Batch Scraper"
   - Vent på completion
   - Tjek resultat

### Historik af fejl

#### 2024-09-04:
- **Problem**: Full-scrape timeout efter 10 sekunder
- **Løsning**: Lavet batch-scrape med 100 produkter per batch
- **Resultat**: Kan nu scrape alle 3700+ produkter

#### 2024-09-04:
- **Problem**: Auto-batch-scrape returnerede 0 produkter
- **Løsning**: Lavet frontend batch scraper i admin dashboard
- **Resultat**: Fungerer perfekt med progress tracking

#### 2024-09-04:
- **Problem**: Store branding inkonsistent ('rema1000' vs 'REMA 1000')
- **Løsning**: Lavet fix-store-branding endpoint
- **Resultat**: Alle produkter har nu korrekt branding

#### 2024-09-04:
- **Problem**: Nogle produkter mangler original_price (compare price) selvom de er på tilbud
- **Status**: KENDT FEJL - ikke fixet
- **Løsning**: `/api/admin/dagligvarer/fix-missing-original-prices` endpoint findes
- **Note**: Brugeren har valgt at lade det være som det er

---

## 🚨 HUSK: Læs denne dokumentation FØR du laver ændringer!

**Hvis du glemmer at læse denne dokumentation og laver fejl igen, så er det din egen skyld!**
