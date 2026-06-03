# FunctionalFoods ↔ Planomo — Fooddata & ingredient matching

## Fordeling

| System | Data | Formål |
|--------|------|--------|
| **FF Fooddata** (grocery Supabase) | `products`, `product_offers` | Levende katalog + tilbud fra primære API’er og Tjek |
| **Planomo** | `product_ingredient_matches` + snapshots + lokal kopi | Sticky matches til app/matching |
| **FF `/dagligvarer`** | Goma-legacy `product_offers` på main Supabase | Kun aktuelle tilbud (`is_offer_active`) — **urørt** |
| **Planomo `/matching`** | Snapshots + import | Sticky matches uden daglig gen-matching |

## Planomo (implementeret hos jer)

- Migration `20260603120000_match_product_snapshots.sql` — `product_name_snapshot`, `product_store_snapshot`, `last_known_price`
- `src/lib/product-match-snapshots.ts` — snapshot ved ny match + admin-fallback
- `import-fooddata-to-planomo.ts` — henter også **inaktive** `fooddata-products` for ids der allerede er matchet
- `add-product-match` / kø-match — gemmer snapshot ved oprettelse
- `existing-matches` — viser match via snapshot/offers uden at kræve aktivt tilbud

Import **sletter ikke** tilbud-rækker der mangler i dagens feed (kun upsert). Gamle rækker kan ligge med `in_stock=false` → skjult i dagligvarer-lignende UI, stadig brugbare til matching.

## 10. REMA-politik (FF)

`products.active` / `product_offers.in_stock` afledes af **navn + pris** i REMA API.  
`is_available_in_all_stores` gemmes kun i `raw_data` (butiks-dækning ≠ udgået vare).

## 11. FF Fooddata — katalog der ikke “sover væk”

FF skal **ikke** slette kataloget når et tilbud slutter. Matches lever i Planomo; FF leverer stabile rækker til import.

### `products`

- Behold rækker for varer der har været i sortiment/tilbud.
- `active=false` **kun** når varen forsvinder fra et **fuldt** primær-katalog-sync (REMA / Salling Algolia) — ikke fordi tilbuddet er udløbet.
- Stabile id’er: `source_chain` + `source_id` (samme når varen vender tilbage).
- Tjek: hvert uge-tilbud har eget `source_id` (Tjek offer-id) — bevidst begrænsning.

### `product_offers`

- Ved udløbet **tilbud** → `in_stock=false`, `is_on_sale=false`; **behold** `price_cents` / `before_price_cents`.
- Efter hvert sync: tilbud med `source_synced_at` ældre end run-start “sover” (`in_stock=false`) — ingen DELETE.
- Regulær hyldepris (ikke tilbud): `in_stock=true` så længe varen er i katalog-feed med pris.

### Sync-adfærd (`src/grocery/sync/catalog-retention.ts`)

- Kun upsert — ingen sletning af manglende feed-rækker.
- Post-sync `sleepStaleOffersForChain` + `deactivateProductsMissingFromCatalogSync` (fuld katalog-sync).
- Scheduled cron: se `src/lib/grocery/sync-schedule.ts`.

### Dagligvarer (main Supabase)

- Ingen ændring: `is_offer_active`, “Kun tilbud”, udløbne tilbud skjules som i dag.

## Kørsel

```bash
# Planomo (jeres repo)
npx supabase migration up   # eller tilsvarende
npx tsx scripts/import-fooddata-to-planomo.ts

# FF Fooddata (dette repo)
npx tsx scripts/grocery-migrate.ts
# Cron / manuel:
curl -H "Authorization: Bearer $GROCERY_SYNC_SECRET" \
  "https://…/api/grocery/sync/cron"
```

Eksisterende Planomo-matches **uden** snapshot virker via products/gamle offers; nye matches får snapshot automatisk.
