#!/usr/bin/env python3
"""
REMA 1000 Product Scraper
Scrapes all products from REMA's API and saves as JSONL for import into your Supabase database.
"""

import asyncio
import httpx
import json
import os
import sys
import time
import argparse
from urllib.parse import urljoin
from typing import Dict, List, Any, Optional

# Configuration
BASE = "https://api.digital.rema1000.dk"
LIST_PATH = "/api/v3/products"
HEADERS = {
    "accept": "application/json",
    "user-agent": "Mozilla/5.0 (NicolaiScraper/0.1)"
}
INCLUDE_LIST = "labels,prices,images,department"
INCLUDE_DETAIL = "declaration,nutrition_info,warnings,gpsr,department,labels,prices,images"
PER_PAGE = 100
OUT_DIR = "scripts/data"
OUT_FILE = os.path.join(OUT_DIR, "rema_products.jsonl")

# Create output directory
os.makedirs(OUT_DIR, exist_ok=True)

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='REMA 1000 Product Scraper')
    parser.add_argument('--test', action='store_true', 
                       help='Run in test mode - only scrape 10 products')
    parser.add_argument('--limit', type=int, default=10,
                       help='Limit number of products to scrape (default: 10 for test mode)')
    return parser.parse_args()

async def get_json(client: httpx.AsyncClient, url: str, params=None) -> tuple[Dict[str, Any], Dict[str, str]]:
    """Get JSON response with retry logic and backoff"""
    backoff = 1
    for attempt in range(6):
        try:
            r = await client.get(url, headers=HEADERS, params=params, timeout=30)
            if r.status_code in (429, 503):
                print(f"Rate limited (429/503), waiting {backoff}s...")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 32)
                continue
            r.raise_for_status()
            return r.json(), dict(r.headers)
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt == 5:
                raise RuntimeError(f"Too many retries for {url}")
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 32)
    raise RuntimeError(f"Unexpected error for {url}")

def next_from_links(data: Dict[str, Any]) -> Optional[str]:
    """Extract next page URL from API response links"""
    links = data.get("links") or {}
    nxt = links.get("next")
    return nxt if isinstance(nxt, str) and nxt else None

async def list_all_products(test_mode: bool = False, limit: int = 10) -> List[Dict[str, Any]]:
    """Scrape products from REMA's API using pagination"""
    products = []
    async with httpx.AsyncClient(base_url=BASE, follow_redirects=True) as client:
        page = 1
        total_products = 0
        
        while True:
            print(f"📄 Scraping page {page}...")
            params = {"per_page": PER_PAGE, "page": page, "include": INCLUDE_LIST}
            
            try:
                data, headers = await get_json(client, LIST_PATH, params=params)
                batch = data.get("data") if isinstance(data, dict) else data
                
                if not batch:
                    print(f"❌ No products found on page {page}")
                    break
                
                # In test mode, only take the first few products
                if test_mode:
                    batch = batch[:limit - total_products]
                    print(f"🧪 Test mode: Taking first {len(batch)} products from page {page}")
                
                products.extend(batch)
                total_products += len(batch)
                print(f"✅ Found {len(batch)} products on page {page} (Total: {total_products})")

                # Stop if we've reached our limit in test mode
                if test_mode and total_products >= limit:
                    print(f"🎯 Test mode: Reached limit of {limit} products")
                    break

                # Check stop conditions for full mode
                if not test_mode:
                    meta = data.get("meta", {})
                    total_pages = meta.get("total_pages") or meta.get("last_page")
                    nxt = next_from_links(data)
                    
                    if total_pages and page >= int(total_pages):
                        print(f"🎯 Reached last page ({total_pages})")
                        break
                    if not total_pages and not nxt and len(batch) < PER_PAGE:
                        print(f"🎯 Reached end (batch size < {PER_PAGE})")
                        break
                
                # Rate limiting
                await asyncio.sleep(0.25)  # ~4 req/s
                page += 1
                
            except Exception as e:
                print(f"❌ Error on page {page}: {e}")
                break
    
    print(f"🎉 Total products found: {len(products)}")
    return products

async def enrich_details(products: List[Dict[str, Any]], test_mode: bool = False) -> List[Dict[str, Any]]:
    """Enrich each product with detailed information"""
    print(f"🔍 Enriching details for {len(products)} products...")
    
    async with httpx.AsyncClient(base_url=BASE, follow_redirects=True) as client:
        for i, p in enumerate(products):
            pid = p.get("id")
            if pid is None:
                print(f"⚠️ Product {i+1} has no ID, skipping...")
                continue
            
            try:
                print(f"🔍 Enriching product {i+1}/{len(products)}: ID {pid}")
                detail, _ = await get_json(
                    client, 
                    f"/api/v3/products/{pid}", 
                    params={"include": INCLUDE_DETAIL}
                )
                p["detail"] = detail.get("data", detail)
                
                # Rate limiting
                await asyncio.sleep(0.1)  # ~10 req/s for details
                
            except Exception as e:
                print(f"❌ Failed to enrich product {pid}: {e}")
                p["detail"] = None
    
    return products

def dump_jsonl(items: List[Dict[str, Any]], path: str) -> None:
    """Save products as JSONL file"""
    print(f"💾 Saving {len(items)} products to {path}...")
    
    with open(path, "w", encoding="utf-8") as f:
        for item in items:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    
    print(f"✅ Saved to {path}")

async def main():
    """Main scraping function"""
    args = parse_arguments()
    
    if args.test:
        print("🧪 TEST MODE: Only scraping a few products")
        print(f"📊 Product limit: {args.limit}")
        print("=" * 50)
    else:
        print("🚀 Starting REMA 1000 product scraper (FULL MODE)...")
        print("⚠️  This will take 2-3 hours and scrape 27,000+ products!")
        print("=" * 50)
    
    try:
        # Step 1: List products
        print("📋 Step 1: Listing products...")
        items = await list_all_products(test_mode=args.test, limit=args.limit)
        
        if not items:
            print("❌ No products found!")
            return
        
        # Step 2: Enrich with details
        print("\n🔍 Step 2: Enriching product details...")
        items = await enrich_details(items, test_mode=args.test)
        
        # Step 3: Save to file
        print("\n💾 Step 3: Saving products...")
        dump_jsonl(items, OUT_FILE)
        
        if args.test:
            print("\n🧪 Test completed successfully!")
            print(f"📊 Products scraped: {len(items)}")
            print(f"📁 Output: {OUT_FILE}")
            print("\n💡 To run full scrape, remove --test flag:")
            print("   python rema_scraper.py")
        else:
            print("\n🎉 Full scraping completed successfully!")
            print(f"📊 Total products: {len(items)}")
            print(f"📁 Output: {OUT_FILE}")
        
    except Exception as e:
        print(f"❌ Scraping failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
