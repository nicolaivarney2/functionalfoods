# 🛒 Supermarket Scraper System

Et automatiseret system til at hente produktdata og priser fra danske supermarkeder via deres webshop APIs.

## 🎯 Funktioner

- **REMA 1000 Scraper**: Henter alle madvarer fra REMA's API
- **Automatisk prisopdatering**: Tjekker priser hver nat
- **Kategori-organisering**: Organiserer produkter i madkategorier
- **Tilbuds-tracking**: Registrerer når varer er på tilbud
- **Admin interface**: Web-baseret kontrolpanel til scraper management

## 🏗️ Systemarkitektur

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   REMA 1000    │    │   Scraper API    │    │   Admin Panel   │
│   Webshop API  │───▶│   (Next.js)      │───▶│   (React)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Database       │
                       │   (Supabase)     │
                       └──────────────────┘
```

## 🚀 Hurtig Start

### 1. Test Scraperen

```bash
# Test REMA 1000 scraper
curl -X GET "http://localhost:3000/api/supermarket/test-rema"

# Hent alle produkter
curl -X POST "http://localhost:3000/api/supermarket/test-rema" \
  -H "Content-Type: application/json" \
  -d '{"action":"fetchAllProducts"}'
```

### 2. Scrape og Gem Produkter

```bash
# Scrape alle produkter fra REMA 1000
curl -X POST "http://localhost:3000/api/supermarket/store-products" \
  -H "Content-Type: application/json"
```

### 3. Åbn Admin Panel

Gå til `/admin/supermarket-scraper` i din browser for at:
- Teste scraperen
- Se statistikker
- Starte/stoppe automatisk scraping
- Overvåge proces

## 📊 Hvad Scraperen Henter

### Produktinformation
- **Navn og beskrivelse**: Komplet produktbeskrivelse
- **Priser**: Nuværende pris og original pris
- **Tilbud**: Om varen er på tilbud og tilbuds-slutdato
- **Kategorier**: Frugt & grønt, Kød & fisk, Køl, Frost, etc.
- **Billeder**: Produktbilleder i forskellige størrelser
- **Næringsinfo**: Kalorier, protein, fedt, etc.
- **Labels**: Økologi, MSC, Nøglehul, etc.

### Kategorier
- 🍎 **Frugt & grønt** (ID: 20)
- 🥩 **Kød, fisk & fjerkræ** (ID: 30)
- 🧀 **Køl** (ID: 40)
- 🧀 **Ost m.v.** (ID: 50)
- ❄️ **Frost** (ID: 60)
- 🥛 **Mejeri** (ID: 70)
- 🥫 **Kolonial** (ID: 80)

## 🔧 Teknisk Implementation

### REMA 1000 API Endpoints

```typescript
// Hent produkt detaljer
GET https://api.digital.rema1000.dk/api/v3/products/{id}?include=declaration,nutrition_info,declaration,warnings,gpsr,department

// Eksempel produkter
- ØKO. BANANER FAIRTRADE (ID: 304020)
- LAKSEFILETER (ID: 440065)
- BACON I SKIVER (ID: 410873)
```

### Scraper Discovery Metode

Siden REMA ikke har et direkte endpoint til at liste alle produkter, bruger scraperen en "discovery" tilgang:

1. **Kendte produkter**: Bruger forud-definerede produkt IDs
2. **Sequential scanning**: Tester IDs omkring kendte produkter
3. **Respektfuld rate limiting**: 1 sekund mellem requests
4. **Fejlhåndtering**: Ignorerer 404 responses under discovery

### Data Transformation

```typescript
interface SupermarketProduct {
  id: string                    // "rema-304020"
  name: string                  // "ØKO. BANANER FAIRTRADE"
  category: string             // "Frugt & grønt"
  price: number                // 10
  originalPrice: number        // 10
  isOnSale: boolean           // false
  saleEndDate: string | null  // null
  unit: string                // "bdt"
  unitPrice: number           // 10
  imageUrl: string | null     // "https://..."
  nutritionInfo: Record<string, string>
  labels: string[]            // ["Økologi", "Fairtrade"]
}
```

## 📁 Filstruktur

```
src/
├── lib/supermarket-scraper/
│   ├── types.ts              # TypeScript interfaces
│   ├── rema1000-scraper.ts   # REMA 1000 implementation
│   ├── database-service.ts   # Database operations
│   └── index.ts              # Scraper manager
├── app/api/supermarket/
│   ├── test-rema/            # Test endpoint
│   └── store-products/       # Storage endpoint
└── app/admin/supermarket-scraper/
    └── page.tsx              # Admin interface
