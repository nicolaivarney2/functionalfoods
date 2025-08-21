#!/usr/bin/env python3
"""
Import REMA products from JSONL to Supabase
Converts scraped data to your existing database schema
"""

import json
import os
import sys
from typing import Dict, List, Any
import httpx
from datetime import datetime
import asyncio
import argparse

# Configuration
SUPABASE_URL = "https://najaxycfjgultwdwffhv.supabase.co"
SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"  # Replace with your key

# Headers for Supabase API
HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json"
}

def load_jsonl(file_path: str) -> List[Dict[str, Any]]:
    """Load products from JSONL file"""
    products = []
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return products
    
    print(f"📖 Loading products from {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            try:
                product = json.loads(line.strip())
                products.append(product)
            except json.JSONDecodeError as e:
                print(f"⚠️ Error parsing line {line_num}: {e}")
                continue
    
    print(f"✅ Loaded {len(products)} products")
    return products

def transform_product(rema_product: Dict[str, Any]) -> Dict[str, Any]:
    """Transform REMA product to your database schema"""
    
    # Extract basic info
    product_id = rema_product.get("id")
    name = rema_product.get("name", "")
    description = rema_product.get("description", "")
    
    # Extract department/category
    department = rema_product.get("department", {})
    category = department.get("name", "Ukendt")
    
    # Extract images
    images = rema_product.get("images", [])
    image_url = images[0].get("medium", "") if images else ""
    
    # Extract prices
    prices = rema_product.get("prices", [])
    current_price = prices[0] if prices else {}
    
    price = current_price.get("price", 0)
    unit = current_price.get("compare_unit", "")
    unit_price = current_price.get("compare_unit_price", 0)
    is_on_sale = current_price.get("is_campaign", False)
    
    # Extract nutrition info
    nutrition_info = rema_product.get("nutrition_info", [])
    nutrition_dict = {}
    for item in nutrition_info:
        key = item.get("name", "").lower().replace(" ", "_")
        value = item.get("value", "")
        nutrition_dict[key] = value
    
    # Extract labels
    labels = rema_product.get("labels", [])
    label_names = [label.get("name", "") for label in labels]
    
    # Build transformed product
    transformed = {
        "id": f"rema-{product_id}",
        "name": name,
        "description": description,
        "category": category,
        "subcategory": get_subcategory(category),
        "price": price,
        "originalPrice": price,  # Will be updated if on sale
        "unit": unit,
        "unitPrice": unit_price,
        "isOnSale": is_on_sale,
        "saleEndDate": current_price.get("ending_at"),
        "imageUrl": image_url,
        "store": "REMA 1000",
        "available": rema_product.get("is_available_in_all_stores", True),
        "temperatureZone": rema_product.get("temperature_zone"),
        "nutritionInfo": nutrition_dict,
        "labels": label_names,
        "lastUpdated": datetime.now().isoformat(),
        "source": "rema1000"
    }
    
    return transformed

def get_subcategory(category: str) -> str:
    """Get subcategory based on main category"""
    subcategories = {
        'Frugt & grønt': 'Frugt',
        'Kød, fisk & fjerkræ': 'Kød',
        'Køl': 'Kødpålæg',
        'Ost m.v.': 'Fast ost',
        'Frost': 'Frosne grøntsager',
        'Mejeri': 'Mælk',
        'Kolonial': 'Tørvarer'
    }
    return subcategories.get(category, 'Andet')

async def import_to_supabase(products: List[Dict[str, Any]]) -> None:
    """Import products to Supabase via your existing API"""
    
    if not products:
        print("❌ No products to import")
        return
    
    print(f"🚀 Importing {len(products)} products to Supabase...")
    
    # Use your existing import-rema-products API endpoint
    api_url = "http://localhost:3000/api/admin/dagligvarer/import-rema-products"
    
    # Transform all products to match your API schema
    transformed_products = []
    for i, product in enumerate(products):
        try:
            # Transform to match your import-rema-products API schema
            transformed = {
                "id": product.get("id"),
                "name": product.get("name", ""),
                "description": product.get("description", ""),
                "underline": product.get("underline", ""),
                "department": product.get("department", {}),
                "prices": product.get("prices", []),
                "images": product.get("images", []),
                "is_available_in_all_stores": product.get("is_available_in_all_stores", True),
                "temperature_zone": product.get("temperature_zone"),
                "detail": product.get("detail", {}),
                "labels": product.get("labels", [])
            }
            transformed_products.append(transformed)
            
            if (i + 1) % 100 == 0:
                print(f"🔄 Transformed {i + 1}/{len(products)} products...")
                
        except Exception as e:
            print(f"⚠️ Error transforming product {i}: {e}")
            continue
    
    print(f"✅ Transformed {len(transformed_products)} products")
    
    # Import in batches to avoid timeouts
    batch_size = 50
    total_imported = 0
    
    for i in range(0, len(transformed_products), batch_size):
        batch = transformed_products[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(transformed_products) + batch_size - 1) // batch_size
        
        print(f"📦 Importing batch {batch_num}/{total_batches} ({len(batch)} products)...")
        
        try:
            # Send to your import-rema-products API
            import_data = {
                "products": batch
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(api_url, json=import_data, timeout=30.0)
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"✅ Batch {batch_num} imported successfully: {result.get('message', 'OK')}")
                    total_imported += len(batch)
                else:
                    print(f"❌ Batch {batch_num} failed: {response.status_code} - {response.text}")
            
        except Exception as e:
            print(f"❌ Error importing batch {batch_num}: {e}")
    
    print(f"🎉 Import completed! Total products: {total_imported}")

async def main():
    """Main import function"""
    print("🚀 Starting REMA products import to Supabase...")
    print("=" * 50)
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Import REMA products to Supabase')
    parser.add_argument('--input', required=True, help='Input JSONL file path')
    parser.add_argument('--limit', type=int, help='Limit number of products to import')
    
    args = parser.parse_args()
    
    try:
        # Step 1: Load products from JSONL
        products = load_jsonl(args.input)
        
        if not products:
            print("❌ No products found to import!")
            return
        
        # Apply limit if specified
        if args.limit:
            products = products[:args.limit]
            print(f"📊 Limiting import to {len(products)} products")
        
        # Step 2: Import to Supabase
        await import_to_supabase(products)
        
        print("\n🎉 Import completed successfully!")
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
