#!/usr/bin/env python3
"""
REMA 1000 Product Scraper
Scrapes food products from REMA's API and saves as JSONL for import into your Supabase database.
"""

import asyncio
import httpx
import json
import os
import sys
import time
import argparse
from pathlib import Path

# Food department IDs (excluding "Husholdning" which is non-food)
FOOD_DEPARTMENTS = [
    1,   # Brød & Bavinchi
    2,   # Frugt & grønt  
    3,   # Kød, fisk & fjerkræ
    4,   # Køl
    5,   # Frost
    6,   # Mejeri
    7,   # Ost m.v.
    8,   # Kolonial
    9    # Drikkevarer
]

# Configuration
BASE_URL = "https://api.digital.rema1000.dk"
HEADERS = {
    "accept": "application/json",
    "user-agent": "Mozilla/5.0 (NicolaiScraper/0.1)"
}
PER_PAGE = 100
OUT_DIR = "data"

# Create output directory
os.makedirs(OUT_DIR, exist_ok=True)

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='REMA 1000 Food Product Scraper')
    parser.add_argument('--test', action='store_true', 
                       help='Run in test mode - only scrape limited products')
    parser.add_argument('--limit', type=int, default=10,
                       help='Limit number of products to scrape (default: 10 for test mode)')
    parser.add_argument('--batch', type=int, choices=[1, 2, 3, 4, 5],
                       help='Scrape specific batch: 1(1-2), 2(3-4), 3(5-6), 4(7-8), 5(9)')
    return parser.parse_args()

async def get_json(url: str, client: httpx.AsyncClient) -> dict:
    """Make HTTP request and return JSON response"""
    try:
        response = await client.get(url, headers=HEADERS, timeout=30.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return {}

async def list_all_products(client: httpx.AsyncClient, test_mode: bool = False, limit: int = None, batch: int = None) -> list:
    """List all products from REMA API, filtered by food departments"""
    all_products = []
    page = 1
    
    # Determine which departments to scrape based on batch
    if batch:
        if batch == 1:
            departments = [1, 2]  # Brød & Bavinchi + Frugt & grønt
            batch_name = "Brød & Bavinchi + Frugt & grønt"
        elif batch == 2:
            departments = [3, 4]  # Kød, fisk & fjerkræ + Køl
            batch_name = "Kød, fisk & fjerkræ + Køl"
        elif batch == 3:
            departments = [5, 6]  # Frost + Mejeri
            batch_name = "Frost + Mejeri"
        elif batch == 4:
            departments = [7, 8]  # Ost m.v. + Kolonial
            batch_name = "Ost m.v. + Kolonial"
        elif batch == 5:
            departments = [9]     # Drikkevarer
            batch_name = "Drikkevarer"
        print(f"🔍 Scraping BATCH {batch}: {batch_name} (departments {departments})")
    else:
        departments = FOOD_DEPARTMENTS
        print(f"🔍 Scraping products from {len(FOOD_DEPARTMENTS)} food departments...")
    
    while True:
        # Get products from each relevant department
        for dept_id in departments:
            if test_mode and limit and len(all_products) >= limit:
                break
                
            url = f"{BASE_URL}/api/v3/products?per_page={PER_PAGE}&page={page}&department={dept_id}"
            data = await get_json(url, client)
            
            if not data or 'data' not in data:
                print(f"❌ No data from department {dept_id}, page {page}")
                continue
                
            products = data['data']
            if not products:
                continue
                
            print(f"📦 Department {dept_id}: {len(products)} products (page {page})")
            all_products.extend(products)
            
            if test_mode and limit and len(all_products) >= limit:
                break
        
        # Check if we should continue to next page
        if test_mode and limit and len(all_products) >= limit:
            break
            
        # If no products found on this page across relevant departments, we're done
        if not any(data.get('data') for data in [await get_json(f"{BASE_URL}/api/v3/products?per_page={PER_PAGE}&page={page}&department={dept_id}", client) for dept_id in departments]):
            break
            
        page += 1
        
        # Safety check to prevent infinite loops
        if page > 50:
            print("⚠️ Reached page limit, stopping")
            break
    
    print(f"✅ Total products found: {len(all_products)}")
    return all_products[:limit] if test_mode and limit else all_products

async def enrich_details(products: list, client: httpx.AsyncClient, test_mode: bool = False, limit: int = None) -> list:
    """Enrich product details with additional information"""
    enriched_products = []
    
    for i, product in enumerate(products):
        if test_mode and limit and i >= limit:
            break
            
        product_id = product.get('id')
        if not product_id:
            continue
            
        print(f"🔍 Enriching product {i+1}/{len(products)}: {product.get('name', 'Unknown')}")
        
        # Get detailed product info
        detail_url = f"{BASE_URL}/api/v3/products/{product_id}"
        detail_data = await get_json(detail_url, client)
        
        if detail_data and 'data' in detail_data:
            # Merge basic product info with detailed info
            enriched_product = {**product, **detail_data['data']}
            enriched_products.append(enriched_product)
        else:
            # If detail fetch fails, use basic product info
            enriched_products.append(product)
        
        # Small delay to be respectful to the API
        await asyncio.sleep(0.1)
    
    return enriched_products

async def main():
    """Main scraping function"""
    args = parse_arguments()
    
    if args.test:
        print(f"🧪 TEST MODE: Scraping max {args.limit} products")
    else:
        print("🚀 FULL MODE: Scraping all food products")
    
    start_time = time.time()
    
    async with httpx.AsyncClient() as client:
        # Step 1: List all products
        print("\n📋 Step 1: Listing products...")
        products = await list_all_products(client, args.test, args.limit, args.batch)
        
        if not products:
            print("❌ No products found!")
            return
        
        # Step 2: Enrich with details
        print(f"\n🔍 Step 2: Enriching {len(products)} products...")
        enriched_products = await enrich_details(products, client, args.test, args.limit)
        
        # Step 3: Save to file
        # Generate filename based on mode
        if args.batch:
            filename = f"rema_products_batch_{args.batch}.jsonl"
        elif args.test:
            filename = "rema_products_test.jsonl"
        else:
            filename = "rema_products_full.jsonl"
        
        output_file = os.path.join(OUT_DIR, filename)
        print(f"\n💾 Step 3: Saving {len(enriched_products)} products to {output_file}...")
        
        with open(output_file, 'w', encoding='utf-8') as f:
            for product in enriched_products:
                f.write(json.dumps(product, ensure_ascii=False) + '\n')
        
        elapsed_time = time.time() - start_time
        print(f"\n🎉 Scraping completed in {elapsed_time:.1f} seconds!")
        print(f"📁 Output saved to: {output_file}")
        print(f"📊 Total products: {len(enriched_products)}")

if __name__ == "__main__":
    asyncio.run(main())
