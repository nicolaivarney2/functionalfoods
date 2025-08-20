# REMA 1000 Product Scraper

This Python script scrapes all products from REMA 1000's API and saves them as JSONL for import into your Supabase database.

## 🚀 Quick Start

### 1. Install Python dependencies:
```bash
cd scripts
pip install -r requirements.txt
```

### 2. Test the scraper (RECOMMENDED FIRST):
```bash
# Test mode: Only scrape 10 products
python rema_scraper.py --test

# Test mode: Scrape 5 products
python rema_scraper.py --test --limit 5
```

### 3. Run full scrape (when you're ready):
```bash
# Full mode: Scrape all 27,000+ products
python rema_scraper.py
```

### 4. Output:
- **File:** `data/rema_products.jsonl`
- **Format:** One JSON object per line
- **Data:** Complete product information including prices, nutrition, images, etc.

## 🧪 Test Mode vs Full Mode

### **Test Mode (--test):**
- **Scrapes:** 10 products (or custom limit)
- **Time:** 2-5 minutes
- **Purpose:** Verify setup works before full scrape
- **Perfect for:** Testing and development

### **Full Mode:**
- **Scrapes:** 27,000+ products
- **Time:** 2-3 hours
- **Purpose:** Get complete product database
- **Perfect for:** Production setup

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
- **Test mode:** 10 products in ~2-5 minutes
- **Full mode:** 27,000+ products in ~2-3 hours

## 🔄 Next Steps:

1. **Test scraper** with `--test` flag
2. **Verify output** in `data/rema_products.jsonl`
3. **Run full scrape** when ready
4. **Import JSONL** to Supabase via your existing API
5. **Implement delta updates** in your Next.js app
6. **Schedule regular updates** with Vercel Cron

## 📁 File Structure:

```
scripts/
├── rema_scraper.py      # Main scraper script
├── requirements.txt      # Python dependencies
├── README.md           # This file
└── data/               # Output directory (created automatically)
    └── rema_products.jsonl  # Scraped products
```

## 💡 Usage Examples:

```bash
# Test with 5 products
python rema_scraper.py --test --limit 5

# Test with default 10 products
python rema_scraper.py --test

# Full scrape (27,000+ products)
python rema_scraper.py

# Help
python rema_scraper.py --help
```
