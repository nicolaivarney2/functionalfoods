#!/usr/bin/env python3
"""
Create Test Sample
Extracts first 200 products from filtered food products for testing import.
"""

import json
import os

def create_test_sample(input_file, output_file, sample_size=200):
    """Create a test sample of products"""
    print(f"🔍 Creating test sample of {sample_size} products...")
    print(f"📁 Input: {input_file}")
    print(f"📁 Output: {output_file}")
    print("=" * 60)
    
    products = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        for i, line in enumerate(f):
            if i >= sample_size:
                break
            try:
                product = json.loads(line.strip())
                products.append(product)
            except Exception as e:
                print(f"⚠️  Error on line {i+1}: {e}")
                continue
    
    # Save test sample
    print(f"💾 Saving {len(products)} products to test sample...")
    with open(output_file, 'w', encoding='utf-8') as f:
        for product in products:
            f.write(json.dumps(product, ensure_ascii=False) + '\n')
    
    print(f"\n✅ Test sample created successfully!")
    print(f"📊 Products in sample: {len(products)}")
    print(f"📁 Test file: {output_file}")
    
    # Show sample of product names
    print(f"\n📝 Sample product names:")
    for i, product in enumerate(products[:10]):
        print(f"  {i+1}. {product.get('name', 'Unknown')}")
    if len(products) > 10:
        print(f"  ... og {len(products)-10} flere")
    
    return len(products)

def main():
    """Main function"""
    input_file = "data/rema_products_batch_1_filtered.jsonl"
    output_file = "data/rema_products_test_200.jsonl"
    
    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        return
    
    try:
        count = create_test_sample(input_file, output_file, 200)
        print(f"\n🎯 Ready to test import with {count} products!")
        
    except Exception as e:
        print(f"❌ Failed to create test sample: {e}")

if __name__ == "__main__":
    main()

