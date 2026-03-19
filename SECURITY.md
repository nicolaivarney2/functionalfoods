# Sikkerhedsgennemgang – Functionalfoods

## Oversigt
Denne fil dokumenterer sikkerhedsaspekter og anbefalinger for Functionalfoods.

---

## ✅ Gennemført

### 1. Miljøvariabler
- `.env`, `.env.local`, `.env*.backup` er i `.gitignore`
- API-nøgler hentes fra `process.env` – aldrig hardcodet
- `NEXT_PUBLIC_*` variabler er kun for URL/anon-key (offentlig info)

### 2. Supabase
- **Service role key** bruges kun server-side (API routes)
- **Anon key** bruges client-side – RLS beskytter data
- Share-tokens er kryptografisk tilfældige (`randomBytes(12).base64url`)

### 3. Delte madplaner
- `/api/madbudget/share/[token]` – offentlig (ingen auth), bruger kun `share_token`
- Kun planer med `is_shared=true` returneres
- Ingen brugerdata eller personlig info eksponeres

---

## ⚠️ Anbefalinger

### 1. Admin-routes
- **Tjek:** `/api/admin/*` routes bør kræve authentication
- Mange admin-routes bruger service role – sikr at de kun kaldes af authenticated admins
- **test-env:** `/api/admin/dagligvarer/test-env` returnerer env-info – overvej at begrænse eller fjerne i produktion

### 2. Vercel Environment Variables
- Sæt alle nødvendige variabler i Vercel Dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL` (for share links)
  - `OPENAI_API_KEY`, `GOMA_API_KEY`, etc. efter behov

### 3. Supabase RLS
- Verificer at alle tabeller har passende RLS policies
- `user_meal_plans`: SELECT tilladt for `is_shared=true` OR `user_id=auth.uid()`
- Brug Supabase Dashboard → Authentication → Policies til gennemgang

### 4. Rate limiting
- Overvej rate limiting på offentlige API-endpoints (fx. share GET)
- Vercel har indbygget DDoS-beskyttelse

### 5. Cron / scheduled jobs
- `CRON_SECRET` bør bruges til `/api/admin/goma/scheduled-sync`
- Vercel Cron: Sæt `Authorization: Bearer $CRON_SECRET` header

---

## Migrations før deploy

Kør disse SQL-migrations i Supabase (i rækkefølge):

1. `add-shared-by-name.sql` – for "XX madplan" display
2. `add-shopping-list-prices-column.sql` – for cached priser på delte planer

---

## Kontakt

Ved sikkerhedsproblemer: [opdater med kontaktinfo]