```

## 🗄️ Database Schema

### Tabel: `supermarket_products`
```sql
CREATE TABLE supermarket_products (
  id SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  unit TEXT,
  unit_price DECIMAL(10,2),
  is_on_sale BOOLEAN DEFAULT false,
  sale_end_date TIMESTAMP,
  image_url TEXT,
  store TEXT NOT NULL,
  available BOOLEAN DEFAULT true,
  temperature_zone TEXT,
  nutrition_info JSONB,
  labels TEXT[],
  source TEXT NOT NULL,
  last_updated TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabel: `supermarket_price_history`
```sql
CREATE TABLE supermarket_price_history (
  id SERIAL PRIMARY KEY,
  product_external_id TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  is_on_sale BOOLEAN DEFAULT false,
  sale_end_date TIMESTAMP,
  timestamp TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (product_external_id) REFERENCES supermarket_products(external_id)
);
```

## ⚙️ Konfiguration

### Environment Variabler
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Scraping Indstillinger
```typescript
const SCRAPING_CONFIG = {
  schedule: '0 2 * * *',           // Hver nat kl. 2:00
  delayBetweenRequests: 1000,      // 1 sekund mellem requests
  maxRetries: 3,                   // 3 forsøg ved fejl
  timeout: 30000                   // 30 sekunder timeout
}
```

## 🔄 Automatisk Opdatering

### Cron Job Setup
```bash
# Tilføj til crontab
0 2 * * * curl -X POST "http://localhost:3000/api/supermarket/store-products"
```

### Eller brug Next.js Cron Jobs
```typescript
// app/api/cron/update-prices/route.ts
export async function GET() {
  // Kør scraper hver nat kl. 2:00
  if (new Date().getHours() === 2) {
    await updateAllPrices()
  }
  return NextResponse.json({ success: true })
}
```

## 📈 Statistikker og Monitoring

### Scraping Metrics
- **Total produkter**: Antal produkter i databasen
- **Produkter på tilbud**: Antal varer der er på tilbud
- **Kategorier**: Antal unikke produktkategorier
- **Gennemsnitspris**: Gennemsnitlig pris på alle produkter
- **Sidste opdatering**: Hvornår data sidst blev opdateret

### Fejlhåndtering
- **Retry logic**: Automatisk genforsøg ved fejl
- **Rate limiting**: Respektfuld over for supermarkedernes APIs
- **Logging**: Detaljeret logging af alle operationer
- **Error reporting**: Samling af fejl til analyse

## 🚧 Kendte Begrænsninger

### REMA 1000 API
- **Ingen direkte kategori-listing**: Må bruge discovery metode
- **Rate limiting**: Maks 1 request per sekund
- **Produkt ID range**: Ikke garanteret at alle IDs eksisterer

### Database
- **Supabase integration**: Midlertidigt deaktiveret pga. API nøgle problemer
- **Price history cleanup**: Automatisk oprydning efter 30 dage

## 🔮 Fremtidige Forbedringer

### Planlagte Features
- [ ] **Netto scraper**: Implementer scraper for Netto
- [ ] **Coop scraper**: Implementer scraper for Coop
- [ ] **Pris sammenligning**: Sammenlign priser mellem supermarkeder
- [ ] **Tilbuds alerts**: Notifikationer når varer kommer på tilbud
- [ ] **Mobile app**: React Native app til pris-sammenligning
- [ ] **Machine Learning**: Pris-prediktion baseret på historik

### Tekniske Forbedringer
- [ ] **Database integration**: Løs Supabase problemer
- [ ] **Caching**: Implementer Redis caching
- [ ] **Queue system**: Brug job queue til scraping
- [ ] **Monitoring**: Grafana dashboards for metrics
- [ ] **Alerting**: Slack/Discord notifikationer ved fejl

## 🧪 Testing

### Test Scraperen
```bash
# Test enkelt produkt
curl "http://localhost:3000/api/supermarket/test-rema"

# Test produkt discovery
curl -X POST "http://localhost:3000/api/supermarket/test-rema" \
  -d '{"action":"fetchAllProducts"}'
```

### Test Storage
```bash
# Scrape og gem produkter
curl -X POST "http://localhost:3000/api/supermarket/store-products"
```

### Admin Interface
Gå til `/admin/supermarket-scraper` for at:
- Se real-time statistikker
- Teste scraper funktionalitet
- Overvåge scraping processer

## 📝 Logs og Debugging

### Console Logs
```bash
# Se scraper logs i terminal
npm run dev

# Eller tjek browser console
# Åbn DevTools på admin siden
```

### API Response Eksempler
```json
{
  "success": true,
  "message": "Products successfully scraped",
  "scraping": {
    "totalScraped": 9,
    "newProducts": 9,
    "updatedProducts": 0,
    "errors": []
  },
  "products": [...]
}
```

## 🤝 Bidrag

### Rapporter Bugs
1. Tjek eksisterende issues
2. Opret ny issue med detaljeret beskrivelse
3. Inkluder error logs og API responses

### Foreslå Forbedringer
1. Opret feature request issue
2. Beskriv use case og forventet funktionalitet
3. Diskuter implementation approach

### Pull Requests
1. Fork repository
2. Opret feature branch
3. Implementer ændringer
4. Test grundigt
5. Opret PR med beskrivelse

## 📄 Licens

Dette projekt er udviklet til intern brug. Kontakt udvikleren for tilladelse til ekstern brug.

## 🆘 Support

### Ofte Stillede Spørgsmål

**Q: Hvorfor virker database integration ikke?**
A: Der er midlertidige problemer med Supabase API nøgler. Scraperen virker stadig og kan gemme data lokalt.

**Q: Hvor ofte opdateres priserne?**
A: Som standard hver nat kl. 2:00, men kan køres manuelt via admin interface.

**Q: Hvordan tilføjer jeg et nyt supermarked?**
A: Implementer en ny scraper klasse der følger `SupermarketAPI` interfacet.

**Q: Kan jeg ændre scraping frekvensen?**
A: Ja, opdater `SCRAPING_CONFIG.schedule` med en ny cron expression.

### Kontakt
- **Udvikler**: [Dit navn]
- **Email**: [din.email@example.com]
- **Projekt**: Functional Foods Supermarket Scraper

---

**Status**: 🟡 Beta - Fungerer men database integration er midlertidigt deaktiveret
**Sidste opdatering**: 20. august 2025
**Version**: 1.0.0-beta
