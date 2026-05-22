# Nemlig.com adapter (deferred)

## Status: not yet implemented (intentionally)

Nemlig.com (Salling Group-owned online supermarket, 13,326 products) has a
stateful API that requires multi-step session simulation. Implementing this
correctly takes ~1-2 days and adds operational complexity that we don't need
right now (we already cover 65k products via Salling + REMA).

## Why it's hard

Their API endpoints look like:

```
/webapi/{ProductsImportedTimestamp}-{SitecorePublishedStamp}/{TimeslotUtc}/{DeliveryZoneId}/{userId|"0"}/{pageId|"0"}/Products
/webapi/{timestamp}/search/quick
```

Required state to construct any product URL:

1. **CombinedProductsAndSitecoreTimestamp** — from
   `GET /webapi/v2/AppSettings/Website` (e.g. `"AAAAAAAA-wH3Czd23"`).
2. **TimeslotUtc** — from a chosen delivery slot. Requires hitting:
   - `POST /webapi/Delivery/CheckPostCode` with `{ PostCode: "2300" }`
   - Then `GET /webapi/Delivery` to list available slots and pick one.
3. **DeliveryZoneId** — returned alongside TimeslotUtc.
4. **X-XSRF-TOKEN** — from `GET /webapi/AntiForgery`, set as header on
   subsequent requests.
5. Session cookies must persist across the entire flow.
6. They block requests with User-Agent containing `axios` (see robots.txt).

## When to revisit

Build this when:
- Nemlig.com's specific catalog matters for a use-case (e.g. user explicitly
  shops there)
- We have a need for a 4th distinct chain after Lidl
- We're ready to invest in a more robust scraper framework

## Workable approach when we do

```ts
// 1. Bootstrap session (sequential, with cookie jar)
const cookieJar = new CookieJar()
await fetchWithCookies('/webapi/AntiForgery')          // sets cookies + XSRF token
const settings = await fetchWithCookies('/webapi/v2/AppSettings/Website')
const zone = await fetchWithCookies('/webapi/Delivery/CheckPostCode', { PostCode: '2300' })
const slots = await fetchWithCookies('/webapi/Delivery')
const slot = slots[0] // pick first available

// 2. Iterate categories
const menu = await fetchWithCookies(`/webapi/SCommerceLayoutData/MetaMenu`)
for (const category of menu.Categories) {
  const url = `/webapi/${settings.CombinedProductsAndSitecoreTimestamp}/${slot.TimeslotUtc}/${zone.DeliveryZoneId}/0/${category.Id}/Products`
  const products = await fetchWithCookies(url)
  // map and persist
}
```

## Alternative paths considered

| Approach | Verdict |
|---|---|
| Apify marketplace actor for Nemlig | None exist (search returned no relevant actors May 2026) |
| Sitemap-based product page scraping | Works but 13k requests; need per-product price parsing from HTML; brittle |
| Tjek (eTilbudsavis) API | Only offers, not full catalog. Use for offer-data only. |
| Direct catalog API of parent (Salling) | Salling Algolia indexes don't include Nemlig (it's a separate brand) |
