# Zyte API Setup Guide

Dette system bruger Zyte API til at omgå anti-bot beskyttelse på REMA 1000's website.

## Trin 1: Opret Zyte Konto

1. Gå til [https://www.zyte.com/](https://www.zyte.com/)
2. Opret en gratis konto
3. Gå til API dashboard og få din API nøgle

## Trin 2: Tilføj API Nøgle

### Lokalt (Development)
Tilføj til din `.env.local` fil:
```
ZYTE_API_KEY=your_api_key_here
```

### Vercel (Production)
1. Gå til dit Vercel dashboard
2. Vælg dit projekt
3. Gå til Settings → Environment Variables
4. Tilføj:
   - **Name:** `ZYTE_API_KEY`
   - **Value:** din API nøgle
   - **Environment:** Production (og Preview hvis ønsket)

## Trin 3: Test Setup

1. Gå til admin interface: `/admin/dagligvarer`
2. Klik "Start Fuld Scraping"
3. Tjek konsollen for fejl

## Priser og Limits

- **Gratis tier:** 1,000 requests/måned
- **Standard:** $50/måned for 10,000 requests
- **Growth:** $200/måned for 50,000 requests

## Hvad Sker Der Bagved?

1. **Endpoint Discovery:** Zyte bruger networkCapture til at finde REMA's API endpoints
2. **Data Extraction:** Henter JSON data fra deres API via Zyte's proxy
3. **Anti-bot Bypass:** Zyte håndterer alle browser signatures, IP rotation, etc.
4. **Geolocation:** Alle requests sendes fra Danmark (DK)

## Troubleshooting

### "Zyte API key not configured"
- Tjek at `ZYTE_API_KEY` er sat korrekt
- Restart Vercel deployment efter tilføjelse af env var

### "No working products endpoint found"
- REMA har måske ændret deres API struktur
- Tjek Zyte logs for detaljer om failed requests

### Rate Limits
- Reducer antal produkter i `maxProducts` variablen
- Øg delays mellem requests
- Overvej at opgradere Zyte plan

## Alternative Scrapers

Hvis Zyte ikke virker optimalt, kan I også bruge:
- **ScrapingBee API** (lignende service)
- **Bright Data** (tidligere Luminati)
- **ScrapFly** (god til JS-heavy sites)

Alle disse services følger samme mønster som Zyte implementationen.
