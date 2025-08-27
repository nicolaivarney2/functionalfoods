const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
  const pageSize = 1000;
  let from = 0;
  let fixed = 0;

  while (true) {
    const { data, error } = await supabase
      .from('supermarket_products')
      .select('id,name,category,subcategory,store')
      .eq('store', 'REMA 1000')
      .not('subcategory', 'is', null)
      .neq('subcategory', 'API Fejl')
      .or('category.is.null,category.ilike.Ukategoriseret%')
      .range(from, from + pageSize - 1);

    if (error) { console.error('Fetch error:', error); process.exit(1); }
    if (!data || data.length === 0) break;

    const updates = data.map(p => ({ id: p.id, category: p.subcategory }));
    const { error: upErr } = await supabase.from('supermarket_products').upsert(updates, { onConflict: 'id' });
    if (upErr) { console.error('Update error:', upErr); process.exit(1); }

    fixed += updates.length;
    console.log(`Updated ${fixed} products so far...`);
    from += pageSize;
  }

  console.log(`Done. Category now equals REMA subcategory for ${fixed} products.`);
})();
