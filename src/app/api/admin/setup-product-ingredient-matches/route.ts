import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Setting up product_ingredient_matches table...')
    
    const supabase = createSupabaseServiceClient()
    
    // Try to create the table by attempting to insert a test record
    // This will fail if table doesn't exist, which is what we want to detect
    const { error: testError } = await supabase
      .from('product_ingredient_matches')
      .select('id')
      .limit(1)

    if (testError && (testError.message.includes('relation "product_ingredient_matches" does not exist') || testError.message.includes('Could not find the relation'))) {
      // Table doesn't exist - we need to create it manually in Supabase
      console.log('❌ Table does not exist - needs to be created manually in Supabase')
      return NextResponse.json({
        success: false,
        message: 'Table does not exist. Please run the SQL script in Supabase SQL editor.',
        sqlScript: `
-- Create product_ingredient_matches table for linking products to ingredients
CREATE TABLE IF NOT EXISTS product_ingredient_matches (
  id SERIAL PRIMARY KEY,
  product_external_id TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  confidence INTEGER DEFAULT 100,
  is_manual BOOLEAN DEFAULT false,
  match_type TEXT DEFAULT 'auto',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  FOREIGN KEY (product_external_id) REFERENCES supermarket_products(external_id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate matches
  UNIQUE(product_external_id, ingredient_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_ingredient_matches_product ON product_ingredient_matches(product_external_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredient_matches_ingredient ON product_ingredient_matches(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredient_matches_confidence ON product_ingredient_matches(confidence);
CREATE INDEX IF NOT EXISTS idx_product_ingredient_matches_type ON product_ingredient_matches(match_type);

-- Enable RLS
ALTER TABLE product_ingredient_matches ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access to product_ingredient_matches" ON product_ingredient_matches FOR SELECT USING (true);

-- Create policy for authenticated users to insert/update
CREATE POLICY "Allow authenticated users to insert product_ingredient_matches" ON product_ingredient_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update product_ingredient_matches" ON product_ingredient_matches FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated users to delete product_ingredient_matches" ON product_ingredient_matches FOR DELETE USING (true);
        `
      })
    } else if (testError) {
      throw new Error(`Failed to test table: ${testError.message}`)
    }

    // If we get here, table exists
    console.log('✅ product_ingredient_matches table already exists')

    return NextResponse.json({
      success: true,
      message: 'product_ingredient_matches table already exists'
    })

  } catch (error) {
    console.error('❌ Error setting up product_ingredient_matches table:', error)
    return NextResponse.json({
      success: false,
      message: `Failed to setup table: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}
