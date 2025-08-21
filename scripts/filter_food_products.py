#!/usr/bin/env python3
"""
Food Product Filter
Filters out non-food items from REMA scraped data, keeping only real food products.
"""

import json
import os
from pathlib import Path

# Comprehensive list of non-food keywords to filter out
NON_FOOD_KEYWORDS = [
    # Clothing & Accessories
    'STRØMPE', 'HANDSKE', 'HUE', 'T-SHIRT', 'UNDERTØJ', 'BOXER', 'TRUSSE', 'TRUSSEINDLÆG',
    'HANDSKER', 'STRØMPEBUKS', 'KNÆSTRØMPE', 'ANKELSOKKER', 'GOLFSOK', 'SNEAKER SOKKER',
    'COZY STRØMPE', 'NO SHOW STRØMPE', 'BAMBUS STRØMPE', 'SHAPE STRØMPEBUKS',
    'SUPPORT STRØMPEBUKS', 'CREPE STRØMPEBUKS', 'SILKLOOK KNÆSTRØMPE',
    
    # Household & Non-food items
    'LÆSEBRILLER', 'PARAPLY', 'INSEKTGEL', 'REGN PONCHO', 'TASKEPARAPLY',
    'KONDITORFARVE', 'RASP', 'BAGEENZYM', 'MELBLANDING', 'BAGEPULVER',
    'KONDITORFARVE', 'BAGEENZYM', 'MELBLANDING', 'BAGEPULVER',
    
    # Health & Beauty (non-food)
    'VITAMIN', 'FISKEOLIE', 'MAGNESIUM', 'MULTIVITAMIN', 'KALK', 'D3-DRÅBER',
    'HALSTABLETTER', 'GRAVIDITETSTEST', 'BRUSETABLETTER', 'HUSK PSYLLIUM',
    'SPIDSKOMMEN', 'FISKEOLIE OMEGA 3',
    
    # Kitchen tools (non-food)
    'SKOHORN', 'KINASKO', 'SNEAKER ONE SIZE', 'T-SHIRT STR', 'HANDSKE MED FOER',
    'HANDSKER MAGIC GLOVE', 'HUE I STRIK', 'HANDSKE/LUFFE', 'TASKEPARAPLY'
]

def is_food_product(product_name):
    """Check if a product is actually food based on its name"""
    name_upper = product_name.upper()
    
    # Check for non-food keywords
    for keyword in NON_FOOD_KEYWORDS:
        if keyword in name_upper:
            return False
    
    # Additional checks for suspicious patterns
    if any(pattern in name_upper for pattern in ['STRØMPE', 'HANDSKE', 'HUE', 'T-SHIRT']):
        return False
    
    return True

def filter_food_products(input_file, output_file):
    """Filter out non-food products from the input file"""
    print(f"🔍 Filtering food products from: {input_file}")
    print("=" * 60)
    
    food_products = []
    non_food_products = []
    total_products = 0
    
    with open(input_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            try:
                product = json.loads(line.strip())
                product_name = product.get('name', '')
                
                if not product_name:
                    continue
                
                total_products += 1
                
                if is_food_product(product_name):
                    food_products.append(product)
                else:
                    non_food_products.append((line_num, product_name))
                
                # Progress indicator
                if total_products % 1000 == 0:
                    print(f"  📍 Processed {total_products} products...")
                    
            except json.JSONDecodeError:
                print(f"⚠️  JSON error on line {line_num}")
                continue
            except Exception as e:
                print(f"❌ Error on line {line_num}: {e}")
                continue
    
    # Save filtered food products
    print(f"\n💾 Saving {len(food_products)} food products to: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        for product in food_products:
            f.write(json.dumps(product, ensure_ascii=False) + '\n')
    
    # Print results
    print(f"\n📊 Filtering Results:")
    print(f"  🥗 Food products kept: {len(food_products)}")
    print(f"  🚫 Non-food products removed: {len(non_food_products)}")
    print(f"  📊 Total products processed: {total_products}")
    print(f"  🎯 Food percentage: {(len(food_products)/total_products*100):.1f}%")
    
    if non_food_products:
        print(f"\n❌ Sample of removed non-food items:")
        for line_num, name in non_food_products[:10]:
            print(f"  Linje {line_num}: {name}")
        if len(non_food_products) > 10:
            print(f"  ... og {len(non_food_products)-10} flere")
    
    return len(food_products), len(non_food_products)

def main():
    """Main function"""
    input_file = "data/rema_products_batch_1.jsonl"
    output_file = "data/rema_products_batch_1_filtered.jsonl"
    
    if not os.path.exists(input_file):
        print(f"❌ Input file not found: {input_file}")
        return
    
    print("🚀 Starting food product filtering...")
    print(f"📁 Input: {input_file}")
    print(f"📁 Output: {output_file}")
    print("=" * 60)
    
    try:
        food_count, non_food_count = filter_food_products(input_file, output_file)
        
        print(f"\n✅ Filtering completed successfully!")
        print(f"📁 Clean food file saved to: {output_file}")
        print(f"🥗 Ready to import {food_count} food products!")
        
    except Exception as e:
        print(f"❌ Filtering failed: {e}")

if __name__ == "__main__":
    main()

