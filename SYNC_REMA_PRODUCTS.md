# Sådan synkroniserer du REMA produkter

## Automatisk synkronisering

REMA produkter synkroniseres automatisk via **Goma** systemet hver **lørdag kl. 04:00 dansk tid** (02:00 UTC) via GitHub Actions.

## Tjek hvornår produkter sidst blev synkroniseret

**⚠️ VIGTIGT:** Goma import skriver til **ny struktur** (`products` + `product_offers`), ikke den gamle (`supermarket_products`).

Kør denne SQL query i Supabase SQL Editor for at tjekke **ny struktur**:

```sql
-- Tjek REMA offers i ny struktur (product_offers)
SELECT 
  MAX(updated_at) as last_sync_time,
  COUNT(*) as total_rema_offers,
  COUNT(CASE WHEN updated_at > NOW() - INTERVAL '7 days' THEN 1 END) as updated_last_7_days,
  COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 day' THEN 1 END) as updated_last_24_hours
FROM product_offers
WHERE store_id = 'rema-1000';
```

Eller se filen `check-rema-sync-status.sql` for flere detaljerede queries (inkl. både ny og gammel struktur).

## Manuel synkronisering

### Metode 1: Via API endpoint (anbefalet)

Kald dette endpoint for at manuelt synkronisere REMA produkter:

```bash
# Fra terminal (curl)
curl -X POST https://functionalfoods.dk/api/admin/goma/scheduled-sync \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

**Eller fra browser/Postman:**
- URL: `https://functionalfoods.dk/api/admin/goma/scheduled-sync`
- Method: `POST`
- Headers:
  - `Content-Type: application/json`
  - `x-cron-secret: YOUR_CRON_SECRET` (fra Vercel environment variables)

### Metode 2: Via GitHub Actions (workflow_dispatch)

1. Gå til GitHub repository
2. Klik på "Actions" tab
3. Vælg "Goma Scheduled Sync" workflow
4. Klik "Run workflow" → "Run workflow"

Dette kører samme sync som den automatiske, men manuelt.

### Metode 3: Via Python scraper (hvis Goma ikke virker)

Hvis Goma sync ikke virker, kan du bruge Python scraperen:

```bash
# 1. Kør scraperen
cd scripts
python3 rema_scraper.py

# 2. Importer produkterne
# Enten via API:
curl -X POST http://localhost:3000/api/admin/dagligvarer/import-rema-products \
  -H "Content-Type: application/json" \
  -d @data/rema_products_full.jsonl

# Eller brug sync-from-scraper endpoint:
curl -X POST http://localhost:3000/api/admin/dagligvarer/sync-from-scraper \
  -H "Content-Type: application/json"
```

## Vigtige noter

- **REMA synkroniseres kun lørdag** via Goma (ifølge `goma/scheduled-sync` route)
- Hvis du skal synkronisere på andre dage, skal du manuelt kalde endpointet
- **Goma import skriver til ny struktur:** `products` + `product_offers` tabellerne
- **Gammel struktur (`supermarket_products`) opdateres IKKE** af Goma import
- `updated_at` kolonnen i `product_offers` tabellen viser hvornår hvert produkt sidst blev opdateret
- Produkter opdateres kun hvis priser eller tilbud ændrer sig

## Manuel synkronisering (direkte Goma import)

Hvis du vil synkronisere REMA nu (ikke kun lørdag):

```bash
POST /api/admin/goma/import
Content-Type: application/json

{
  "stores": ["REMA 1000"],
  "limit": 150,
  "pages": 40
}
```

Eller gå til `/admin/dagligvarer/goma` og klik "Sync" for REMA 1000.

## Troubleshooting

Hvis produkter ikke opdateres:

1. **Tjek GitHub Actions logs:**
   - Gå til GitHub → Actions → "Goma Scheduled Sync"
   - Se om workflow kører og om der er fejl

2. **Tjek Vercel logs:**
   - Gå til Vercel dashboard → Functions
   - Se `/api/admin/goma/scheduled-sync` logs

3. **Tjek database:**
   - Kør `check-rema-sync-status.sql` for at se sidst opdateret tidspunkt
   - Tjek om `CRON_SECRET` er sat korrekt i Vercel
