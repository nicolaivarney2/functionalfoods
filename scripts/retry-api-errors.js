const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const FALLBACK_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hamF4eWNmamd1bHR3ZHdmZmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMyNzYwNywiZXhwIjoyMDY5OTAzNjA3fQ.4ZEeQ-CS5OSOIOsoMNGzRdNOpbSvD5OII7wl8LRr7JQ';
const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  ((process.env.SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')).trim()
);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('Retrying products with API error subcategory...');
  const { data: failed, error } = await supabase
    .from('supermarket_products')
    .select('id,name')
    .eq('store', 'REMA 1000')
    .or('subcategory.eq.API Fejl,category.ilike.Ukategoriseret%,subcategory.is.null');

  if (error) {
    console.error('Fetch failed list error:', error);
    process.exit(1);
  }

  console.log(`Found ${failed.length} products to retry...`);

  let fixed = 0;
  for (const p of failed) {
    try {
      const res = await fetch(`https://api.digital.rema1000.dk/api/v3/products/${p.id}?include=department`);
      if (!res.ok) {
        console.log(`Skip ${p.id} - HTTP ${res.status}`);
        await sleep(150);
        continue;
      }
      const json = await res.json();
      const deptName = json?.department?.name || null;

      if (!deptName) {
        console.log(`No department for ${p.id}`);
        await sleep(150);
        continue;
      }

      const { error: upErr } = await supabase
        .from('supermarket_products')
        .update({ category: deptName, subcategory: deptName })
        .eq('id', p.id);

      if (upErr) {
        console.log(`Update error ${p.id}:`, upErr.message);
      } else {
        fixed++;
        console.log(`Fixed ${p.id}: ${deptName}`);
      }
      await sleep(150);
    } catch (e) {
      console.log(`Err ${p.id}: ${e.message}`);
      await sleep(150);
    }
  }

  console.log(`Done. Fixed ${fixed}/${failed.length}.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});


