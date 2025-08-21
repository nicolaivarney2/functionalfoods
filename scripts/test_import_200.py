#!/usr/bin/env python3
"""
Test Import 200 Products
Tests importing 200 products from the test sample to the import API.
"""

import json
import requests
import time

def load_test_products(file_path):
    """Load test products from JSONL file"""
    print(f"📂 Loading products from: {file_path}")
    
    products = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                product = json.loads(line.strip())
                products.append(product)
            except Exception as e:
                print(f"⚠️  Error parsing line: {e}")
                continue
    
    print(f"✅ Loaded {len(products)} products")
    return products

def test_import_api(products):
    """Test the import API with the products"""
    print(f"\n🚀 Testing import API with {len(products)} products...")
    print("=" * 60)
    
    # API endpoint
    api_url = "http://localhost:3000/api/admin/dagligvarer/import-rema-products"
    
    # Prepare the request
    payload = {
        "products": products
    }
    
    print(f"📡 Sending request to: {api_url}")
    print(f"📦 Products to import: {len(products)}")
    
    try:
        # Send the request
        start_time = time.time()
        response = requests.post(api_url, json=payload, timeout=300)  # 5 min timeout
        end_time = time.time()
        
        print(f"\n📊 API Response:")
        print(f"  Status: {response.status_code}")
        print(f"  Time: {end_time - start_time:.1f} seconds")
        
        if response.status_code == 200:
            result = response.json()
            print(f"  ✅ Success: {result.get('message', 'Import completed')}")
            print(f"  📊 New products: {result.get('newCount', 0)}")
            print(f"  📊 Updated products: {result.get('updatedCount', 0)}")
        else:
            print(f"  ❌ Error: {response.text[:200]}")
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection error: Make sure Next.js server is running on localhost:3000")
    except requests.exceptions.Timeout:
        print(f"❌ Timeout: Import took too long")
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    """Main function"""
    test_file = "data/rema_products_test_200.jsonl"
    
    if not os.path.exists(test_file):
        print(f"❌ Test file not found: {test_file}")
        return
    
    try:
        # Load test products
        products = load_test_products(test_file)
        
        if not products:
            print("❌ No products loaded")
            return
        
        # Test import
        test_import_api(products)
        
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    import os
    main()

