# Database Setup Instructions

## 🗄️ Setup Required Tables for Ingredient Matching

Du skal oprette disse tabeller i Supabase for at matching systemet kan gemme data.

### **Step 1: Opret Tabeller i Supabase**

1. **Log ind på Supabase Dashboard**
2. **Gå til "SQL Editor"**
3. **Kopi indholdet af `create-ingredient-tables.sql`**
4. **Kør SQL scriptet**

### **Step 2: Verificer at Tabellerne er Oprettet**

Kør denne SQL for at tjekke:
```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('frida_ingredients', 'ingredient_matches');

-- Check sample data
SELECT COUNT(*) as frida_count FROM frida_ingredients;
SELECT COUNT(*) as current_ingredients FROM ingredients;
```

**Forventet resultat:**
- `frida_ingredients` table: ✅ Eksisterer 
- `ingredient_matches` table: ✅ Eksisterer
- `10 Frida ingredients` indsat
- `X current ingredients` fra din database

---

## 🔧 **Test at Matching Interface Virker**

Efter tabel oprettelse:

1. **Gå til:** `http://localhost:3000/admin/ingredient-matching`
2. **Confirm nogle matches**
3. **Klik "Save All Matches"`**
4. **Genindlæs siden** - confirmed matches skal være gemt

---

## 📊 **Database Structure Overview**

### `frida_ingredients` Table
```sql
- id (text, primary key)
- name (text) - "Mandel, rå"  
- category (text) - "nødder"
- calories, protein, carbs, fat, fiber (numeric)
- vitamins, minerals (jsonb) - {"E": 25.63, "B3": 3.618}
- source, frida_id, is_active, timestamps
```

### `ingredient_matches` Table  
```sql
- id (serial, primary key)
- recipe_ingredient_id (text) - Links to your ingredients table
- frida_ingredient_id (text) - Links to frida_ingredients table
- confidence (integer) - 0-100%
- is_manual (boolean) - true for admin confirmed matches
- match_type (text) - 'manual', 'exact', 'fuzzy', etc.
- timestamps
```

### `ingredient_matches_with_details` View
Kombinerer data fra begge tabeller for nem querying.

---

## 🚀 **Næste Skridt Efter Setup**

1. **✅ Test matching interface** - Confirm/Save should work
2. **📂 Upload full Frida database** - 130k ingredients instead of 10
3. **🔄 Match all ingredients** - One-time setup for all recipe ingredients
4. **⚡ Enable automatic nutrition calculation** - Based on matches

---

## 🔍 **Troubleshooting**

### Problem: "Error saving matches"
- **Check:** Are tables created correctly?
- **Check:** Is Supabase connection working?
- **Test:** Run `SELECT * FROM ingredient_matches LIMIT 1`

### Problem: "No Frida ingredients found"  
- **Check:** `SELECT COUNT(*) FROM frida_ingredients`
- **Expected:** Should return 10 (sample data)

### Problem: Interface loads forever
- **Check:** Browser console for JavaScript errors
- **Check:** Network tab for API call failures

---

## 💡 **Quick Test Commands**

```sql
-- After setup, test with these queries:

-- 1. Count tables
SELECT 
  'frida_ingredients' as table_name, COUNT(*) as count 
FROM frida_ingredients
UNION ALL
SELECT 
  'ingredient_matches' as table_name, COUNT(*) as count 
FROM ingredient_matches;

-- 2. View sample Frida data
SELECT name, category, calories, protein 
FROM frida_ingredients 
LIMIT 5;

-- 3. View any saved matches
SELECT * FROM ingredient_matches_with_details;
```

**Kør SQL scriptet først, så test matching interface!** 🎯