#!/usr/bin/env python3
"""
Debug Import
Tests importing a single product to debug the import process.
"""

import json
import requests

def debug_single_import():
    """Test importing a single product"""
    print("🔍 Debugging single product import...")
    
    # Load one product
    with open('data/rema_products_test_200.jsonl', 'r') as f:
        product = json.loads(f.readline())
    
    print(f"📦 Testing with product: {product.get('name')}")
    print(f"  ID: {product.get('id')}")
    print(f"  External ID will be: {str(product.get('id'))}")
    
    # Test API
    api_url = "http://localhost:3000/api/admin/dagligvarer/import-rema-products"
    payload = {"products": [product]}
    
    try:
        response = requests.post(api_url, json=payload, timeout=60)
        print(f"\n📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success: {result.get('message')}")
            print(f"📊 Import details: {result.get('import')}")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    debug_single_import()

