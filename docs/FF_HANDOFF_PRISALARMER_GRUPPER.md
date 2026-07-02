# FF handoff: Grupperede prisalarmer (bulk / søge-baseret)

Portet fra Planomo — samme datamodel og API-adfærd som beskrevet i Planomo-handoff juli 2026.

## Status i FF-repo

- Migration: `supabase/migrations/20260702100000_price_alert_groups.sql`
- Søgning: `src/lib/price-alerts/match-offers-for-query.ts`
- API: `/api/price-alerts`, `/api/price-alerts/groups`, `/api/price-alerts/groups/[id]`, `/api/price-alerts/seen`
- Cron: `/api/cron/price-alert-notify` (gruppe-push + vercel cron kl. 08:00 UTC)
- Web UI: `/dagligvarer` (søge-banner), `/prisalarmer`, `/prisalarmer/gruppe/[id]`

## App (Expo)

App-repo skal opdateres separat:

- `src/lib/price-alerts.ts` — grupper + preview
- `src/app/prisalarmer.tsx` — gruppe-rækker
- `src/app/prisalarmer-gruppe/[id].tsx` — detalje
- `src/app/(tabs)/dagligvarer.tsx` — søge-banner + butiks-toggle
- Push deep-link: `type: 'price_alert_group'` + `groupId`

## Kør migration

Kør `20260702100000_price_alert_groups.sql` mod FF Supabase (auth-projektet med `user_price_alerts`).

## Test-checkliste

- [ ] Søg "Pepsi Max" → preview viser antal varer/butikker
- [ ] Opret gruppe → én række på `/prisalarmer`
- [ ] Åbn gruppe → alle varer med butiksnavn
- [ ] Slet gruppe → alle underliggende alarmer væk
- [ ] Cron: max én push pr. gruppe
- [ ] Enkelt-alarm fra produktside virker stadig
