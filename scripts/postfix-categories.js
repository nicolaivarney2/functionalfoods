const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const FALLBACK_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hamF4eWNmamd1bHR3ZHdmZmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMyNzYwNywiZXhwIjoyMDY5OTAzNjA3fQ.4ZEeQ-CS5OSOIOsoMNGzRdNOpbSvD5OII7wl8LRr7JQ';
const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  ((process.env.SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')).trim()
);

async function run() {
  console.log('Aligning category to match REMA department name (subcategory)...');

  const pageSize = 1000;
  let from = 0;
  let totalUpdated = 0;

  while (true) {
    const { data, error } = await supabase
      .from('supermarket_products')
      .select('id,name,category,subcategory,store')
      .eq('store', 'REMA 1000')
      .not('subcategory', 'is', null)
      .neq('subcategory', 'API Fejl')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Fetch error:', error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;

    const candidates = data.filter(p => p.subcategory && p.category !== p.subcategory);
    for (const p of candidates) {
      const { error: upErr } = await supabase
        .from('supermarket_products')
        .update({ category: p.subcategory })
        .eq('id', p.id);
      if (upErr) {
        console.error(`Update error id=${p.id}:`, upErr);
        process.exit(1);
      }
      totalUpdated += 1;
      if (totalUpdated % 200 === 0) console.log(`Updated ${totalUpdated} products so far...`);
    }

    from += pageSize;
  }

  console.log(`Done. Category now equals REMA subcategory for ${totalUpdated} products.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});


