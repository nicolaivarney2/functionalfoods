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

## Supabase Database Linter (sikkerhed)

### Fixes (kør i rækkefølge)

1. **fix-supabase-security-definer-views.sql** – Views fra SECURITY DEFINER → INVOKER
2. **fix-supabase-function-search-path.sql** – Sæt search_path på funktioner
3. **fix-supabase-rls-disabled.sql** – Aktiver RLS på 16 tabeller (bruger `check_user_is_admin()` for at undgå RLS-rekursion på `user_profiles`)

**Hvis admin-menu forsvinder:** Kør **fix-user-profiles-rls-recursion.sql** – retter policies der brugte `EXISTS (SELECT … FROM user_profiles …)` (uendelig rekursion).

### Manuelt

- **frida_foods_complete**: Hent definition med `SELECT pg_get_viewdef('public.frida_foods_complete'::regclass, true)` og genopret med `WITH (security_invoker = on)`
- **Auth**: Slå "Leaked password protection" til i Supabase Dashboard → Auth → Settings
- **MFA**: Overvej at aktivere flere MFA-metoder
- **Postgres**: Opgrader til nyeste version via Supabase Dashboard

### RLS Policy Warnings (lav prioritet)

Mange policies bruger `USING (true)` eller `WITH CHECK (true)` – det er bevidst for admin/API-tabeller. Stram op hvis du vil begrænse adgang yderligere.

---

## Kontakt

Ved sikkerhedsproblemer: [opdater med kontaktinfo]
