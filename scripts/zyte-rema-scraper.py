#!/usr/bin/env python3
"""
Zyte-based REMA 1000 Scraper

This script uses Zyte API to bypass anti-bot protection and scrape
REMA 1000 product data from https://shop.rema1000.dk/

Prerequisites:
    pip install requests

Usage:
    1. Set your Zyte API key: export ZYTE_API_KEY="your_key_here"
    2. Run: python scripts/zyte-rema-scraper.py

Output:
    - rema-products-YYYY-MM-DD-HH-mm.json (full product data)
    - rema-stats-YYYY-MM-DD-HH-mm.json (scraping statistics)
"""

import os
import json
import base64
import requests
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
import concurrent.futures
from urllib.parse import urljoin, urlparse

# Configuration
ZYTE_API_KEY = os.getenv("ZYTE_API_KEY")
if not ZYTE_API_KEY:
    print("❌ Please set ZYTE_API_KEY environment variable")
    exit(1)

BASE_URL = "https://shop.rema1000.dk/"
MAX_WORKERS = 5  # Concurrent requests
DELAY_BETWEEN_BATCHES = 1  # Seconds
MAX_PAGES_PER_CATEGORY = 50

# Zyte API endpoint
ZYTE_API_URL = "https://api.zyte.com/v1/extract"
ZYTE_AUTH = (ZYTE_API_KEY, "")

def log(message: str, *args):
    """Log with timestamp"""
    print(f"[{datetime.now().isoformat()}] {message}", *args)

