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
    parser.add_argument('--delta', action='store_true',
                       help='Run in delta update mode (check for price changes and offer updates)')
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
    """List all products from REMA's API with proper pagination"""
    all_products = []
    page = 1
    per_page = 100
    
    print(f"🔍 Scraping all products from REMA's API...")
    
    while True:
        if test_mode and limit and len(all_products) >= limit:
            break
            
        print(f"📦 Page {page}: Fetching {per_page} products...")
        
        # Get products from current page
        url = f"{BASE_URL}/api/v3/products?per_page={per_page}&page={page}"
        data = await get_json(url, client)
        
        if not data or 'data' not in data:
            print(f"⚠️ No data received from page {page}")
            break
            
        products = data['data']
        if not products:
            print(f"✅ No more products on page {page}")
            break
            
        print(f"📦 Page {page}: Found {len(products)} products")
        all_products.extend(products)
        
        # Check pagination info
        if 'meta' in data and 'pagination' in data['meta']:
            pagination = data['meta']['pagination']
            current_page = pagination.get('current_page', page)
            last_page = pagination.get('last_page', 0)
            total = pagination.get('total', 0)
            
            print(f"📊 Page {current_page}/{last_page} - Total: {total} products")
            
            if current_page >= last_page:
                print(f"✅ Reached last page ({last_page})")
                break
        else:
            # Fallback: if no pagination info, stop after reasonable number of pages
            if page > 50:
                print("⚠️ Reached page limit (50), stopping")
                break
        
        page += 1
        
        # Small delay to be respectful to the API
        await asyncio.sleep(0.1)
    
    print(f"✅ Total products found: {len(all_products)}")
    return all_products[:limit] if test_mode and limit else all_products

async def delta_price_check(client: httpx.AsyncClient, existing_products: list) -> list:
    """Check for price changes and offer status updates (delta update)"""
    print(f"🔄 Running delta price check for {len(existing_products)} existing products...")
    
    updated_products = []
    changes_found = 0
    
    for i, existing_product in enumerate(existing_products):
        if i % 100 == 0:
            print(f"🔄 Checking product {i+1}/{len(existing_products)}...")
            
        product_id = existing_product.get('id')
        if not product_id:
            continue
            
        # Get current price info (without full details)
        price_url = f"{BASE_URL}/api/v3/products/{product_id}"
        current_data = await get_json(price_url, client)
        
        if not current_data or 'data' not in current_data:
            continue
            
        current_product = current_data['data']
        current_prices = current_product.get('prices', [])
        
        # Check for price changes
        price_changed = False
        offer_status_changed = False
        
        # Compare with existing product
        existing_prices = existing_product.get('prices', [])
        
        if len(current_prices) != len(existing_prices):
            price_changed = True
        else:
            for i, (current_price, existing_price) in enumerate(zip(current_prices, existing_prices)):
                if (current_price.get('price') != existing_price.get('price') or
                    current_price.get('is_advertised') != existing_price.get('is_advertised') or
                    current_price.get('is_campaign') != existing_price.get('is_campaign')):
                    price_changed = True
                    break
        
        if price_changed:
            changes_found += 1
            # Update the product with new price info
            updated_product = {**existing_product, **current_product}
            updated_products.append(updated_product)
            
            if changes_found <= 5:  # Show first 5 changes
                old_price = existing_prices[0].get('price') if existing_prices else 'Unknown'
                new_price = current_prices[0].get('price') if current_prices else 'Unknown'
                print(f"💰 Price change: {existing_product.get('name')} - {old_price} → {new_price}")
        
        # Small delay to be respectful to the API
        await asyncio.sleep(0.05)
    
    print(f"✅ Delta check complete: {changes_found} products with changes")
    return updated_products

