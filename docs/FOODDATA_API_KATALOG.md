# Fooddata Katalog-API — brugerdokumentation

Dansk dagligvare-katalog med **produkter, priser og tilbud** fra danske kæder.

Denne adgang er **kun katalog** (`read:catalog`). Matches, fravalg-tags og øvrig kurering er **ikke** inkluderet.

---

## Adgang

| | |
|---|---|
| **Base URL** | `https://functionalfoods.dk` |
| **API-nøgle** | `fd_…` (modtaget separat — vises kun én gang ved oprettelse) |
| **Auth** | `Authorization: Bearer <api_key>` på alle kald |

### Test at nøglen virker

```bash
curl -s -H "Authorization: Bearer <api_key>" \
  "https://functionalfoods.dk/api/grocery/stores" | jq
```

Forventet: JSON med liste over kæder (`netto`, `bilka`, `rema-1000`, …).

---

## Endpoints

Alle stier er under `/api/grocery/`.

| Endpoint | Formål |
|----------|--------|
| `GET /stores` | Hvilke kæder findes + datakvalitet |
| `GET /search?q=…` | Søg produkter efter navn eller stregkode |
| `GET /products` | List produkter med filtre |
| `GET /products/{id}` | Enkelt produkt (UUID eller GTIN) |
| `GET /offers` | Kun varer på tilbud |
| `GET /categories` | Kategoritræ med produktantal |

---

## Kæder (`chain`-parameter)

Brug `id` fra `/stores` som `chain` i andre kald.

| Kæde-id | Eksempel |
|---------|----------|
| `netto` | Netto |
| `bilka` | Bilka |
| `foetex` | Føtex |
| `rema-1000` | REMA 1000 |
| `lidl`, `meny`, `spar`, … | Se `/stores` |

### Datakvalitet per kæde

| `coverage` | Betydning |
|------------|-----------|
| `full` | Fuldt katalog med normale priser **og** tilbud |
| `offers-only` | Kun ugens tilbud (ingen almindelige hyldepriser) |
| `none` | Ingen data endnu |

Vis dette i jeres UI, så brugere forstår hvorfor nogle kæder har færre varer.

---

## Søgning

```http
GET /api/grocery/search?q=mælk&chain=netto&limit=25
```

| Param | Krav | Beskrivelse |
|-------|------|-------------|
| `q` | Ja, min. 2 tegn | Navnesøgning. Ren numerisk værdi søges som GTIN/stregkode |
| `chain` | Nej | Begræns til én kæde |
| `limit` | Nej | Default 25, max 100 |

```bash
curl -s -H "Authorization: Bearer <api_key>" \
  "https://functionalfoods.dk/api/grocery/search?q=banan&chain=rema-1000"
```

---

## Produkter

### List med filtre

```http
GET /api/grocery/products?chain=netto&limit=50&offset=0
GET /api/grocery/products?gtin=5712873461653
GET /api/grocery/products?onSale=true&chain=bilka
GET /api/grocery/products?q=smør&category=Mejeri
```

| Param | Beskrivelse |
|-------|-------------|
| `chain` | Kæde-id |
| `category` | Topkategori (`category_lvl0`) |
| `q` | Navnesøgning |
| `gtin` | Eksakt stregkode |
| `onSale` | `true` = kun varer med aktivt tilbud |
| `limit` | Default 50, max 200 |
| `offset` | Pagination |

### Enkelt produkt

```http
GET /api/grocery/products/{uuid}
GET /api/grocery/products/{gtin}
```

UUID er fooddata's interne id. GTIN er stregkode (8–14 cifre).

---

## Tilbud

```http
GET /api/grocery/offers?chain=netto&limit=50&offset=0
```

Returnerer kun produkter med **aktivt tilbud** (`isOnSale: true`), sorteret efter rabat.

---

## Kategorier

```http
GET /api/grocery/categories?chain=netto
```

Returnerer 3-niveau træ (`lvl0` → `lvl1` → `lvl2`) med antal produkter per node. Brug `lvl0`-navne som `category`-filter i `/products`.

