#!/usr/bin/env python3
"""
Clean duplicate products from REMA JSON file
Removes duplicates based on product name and store
"""

import json
import sys
from pathlib import Path

def clean_duplicates(input_file, output_file):
    """Remove duplicate products from JSON file"""
    
    print(f"🔍 Reading {input_file}...")
    
    # Read all lines
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"📊 Found {len(lines)} total lines")
    
    # Parse products and track seen combinations
    seen = set()
    unique_products = []
    duplicates_removed = 0
    
    for i, line in enumerate(lines):
        try:
            product = json.loads(line.strip())
            
            # Create unique key based on name and store
            # Note: We don't have store in this data, so just use name
            key = product.get('name', '').lower().strip()
            
            if key and key not in seen:
                seen.add(key)
                unique_products.append(product)
            else:
                duplicates_removed += 1
                if duplicates_removed <= 10:  # Show first 10 duplicates
                    print(f"🗑️  Duplicate: {product.get('name', 'Unknown')}")
                
        except json.JSONDecodeError as e:
            print(f"⚠️  Error parsing line {i+1}: {e}")
            continue
    
    print(f"✅ Found {len(unique_products)} unique products")
    print(f"🗑️  Removed {duplicates_removed} duplicates")
    
    # Write unique products
    print(f"💾 Writing to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        for product in unique_products:
            f.write(json.dumps(product, ensure_ascii=False) + '\n')
    
    print(f"🎉 Done! Cleaned file saved as {output_file}")
    
    # Show some stats
    print(f"\n📈 Summary:")
    print(f"   Original: {len(lines)} products")
    print(f"   Cleaned:  {len(unique_products)} products")
    print(f"   Removed:  {duplicates_removed} duplicates")
    print(f"   Savings:  {((duplicates_removed / len(lines)) * 100):.1f}%")

if __name__ == "__main__":
    input_file = "scripts/data/rema_products_batch_1_filtered.jsonl"
    output_file = "scripts/data/rema_products_batch_1_filtered_clean.jsonl"
    
    if not Path(input_file).exists():
        print(f"❌ Input file not found: {input_file}")
        sys.exit(1)
    
    clean_duplicates(input_file, output_file)
