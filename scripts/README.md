# REMA 1000 Product Scraper

This Python script scrapes all products from REMA 1000's API and saves them as JSONL for import into your Supabase database.

## 🚀 Quick Start

### 1. Install Python dependencies:
```bash
cd scripts
pip install -r requirements.txt
```

### 2. Run the scraper:
```bash
python rema_scraper.py
```

### 3. Output:
- **File:** `data/rema_products.jsonl`
- **Format:** One JSON object per line
- **Data:** Complete product information including prices, nutrition, images, etc.

## 📊 What it scrapes:

- ✅ Product names and descriptions
- ✅ Images (small, medium, large)
- ✅ Prices and unit prices
- ✅ Campaigns and offers
- ✅ Weight/volume and units
- ✅ Categories and departments
- ✅ Ingredient lists and allergens
- ✅ Nutrition information
- ✅ Labels and certifications

## ⚡ Performance:

- **Rate limiting:** 4 requests/second for listing, 10 requests/second for details
- **Retry logic:** Automatic backoff on rate limits (429/503)
- **Progress tracking:** Shows current page and total products found
- **Expected output:** 27,000+ products in ~2-3 hours

## 🔄 Next Steps:

1. **Run scraper** to get all products
2. **Import JSONL** to Supabase via your existing API
3. **Implement delta updates** in your Next.js app
4. **Schedule regular updates** with Vercel Cron

## 📁 File Structure:

```
scripts/
├── rema_scraper.py      # Main scraper script
├── requirements.txt      # Python dependencies
├── README.md           # This file
└── data/               # Output directory (created automatically)
    └── rema_products.jsonl  # Scraped products
```
