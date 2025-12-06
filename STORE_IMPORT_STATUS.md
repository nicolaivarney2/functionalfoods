# Store Import Status Analysis

## Problem
The frontend queries from `product_offers` table (new structure), but some stores are being imported to `supermarket_products` table (old structure).

## Stores Available via Goma (New Structure ✅)
All these stores should be imported via `/api/admin/goma/import` which writes to:
- `products` table (global products)
- `product_offers` table (store-specific offers)

| Store | Goma ID | Offer Day | Status | Notes |
|-------|---------|-----------|--------|-------|
| Netto | `Netto` | Fredag | ✅ Working | Using Goma import |
| REMA 1000 | `REMA 1000` | Lørdag | ❌ **BROKEN** | Has old import routes writing to `supermarket_products` |
| 365 Discount | `365discount` | Onsdag | ⚠️ Unknown | Should use Goma |
| Lidl | `Lidl` | Lørdag | ⚠️ Unknown | Should use Goma |
| Bilka | `Bilka` | Fredag | ⚠️ Unknown | Should use Goma |
| Nemlig | `Nemlig` | Søndag | ⚠️ Unknown | Should use Goma |
| MENY | `MENY` | Torsdag | ⚠️ Unknown | Should use Goma |
| Spar | `Spar` | Torsdag | ❌ **BROKEN** | User confirmed same problem |
| Kvickly | `Kvickly` | Torsdag | ⚠️ Unknown | Should use Goma |
| Super Brugsen | `superbrugsen` | Torsdag | ⚠️ Unknown | Should use Goma |
| Brugsen | `Brugsen` | Fredag | ⚠️ Unknown | Should use Goma |
| Løvbjerg | `Løvbjerg` | Torsdag | ⚠️ Unknown | Should use Goma |
| ABC Lavpris | `ABC Lavpris` | Tirsdag | ⚠️ Unknown | Should use Goma |

## Old Import Routes (Writing to `supermarket_products` ❌)

### REMA 1000
- `/api/admin/dagligvarer/import-rema-products` - Python scraper import
- `/api/admin/dagligvarer/simple-rema-scraper` - Simple scraper
- `/api/admin/dagligvarer/simple-delta` - Delta updates
- `/api/admin/dagligvarer/full-scrape` - Full scrape
- `/api/admin/dagligvarer/batch-scrape` - Batch scrape
- `/api/admin/dagligvarer/sync-from-scraper` - Sync from scraper

### Netto
- `/api/admin/dagligvarer/netto-scraper` - Netto scraper
- `/api/admin/dagligvarer/netto-lookup` - Netto lookup
- `/api/admin/dagligvarer/netto-suggestions` - Netto suggestions

**Note:** Netto is working because it's being imported via Goma, not these old routes.

## Solution

### For REMA 1000 and Spar:
1. Go to `/admin/dagligvarer/goma`
2. Click "Sync" for the store
3. This will import to the correct tables (`products` + `product_offers`)

### For All Other Stores:
Check if they have data in `supermarket_products` table. If so:
1. Import via Goma to populate `products` + `product_offers`
2. Optionally clean up old data from `supermarket_products` (if no longer needed)

## API Endpoint for Goma Import

```bash
POST /api/admin/goma/import
Content-Type: application/json

{
  "stores": ["REMA 1000", "Spar"],  // or any other store from Goma list
  "limit": 150,
  "pages": 40
}
```

## Store ID Mapping

The frontend expects store IDs in this format (from `mapStoreFilterToIds`):
- `Netto` → `netto`
- `REMA 1000` → `rema-1000`
- `365 Discount` → `365-discount`
- `Spar` → `spar`
- `MENY` → `meny`
- `Super Brugsen` → `super-brugsen`
- etc.

Goma import automatically converts store names to these IDs when creating `product_offers`.

