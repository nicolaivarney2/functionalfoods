# Planomo — fooddata / Goma handoff (jul 2026)

Planomo læser **fooddata** (grocery Supabase). Functional Foods skriver dertil via native scrapes + Goma. Planomo skal **spejle fooddata** — ingen særskilt Tjek-logik.

## Datastrategi (single source of truth)

| Kæder | Kilde i fooddata | `product_offers.source` |
|-------|------------------|-------------------------|
| Netto, Bilka, Føtex | Salling Algolia (native scrape) | `salling-algolia:netto` osv. |
| REMA 1000 | REMA API (native scrape) | `rema-1000-api` |
| Lidl, 365, Coop-kæder, MENY, Spar, Nemlig, Min Købmand | **Goma API** | `goma` |
| ~~Tjek/Squid~~ | **Udfaset** — skal ignoreres | `tjek:*` (legacy, `in_stock=false`) |

## Pipeline (rækkefølge)

```
04:00 UTC  Vercel cron  → native scrape (Netto/Bilka/Føtex/REMA) → fooddata
02:00+14:00 UTC  Goma cron → Goma sync → fooddata (source=goma)
05:00 UTC  GitHub Actions → fooddata-import → FF hoved-DB
           Planomo daily-sync → læs fooddata direkte
```

## Hvad Planomo skal gøre

### 1. Import-filter (kritisk)

Når I importerer `product_offers` fra fooddata:

```typescript
// KUN disse kilder — ALDRIG tjek:*
function shouldImportOffer(offer: { source: string; store_id: string; in_stock: boolean }) {
  if (offer.source.startsWith('tjek')) return false
  if (offer.source === 'goma') return offer.in_stock !== false
  // Native Salling/REMA
  if (offer.source.startsWith('salling-algolia:')) return true
  if (offer.source.startsWith('rema-1000')) return true
  return false
}
```

### 2. Synlighed i UI

- **`in_stock=false`** → skjul varen (udgået tilbud / arkiveret)
- **`is_on_sale=true`** → vis som tilbud (Goma offers-only kæder er næsten altid tilbud)
- **Fuldt katalog (Nemlig, MENY, Spar, Min Købmand):** vis alle `in_stock=true`; filtrer på `is_on_sale` kun ved "Kun tilbud"

### 3. Billeder

- Goma: `products.image_url` udfyldt (packshot fra Goma)
- SuperBrugsen/Løvbjerg efter Goma-cutover: billeder fra Goma, ikke Tjek
- EAN-fallback kan bruges hvis `image_url` mangler (FF gør det samme)

### 4. Env (Planomo)

Planomo skal læse **samme fooddata-projekt** som FF:

- `GROCERY_SUPABASE_URL` (eller tilsvarende)
- Service role / secret key med læseadgang

**Ingen** `GOMA_IMPORT_ENABLED` nødvendig i Planomo — det er FF's flag for import til FF-DB.

### 5. Verificering efter sync

Kør disse checks mod fooddata (read-only):

```sql
-- Per kæde: kilde-fordeling (skal være goma eller native, ikke tjek)
SELECT store_id, source, COUNT(*) AS n,
       COUNT(*) FILTER (WHERE in_stock = true) AS in_stock
FROM product_offers
GROUP BY 1, 2
ORDER BY 1, 2;

-- Nemlig skal have tusindvis af goma + in_stock
SELECT COUNT(*) FROM product_offers
WHERE store_id = 'nemlig' AND source = 'goma' AND in_stock = true;

-- Løvbjerg skal have goma-tilbud (ikke kun tjek)
SELECT COUNT(*) FROM product_offers
WHERE store_id = 'loevbjerg' AND source = 'goma' AND in_stock = true AND is_on_sale = true;
```

Forventede størrelsesordener (jul 2026):

| store_id | source | in_stock (ca.) |
|----------|--------|----------------|
| nemlig | goma | 3.000–10.000 |
| loevbjerg | goma | 100–700 (tilbud) |
| netto | salling-algolia:* | 4.000+ |
| rema-1000 | rema-1000-api | 4.000+ |

### 6. price_history timeout

FF's natlige import kan fejle på `price_history` (timeout). Det påvirker **ikke** produkter/tilbud/billeder — kun prishistorik-graf i FF. Planomo's daglige pull af offers/products er uafhængig.

## FF deploy-checkliste (før Planomo forventer frisk data)

1. **Vercel:** `GOMA_IMPORT_ENABLED=true`, `GOMA_API_KEY`, `GROCERY_SUPABASE_*`
2. **Vercel (valgfri):** `GROCERY_TJEK_DISABLED=true` — stop Tjek-scrape
3. **GitHub Environment FF:** `GOMA_IMPORT_ENABLED=true` (fooddata-import workflow)
4. Kør repair én gang: `npx tsx scripts/repair-goma-fooddata-in-stock.ts`
5. Trigger manuel Goma full sync for alle kæder (admin eller vent på ugeplan)
6. Deploy migration `20260702120000_goma_primary_no_tjek.sql` på FF Supabase
7. Vent på fooddata-import (05:00 UTC) eller kør `npx tsx scripts/import-fooddata-to-ff.ts`

## Kontakt / fejlsøgning

- FF diagnose: `npx tsx scripts/diagnose-goma-chains.ts`
- Fooddata sync: `npx tsx scripts/diagnose-fooddata-sync.ts`
- Goma sundhed: `/admin/dagligvarer/goma` + `/api/admin/dagligvarer/sync-health`

Når fooddata er korrekt, behøver Planomo **ingen kodeændring** ud over at sikre Tjek filtreres fra og `in_stock` respekteres.