---

## Response-format

### Liste

```json
{
  "data": [ /* produkter */ ],
  "meta": { "total": 1234, "limit": 50, "offset": 0 }
}
```

### Enkelt produkt

```json
{
  "data": {
    "id": "uuid",
    "gtin": "5712873461653",
    "name": "Bananer",
    "brand": null,
    "manufacturer": null,
    "description": null,
    "amount": 1,
    "unit": "kg",
    "imageUrl": "https://…",
    "category": {
      "path": "Frugt & grønt > Frugt > Bananer",
      "lvl0": "Frugt & grønt",
      "lvl1": "Frugt",
      "lvl2": "Bananer"
    },
    "sourceChain": "netto",
    "sourceId": "123456",
    "offers": [
      {
        "store": "netto",
        "price": 14.95,
        "beforePrice": 19.95,
        "unitPrice": 14.95,
        "unitPriceUnit": "kg",
        "isOnSale": true,
        "inStock": true,
        "offerFrom": "2026-06-01",
        "offerUntil": "2026-06-07",
        "offerDescription": "Tilbud",
        "multibuy": null,
        "discountPercentage": 25
      }
    ]
  }
}
```

### Prisfelter i `offers[]`

| Felt | Beskrivelse |
|------|-------------|
| `price` | Nuværende pris i DKK |
| `beforePrice` | Før-pris ved tilbud |
| `isOnSale` | Om varen er på tilbud |
| `discountPercentage` | Rabat i procent |
| `offerFrom` / `offerUntil` | Tilbudsperiode |
| `offerDescription` | Tilbudstekst |
| `multibuy` | Multikøb (fx "2 for 30 kr") |
| `unitPrice` / `unitPriceUnit` | Enhedspris (fx kr/kg) |
| `inStock` | Om varen er tilgængelig |
| `store` | Kæde-id (samme som `chain`) |

Et produkt kan have **flere** `offers` — typisk én per kæde/butik.

---

## Fejl

| HTTP | Betydning |
|------|-----------|
| `401` | Ugyldig eller manglende API-nøgle |
| `403` | Nøglen har ikke adgang til dette endpoint |
| `404` | Produkt ikke fundet |
| `400` | Ugyldig parameter |
| `500` | Serverfejl |

```json
{ "error": "Unauthorized" }
```

---

## Eksempler

### JavaScript / TypeScript

```typescript
const BASE = 'https://functionalfoods.dk'
const API_KEY = process.env.FOODDATA_API_KEY!

async function searchProducts(query: string, chain?: string) {
  const url = new URL('/api/grocery/search', BASE)
  url.searchParams.set('q', query)
  if (chain) url.searchParams.set('chain', chain)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res.json() as Promise<{
    data: Array<{
      id: string
      name: string
      gtin: string | null
      sourceChain: string
      offers: Array<{ store: string; price: number | null; isOnSale: boolean }>
    }>
    meta: { total: number; limit: number; offset: number }
  }>
}

// Søg mælk i Netto
const { data } = await searchProducts('mælk', 'netto')
```

### Python

```python
import os, requests

BASE = "https://functionalfoods.dk"
headers = {"Authorization": f"Bearer {os.environ['FOODDATA_API_KEY']}"}

r = requests.get(f"{BASE}/api/grocery/search", params={"q": "mælk", "chain": "netto"}, headers=headers)
r.raise_for_status()
products = r.json()["data"]
```

---

## Begrænsninger

- **Kun læseadgang** — I kan hente katalog, priser og tilbud, men ikke opdatere data.
- **Pagination** — brug `limit` + `offset` ved store datasæt.
- **Cache** — svar caches kort (ca. 60 sek). Til live prissammenligning: poll med fornuftigt interval, ikke hvert sekund.
- **Ikke inkluderet** — ingrediens-matches, fravalg-tags, øko-tags og match-kø.

---

## Support

Kontakt FunctionalFoods ved spørgsmål om adgang, nye kæder eller rate limits.