async def upsert_products(products: list, client: httpx.AsyncClient, mode: str = "full") -> dict:
    """Upsert products: update existing ones and add new ones without destroying data"""
    print(f"🔄 Running {mode} upsert for {len(products)} products...")
    
    stats = {
        "total": len(products),
        "updated": 0,
        "added": 0,
        "unchanged": 0,
        "errors": 0
    }
    
    for i, product in enumerate(products):
        if i % 100 == 0:
            print(f"🔄 Processing product {i+1}/{len(products)}...")
            
        product_id = product.get('id')
        if not product_id:
            stats["errors"] += 1
            continue
            
        try:
            # Check if product exists (you would implement this based on your database)
            # For now, we'll assume all products are "new" since we're doing a full scrape
            if mode == "full":
                # Full scrape mode - treat as new product
                stats["added"] += 1
            elif mode == "delta":
                # Delta mode - check if price changed
                # This would compare with existing database record
                stats["updated"] += 1
            else:
                stats["unchanged"] += 1
                
        except Exception as e:
            print(f"❌ Error processing product {product_id}: {e}")
            stats["errors"] += 1
            continue
        
        # Small delay to be respectful to the API
        await asyncio.sleep(0.01)
    
    print(f"✅ Upsert complete:")
    print(f"   📊 Total: {stats['total']}")
    print(f"   ➕ Added: {stats['added']}")
    print(f"   🔄 Updated: {stats['updated']}")
    print(f"   ⏸️  Unchanged: {stats['unchanged']}")
    print(f"   ❌ Errors: {stats['errors']}")
    
    return stats

async def enrich_details(products: list, client: httpx.AsyncClient, test_mode: bool = False, limit: int = None) -> list:
    """Enrich product details with additional information"""
    enriched_products = []
    
    # Department ID to category name mapping
    department_mapping = {
        # Original mapping (probably wrong)
        1: "Brød & kager",
        2: "Frugt & grønt",
        3: "Kød, fisk & fjerkræ",
        4: "Mejeri",  # Køl
        5: "Frost",
        6: "Mejeri",
        7: "Mejeri",  # Ost m.v.
        8: "Kolonial",
        9: "Drikkevarer",
        
        # CORRECTED REMA department IDs based on actual data
        40: "Kød, fisk & fjerkræ",  # Køl - kølede madvarer som leverpostej, sild, etc.
        50: "Færdigretter & takeaway",  # Pasta, lasagne, etc.
        70: "Ost & mejeri",  # Gouda, Havarti, etc.
        80: "Kolonial",  # Marmelade, ris, etc.
        81: "Frugt & grønt",
        82: "Kød, fisk & fjerkræ",
        83: "Mejeri",
        84: "Frost",
        85: "Brød & kager",
        86: "Drikkevarer",  # This is the correct mapping for drinks
        87: "Snacks & slik",
        88: "Husholdning & rengøring",
        89: "Baby & børn",
        90: "Drikkevarer",  # FIXED: This was incorrectly mapped to "Kæledyr"
        100: "Husholdning & rengøring",
        120: "Personlig pleje",
        130: "Snacks & slik",
        140: "Kiosk",  # Kiosk produkter
        160: "Nemt & hurtigt"  # Convenience products
    }
    
    for i, product in enumerate(products):
        if test_mode and limit and i >= limit:
            break
            
        product_id = product.get('id')
        if not product_id:
            continue
            
        print(f"🔍 Enriching product {i+1}/{len(products)}: {product.get('name', 'Unknown')}")
        
        # Get detailed product info
        detail_url = f"{BASE_URL}/api/v3/products/{product_id}?include=department"
        detail_data = await get_json(detail_url, client)
        
        if detail_data and 'data' in detail_data:
            # Merge basic product info with detailed info
            enriched_product = {**product, **detail_data['data']}
            
            # Extract and map category from department
            if 'department' in detail_data['data']:
                department = detail_data['data']['department']
                if department and 'id' in department:
                    dept_id = department['id']
                    dept_name = department.get('name', '')
                    
                    # Try to map by ID first
                    category_name = department_mapping.get(dept_id, None)
                    
                    if category_name:
                        print(f"   📍 Category: {category_name} (dept {dept_id})")
                    else:
                        # Fallback: try to map by department name
                        dept_name_lower = dept_name.lower()
                        if 'kolonial' in dept_name_lower:
                            category_name = "Kolonial"
                        elif 'frugt' in dept_name_lower or 'grønt' in dept_name_lower:
                            category_name = "Frugt & grønt"
                        elif 'kød' in dept_name_lower or 'fisk' in dept_name_lower:
                            category_name = "Kød, fisk & fjerkræ"
                        elif 'mejeri' in dept_name_lower or 'ost' in dept_name_lower:
                            category_name = "Mejeri"
                        elif 'frost' in dept_name_lower:
                            category_name = "Frost"
                        elif 'brød' in dept_name_lower or 'kage' in dept_name_lower:
                            category_name = "Brød & kager"
                        elif 'drikke' in dept_name_lower:
                            category_name = "Drikkevarer"
                        else:
                            category_name = f"Ukategoriseret (dept {dept_id}: {dept_name})"
                        
                        print(f"   📍 Category: {category_name} (dept {dept_id}: {dept_name})")
                    
                    enriched_product['category'] = category_name
                    enriched_product['subcategory'] = dept_name
                else:
                    enriched_product['category'] = "Ukategoriseret"
                    enriched_product['subcategory'] = "Ukategoriseret"
            else:
                enriched_product['category'] = "Ukategoriseret"
                enriched_product['subcategory'] = "Ukategoriseret"
            
            enriched_products.append(enriched_product)
        else:
            # If detail fetch fails, use basic product info with default category
            product['category'] = "Ukategoriseret"
            product['subcategory'] = "Ukategoriseret"
            enriched_products.append(product)
        
        # Small delay to be respectful to the API
        await asyncio.sleep(0.1)
    
    return enriched_products

