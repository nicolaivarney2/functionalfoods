# ManyChat + Messenger (FunctionalFoods)

Denne guide dækker det, der **ikke** ligger i kode: ManyChat-flows, viden, GDPR og exit/due diligence. Koden: `MessengerHumanGuidanceWidget`, `/api/user/messenger-link`, `/api/webhooks/manychat`, `src/lib/manychat.ts`.

## 1. Supabase

Kør SQL-filen i Supabase SQL Editor — **rod:** [`add-manychat-integration.sql`](../add-manychat-integration.sql) eller **`sql/add-manychat-integration.sql`** (samme indhold).

## 2. Miljøvariabler (hosting)

- `NEXT_PUBLIC_MESSENGER_PAGE_ID` — Facebook Page ID (tal).
- `MANYCHAT_API_KEY` — fra ManyChat → Settings → API (til at skubbe custom fields).
- `MANYCHAT_WEBHOOK_SECRET` — valgfri stærk streng; send samme værdi i header `X-FF-Webhook-Secret` fra ManyChat.
- `MANYCHAT_FIELD_FF_USER_ID` / `MANYCHAT_FIELD_AGENT_SUMMARY` — numeriske field IDs fra ManyChat custom fields (opret felter først).

## 3. ManyChat: custom fields (præcis liste)

Opret **to** custom fields under **Audience → Custom fields** (eller tilsvarende). Navn er valgfrit; det der tæller er **felt-ID (tal)** som du kopierer ind i `.env`.

| # | Formål | Anbefalet type / længde | Env-variabel |
|---|--------|-------------------------|--------------|
| 1 | **FF bruger-id** (Supabase `user_profiles.id`, UUID) | Text | `MANYCHAT_FIELD_FF_USER_ID` |
| 2 | **Agent-resumé** (auto fra FF: email, niche/kost, vægt/mål, seneste madplan — max ~1900 tegn) | Text (lang) | `MANYCHAT_FIELD_AGENT_SUMMARY` |

Efter oprettelse: i ManyChat vises hvert felt med et **numerisk ID**. Sæt fx:

```env
MANYCHAT_FIELD_FF_USER_ID="123456"
MANYCHAT_FIELD_AGENT_SUMMARY="123457"
```

(Tallene er eksempler — brug dine egne fra ManyChat.)

## 4. Ref URL / flows

- **ff_logged_in** — fallback hvis token-API fejler (segmentering af logget-ind trafik uden kobling).
- **ff_link--…** — genereres af `/api/user/messenger-link`; gem payload i automation og kald **External request** til:

`POST https://functionalfoods.dk/api/webhooks/manychat`

Eksempel-body (tilpas til ManyChat’s JSON):

```json
{
  "subscriber_id": "{{subscriber.id}}",
  "ref_payload": "{{last_input.ref}}"
}
```

Header hvis secret er sat: `X-FF-Webhook-Secret: <MANYCHAT_WEBHOOK_SECRET>`

## 5. Live Chat og menneskelig tone

- Korte velkomstbeskeder; **åbn Live Chat** til menneske til egentlig vejledning.
- Tydelig GDPR/samtykke i ManyChat (matcher teksten i widget om engangstoken og kobling til konto).

## 6. AI Knowledge (offentlig viden)

- Fyld **kun** indhold der også findes (eller må findes) offentligt på functionalfoods.dk.
- Hold en **autoritativ kopi** samme sted I ejer (Notion/Git) til exit/portabilitet.

## 7. AI guardrails

- Begræns AI til routing/korte FAQ; budget- og beskedloft i ManyChat/OpenAI.
- Medicinske spørgsmål → menneske eller henvisning til læge.

## 8. Exit / due diligence

- Dokumentér ejerskab af Meta Page + ManyChat-konto, API-nøgler (hemmelighedslager), og denne webhook-URL.
- Ingen unik forretningslogik kun i ManyChat uden kopi et andet sted.
