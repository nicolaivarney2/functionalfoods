#!/usr/bin/env python3
"""
Test script to import REMA products from Python scraper into Functionalfoods
"""

import json
import requests
import os
from typing import List, Dict, Any

# Configuration
FUNCTIONALFOODS_URL = "http://localhost:3000"  # Change if different
IMPORT_API = f"{FUNCTIONALFOODS_URL}/api/admin/dagligvarer/import-rema-products"
TEST_DATA_FILE = "scripts/data/rema_products.jsonl"

def load_test_products() -> List[Dict[str, Any]]:
    """Load test products from JSONL file"""
    products = []
    
    if not os.path.exists(TEST_DATA_FILE):
        print(f"❌ Test data file not found: {TEST_DATA_FILE}")
        print("💡 Run the scraper first: python3 rema_scraper.py --test --limit 5")
        return []
    
    with open(TEST_DATA_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                products.append(json.loads(line))
    
    print(f"📦 Loaded {len(products)} test products from {TEST_DATA_FILE}")
    return products

def test_import_api(products: List[Dict[str, Any]]) -> bool:
    """Test the import API with test products"""
    print(f"🔄 Testing import API: {IMPORT_API}")
    print(f"📊 Sending {len(products)} products...")
    
    # Show first product structure
    if products:
        print("📋 First product structure:")
        print(json.dumps(products[0], indent=2, ensure_ascii=False))
    
    try:
        response = requests.post(
            IMPORT_API,
            json={"products": products},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"📡 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Import successful!")
            print(f"📊 Result: {json.dumps(result, indent=2, ensure_ascii=False)}")
            return True
        else:
            print(f"❌ Import failed with status {response.status_code}")
            print(f"📄 Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection error - is Functionalfoods running on localhost:3000?")
        print("💡 Start your Next.js app: npm run dev")
        return False
    except Exception as e:
        print(f"❌ Error during import: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 Testing REMA products import to Functionalfoods")
    print("=" * 50)
    
    # Step 1: Load test products
    products = load_test_products()
    if not products:
        return False
    
    # Step 2: Test import API
    success = test_import_api(products)
    
    if success:
        print("\n🎉 Test completed successfully!")
        print("💡 You can now run the full scraper and import all products")
        print("   python3 rema_scraper.py")
    else:
        print("\n❌ Test failed - check the errors above")
    
    return success

if __name__ == "__main__":
    main()