async def main():
    """Main scraping function"""
    args = parse_arguments()
    
    if args.test:
        print(f"🧪 TEST MODE: Scraping max {args.limit} products")
    elif args.delta:
        print("🔄 DELTA MODE: Checking price changes and offer updates")
    else:
        print("🚀 FULL MODE: Scraping all products with categories and prices")
    
    start_time = time.time()
    
    async with httpx.AsyncClient() as client:
        if args.delta:
            # Delta mode: load existing products and check for changes
            print("\n📋 Step 1: Loading existing products...")
            # This would load from your database
            # For now, we'll simulate with empty list
            existing_products = []
            
            print(f"\n🔄 Step 2: Running delta price check...")
            updated_products = await delta_price_check(client, existing_products)
            
            print(f"\n💾 Step 3: Saving {len(updated_products)} updated products...")
            # This would update your database
            stats = await upsert_products(updated_products, client, "delta")
            
        else:
            # Full mode: scrape all products
            print("\n📋 Step 1: Listing all products...")
            products = await list_all_products(client, args.test, args.limit, args.batch)
            
            if not products:
                print("❌ No products found!")
                return
            
            print(f"\n🔍 Step 2: Enriching {len(products)} products with categories and prices...")
            enriched_products = await enrich_details(products, client, args.test, args.limit)
            
            print(f"\n💾 Step 3: Saving {len(enriched_products)} products...")
            # This would save to your database
            stats = await upsert_products(enriched_products, client, "full")
        
        # Generate filename based on mode
        if args.delta:
            filename = "rema_products_delta.jsonl"
        elif args.batch:
            filename = f"rema_products_batch_{args.batch}.jsonl"
        elif args.test:
            filename = "rema_products_test.jsonl"
        else:
            filename = "rema_products_full.jsonl"
        
        output_file = os.path.join(OUT_DIR, filename)
        print(f"\n💾 Step 4: Saving to {output_file}...")
        
        # Save to file (this would be replaced with database operations)
        products_to_save = updated_products if args.delta else enriched_products
        with open(output_file, 'w', encoding='utf-8') as f:
            for product in products_to_save:
                f.write(json.dumps(product, ensure_ascii=False) + '\n')
        
        elapsed_time = time.time() - start_time
        print(f"\n🎉 Scraping completed in {elapsed_time:.1f} seconds!")
        print(f"📁 Output saved to: {output_file}")
        print(f"📊 Total products: {len(products_to_save)}")
        
        if args.delta:
            print(f"🔄 Delta update stats:")
            print(f"   📊 Total checked: {stats['total']}")
            print(f"   🔄 Updated: {stats['updated']}")
            print(f"   ➕ Added: {stats['added']}")
            print(f"   ⏸️  Unchanged: {stats['unchanged']}")
            print(f"   ❌ Errors: {stats['errors']}")

if __name__ == "__main__":
    asyncio.run(main())
