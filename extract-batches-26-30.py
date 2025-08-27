#!/usr/bin/env python3
"""
Extract batches 26-30 from the clean REMA products file
For completing the failed import
"""

import json
from pathlib import Path

def extract_batches_26_30():
    """Extract only batches 26-30 from the clean file"""
    
    input_file = "scripts/data/rema_products_batch_1_filtered_clean.jsonl"
    output_file = "scripts/data/rema_products_batches_26_30.jsonl"
    
    if not Path(input_file).exists():
        print(f"❌ Input file not found: {input_file}")
        return
    
    print(f"🔍 Reading {input_file}...")
    
    # Read all lines
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    total_lines = len(lines)
    print(f"📊 Found {total_lines} total lines")
    
    # Calculate batch boundaries
    # Batch 26: lines 2501-2600 (index 2500-2599)
    # Batch 27: lines 2601-2700 (index 2600-2699)
    # Batch 28: lines 2701-2800 (index 2700-2799)
    # Batch 29: lines 2801-2900 (index 2800-2899)
    # Batch 30: lines 2901-2915 (index 2900-2914)
    
    start_line = 2500  # Start of batch 26 (0-indexed)
    end_line = total_lines  # End of file (batch 30)
    
    if start_line >= total_lines:
        print(f"❌ Batch 26 starts at line {start_line + 1}, but file only has {total_lines} lines")
        return
    
    # Extract batches 26-30
    selected_lines = lines[start_line:end_line]
    selected_count = len(selected_lines)
    
    print(f"✅ Extracting batches 26-30:")
    print(f"   Start line: {start_line + 1}")
    print(f"   End line: {end_line}")
    print(f"   Products: {selected_count}")
    
    # Generate new IDs starting from 1
    new_products = []
    for i, line in enumerate(selected_lines):
        try:
            product = json.loads(line.strip())
            # Generate new ID starting from 1
            new_id = i + 1
            product['id'] = new_id
            new_products.append(product)
        except json.JSONDecodeError:
            print(f"⚠️  Error parsing line {start_line + i + 1}")
            continue
    
    print(f"🆔 Generated new IDs: 1 to {len(new_products)}")
    
    # Write selected batches with new IDs
    print(f"💾 Writing to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        for product in new_products:
            f.write(json.dumps(product, ensure_ascii=False) + '\n')
    
    print(f"🎉 Done! Extracted {len(new_products)} products from batches 26-30")
    print(f"📁 File saved as: {output_file}")
    
    # Show first few products for verification
    print(f"\n🔍 First few products in extracted file:")
    for i, product in enumerate(new_products[:3]):
        print(f"   {i+1}. ID: {product.get('id')} - {product.get('name', 'Unknown')}")

if __name__ == "__main__":
    extract_batches_26_30()