def zyte_request(payload: Dict) -> Dict:
    """Make a request to Zyte API"""
    try:
        response = requests.post(
            ZYTE_API_URL,
            auth=ZYTE_AUTH,
            headers={"Accept-Encoding": "gzip, deflate, br"},
            json=payload,
            timeout=120
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        log(f"❌ Zyte request failed: {e}")
        raise

def decode_response_body(body_b64: str) -> Any:
    """Decode base64 response body to JSON"""
    try:
        decoded = base64.b64decode(body_b64).decode('utf-8')
        return json.loads(decoded)
    except Exception as e:
        log(f"❌ Failed to decode response body: {e}")
        return None

def discover_api_endpoints() -> List[str]:
    """Use networkCapture to discover REMA API endpoints"""
    log("🔍 Discovering API endpoints using Zyte networkCapture...")
    
    payload = {
        "url": BASE_URL,
        "geolocation": "DK",
        "networkCapture": [
            {
                "filterType": "url", 
                "matchType": "contains", 
                "value": "api",
                "httpResponseBody": True
            }
        ],
        "actions": [
            {"action": "waitForResponse", "url": {"matchType": "contains", "value": "api"}},
            {"action": "scrollBottom"},
            {"action": "wait", "seconds": 2}
        ]
    }
    
    result = zyte_request(payload)
    endpoints = []
    
    for capture in result.get("networkCapture", []):
        url = capture.get("url", "")
        if "api" in url.lower():
            endpoints.append(url)
            
            # Try to decode and analyze the response
            if capture.get("httpResponseBody"):
                data = decode_response_body(capture["httpResponseBody"])
                if data:
                    log(f"✅ Found API endpoint: {url}")
                    if isinstance(data, dict):
                        log(f"   Keys: {list(data.keys())[:10]}")
                    elif isinstance(data, list):
                        log(f"   Array with {len(data)} items")
    
    unique_endpoints = list(set(endpoints))
    log(f"📡 Discovered {len(unique_endpoints)} unique API endpoints")
    return unique_endpoints

def fetch_json_via_zyte(url: str) -> Optional[Dict]:
    """Fetch JSON data from URL via Zyte HTTP mode"""
    payload = {
        "url": url,
        "httpResponseBody": True,
        "geolocation": "DK"
    }
    
    try:
        result = zyte_request(payload)
        if result.get("httpResponseBody"):
            return decode_response_body(result["httpResponseBody"])
    except Exception as e:
        log(f"❌ Failed to fetch {url}: {e}")
    
    return None

def find_product_endpoints(discovered_endpoints: List[str]) -> Dict[str, str]:
    """Test discovered endpoints to find product and category APIs"""
    log("🎯 Testing endpoints for product data...")
    
    # Common patterns to test
    test_patterns = [
        "/api/products",
        "/api/v1/products", 
        "/api/v2/products",
        "/api/v3/products",
        "/webapi/products",
        "/api/categories",
        "/api/v1/categories",
        "/api/departments",
        "/api/search"
    ]
    
    # Add discovered endpoints to test patterns
    base_urls = set()
    for endpoint in discovered_endpoints:
        parsed = urlparse(endpoint)
        base_urls.add(f"{parsed.scheme}://{parsed.netloc}")
    
    endpoints_to_test = []
    for base_url in base_urls:
        for pattern in test_patterns:
            endpoints_to_test.append(urljoin(base_url, pattern))
    
    # Add discovered endpoints
    endpoints_to_test.extend(discovered_endpoints)
    
    working_endpoints = {}
    
    for url in endpoints_to_test:
        log(f"🔍 Testing: {url}")
        data = fetch_json_via_zyte(url)
        
        if data:
            if isinstance(data, list) and len(data) > 0:
                # Looks like a product or category list
                first_item = data[0]
                if any(key in first_item for key in ['name', 'title', 'price', 'id', 'productId']):
                    working_endpoints['products'] = url
                    log(f"✅ Found products endpoint: {url}")
                elif any(key in first_item for key in ['category', 'categoryName', 'department']):
                    working_endpoints['categories'] = url
                    log(f"✅ Found categories endpoint: {url}")
            
            elif isinstance(data, dict):
                # Check if it's a paginated response
                if 'products' in data or 'items' in data or 'results' in data:
                    working_endpoints['products'] = url
                    log(f"✅ Found paginated products endpoint: {url}")
                elif 'categories' in data or 'departments' in data:
                    working_endpoints['categories'] = url
                    log(f"✅ Found categories endpoint: {url}")
        
        time.sleep(0.5)  # Be respectful
        
        # Stop if we found both
        if 'products' in working_endpoints and 'categories' in working_endpoints:
            break
    
    return working_endpoints

def scrape_categories(categories_url: str) -> List[Dict]:
    """Scrape category data"""
    log(f"📂 Scraping categories from: {categories_url}")
    
    data = fetch_json_via_zyte(categories_url)
    if not data:
        # Fallback categories
        log("⚠️ Using fallback categories")
        return [
            {"id": 1, "name": "Frugt & Grønt"},
            {"id": 2, "name": "Kød & Fisk"},
            {"id": 3, "name": "Mejeriprodukter"},
            {"id": 4, "name": "Brød & Kager"},
            {"id": 5, "name": "Frost"},
            {"id": 6, "name": "Drikkevarer"},
            {"id": 7, "name": "Snacks & Slik"},
            {"id": 8, "name": "Konserves"},
            {"id": 9, "name": "Husholdning"},
            {"id": 10, "name": "Personlig Pleje"}
        ]
    
    # Handle different response structures
    categories = []
    if isinstance(data, list):
        categories = data
    elif isinstance(data, dict):
        categories = data.get('categories', data.get('departments', data.get('items', [])))
    
    log(f"📂 Found {len(categories)} categories")
    return categories

def scrape_products_paginated(products_url: str, category_id: Optional[str] = None) -> List[Dict]:
    """Scrape products with pagination"""
    all_products = []
    page = 1
    
    while page <= MAX_PAGES_PER_CATEGORY:
        # Build URL with pagination and category filter
        url = products_url
        params = []
        
        if "?" in url:
            url_parts = url.split("?")
            url = url_parts[0]
            if len(url_parts) > 1:
                params.append(url_parts[1])
        
        params.append(f"page={page}")
        params.append("limit=50")
        
        if category_id:
            params.append(f"category={category_id}")
        
        full_url = f"{url}?{'&'.join(params)}"
        
        log(f"📄 Fetching page {page}: {full_url}")
        data = fetch_json_via_zyte(full_url)
        
        if not data:
            log(f"❌ No data for page {page}, stopping")
            break
        
        # Extract products from response
        products = []
        if isinstance(data, list):
            products = data
        elif isinstance(data, dict):
            products = (data.get('products') or 
                       data.get('items') or 
                       data.get('results') or 
                       data.get('data', []))
        
        if not products or len(products) == 0:
            log(f"📄 No products on page {page}, stopping pagination")
            break
        
        # Transform products
        for product_data in products:
            transformed = transform_product(product_data)
            if transformed:
                all_products.append(transformed)
        
        log(f"📄 Page {page}: {len(products)} products (Total: {len(all_products)})")
        
        # Stop if we got fewer products than expected (end of data)
        if len(products) < 50:
            log(f"📄 Got {len(products)} products (< 50), assuming end of data")
            break
        
        page += 1
        time.sleep(DELAY_BETWEEN_BATCHES)
    
    return all_products

def transform_product(product_data: Dict) -> Optional[Dict]:
    """Transform raw product data to our schema"""
    try:
        # Handle nested product data
        product = product_data.get('product', product_data)
        
        # Skip if essential data is missing
        if not any(key in product for key in ['id', 'productId', 'barcode', 'name', 'title']):
            return None
        
        # Extract ID
        external_id = str(product.get('id') or 
                         product.get('productId') or 
                         product.get('barcode') or 
                         product.get('sku', ''))
        
        if not external_id:
            return None
        
        # Extract name
        name = (product.get('name') or 
                product.get('title') or 
                product.get('displayName') or 
                'Unknown Product')
        
        # Extract price information
        current_price = None
        original_price = None
        on_sale = False
        
        # Try different price fields
        price_fields = ['price', 'currentPrice', 'salePrice', 'unitPrice']
        for field in price_fields:
            if field in product and product[field] is not None:
                try:
                    current_price = float(product[field])
                    break
                except (ValueError, TypeError):
                    continue
        
        # Check for original/list price
        orig_price_fields = ['originalPrice', 'listPrice', 'regularPrice']
        for field in orig_price_fields:
            if field in product and product[field] is not None:
                try:
                    original_price = float(product[field])
                    if current_price and original_price > current_price:
                        on_sale = True
                    break
                except (ValueError, TypeError):
                    continue
        
        # Extract other fields
        category = (product.get('category') or 
                   product.get('categoryName') or 
                   product.get('department') or 
                   'Uncategorized')
        
        return {
            'external_id': external_id,
            'name': name,
            'category': category,
            'price': current_price,
            'original_price': original_price,
            'on_sale': on_sale,
            'description': product.get('description') or product.get('shortDescription'),
            'brand': product.get('brand') or product.get('manufacturer'),
            'image_url': product.get('imageUrl') or product.get('image') or product.get('thumbnail'),
            'available': product.get('available', True) and product.get('inStock', True),
            'last_updated': datetime.now().isoformat(),
            'source': 'rema1000'
        }
        
    except Exception as e:
        log(f"❌ Transform error: {e}")
        return None

def save_results(products: List[Dict], stats: Dict):
    """Save results to JSON files"""
    timestamp = datetime.now().strftime("%Y-%m-%d-%H-%M")
    
    # Ensure output directory exists
    os.makedirs("scraped-data", exist_ok=True)
    
    # Save products
    products_file = f"scraped-data/rema-products-{timestamp}.json"
    with open(products_file, 'w', encoding='utf-8') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)
    
    # Save stats  
    stats_file = f"scraped-data/rema-stats-{timestamp}.json"
    with open(stats_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    
    log(f"📁 Results saved:")
    log(f"   • Products: {products_file}")
    log(f"   • Stats: {stats_file}")

def main():
    """Main scraping function"""
    log("🚀 Starting Zyte-powered REMA 1000 scraper...")
    start_time = time.time()
    
    try:
        # Step 1: Discover API endpoints
        discovered_endpoints = discover_api_endpoints()
        
        # Step 2: Find working product/category endpoints
        working_endpoints = find_product_endpoints(discovered_endpoints)
        
        if not working_endpoints:
            log("❌ No working API endpoints found!")
            return
        
        log(f"✅ Working endpoints: {working_endpoints}")
        
        # Step 3: Scrape categories (if endpoint available)
        categories = []
        if 'categories' in working_endpoints:
            categories = scrape_categories(working_endpoints['categories'])
        
        # Step 4: Scrape products
        all_products = []
        
        if 'products' in working_endpoints:
            products_url = working_endpoints['products']
            
            if categories:
                # Scrape by category
                for category in categories[:10]:  # Limit for testing
                    log(f"🏷️ Scraping category: {category.get('name', 'Unknown')}")
                    category_products = scrape_products_paginated(
                        products_url, 
                        str(category.get('id', ''))
                    )
                    all_products.extend(category_products)
                    time.sleep(DELAY_BETWEEN_BATCHES)
            else:
                # Scrape all products
                log("🛒 Scraping all products...")
                all_products = scrape_products_paginated(products_url)
        
        # Step 5: Generate statistics
        scrape_time = time.time() - start_time
        stats = {
            'timestamp': datetime.now().isoformat(),
            'scrape_time_seconds': round(scrape_time, 2),
            'total_products': len(all_products),
            'products_on_sale': sum(1 for p in all_products if p.get('on_sale')),
            'categories': len(set(p.get('category', 'Unknown') for p in all_products)),
            'average_price': round(sum(p.get('price', 0) for p in all_products if p.get('price')) / len(all_products), 2) if all_products else 0,
            'working_endpoints': working_endpoints,
            'discovered_endpoints': discovered_endpoints
        }
        
        # Step 6: Save results
        save_results(all_products, stats)
        
        # Step 7: Display summary
        log("✅ Scraping completed!")
        log(f"📊 Results:")
        log(f"   • Products: {stats['total_products']}")
        log(f"   • On Sale: {stats['products_on_sale']}")
        log(f"   • Categories: {stats['categories']}")
        log(f"   • Average Price: {stats['average_price']} DKK")
        log(f"   • Scrape Time: {stats['scrape_time_seconds']}s")
        
        if stats['total_products'] == 0:
            log("❌ No products were scraped. Check endpoints and response structure.")
            return
        
        log("🎉 Ready to upload to your admin interface!")
        
    except Exception as e:
        log(f"❌ Scraping failed: {e}")
        raise

if __name__ == "__main__":
    main()
