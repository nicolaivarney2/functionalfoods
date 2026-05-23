# Functional Foods Design System

Det centrale designsprog for Functional Foods — web, kommende React Native app og Figma trækker alle fra samme kilde.

## Filer

| Fil | Formål |
|---|---|
| [`tokens.js`](./tokens.js) | Single source of truth. Plain CommonJS så Tailwind config kan `require()` det. |
| [`tokens.d.ts`](./tokens.d.ts) | TypeScript-typer for `tokens.js`. |
| [`tokens.json`](./tokens.json) | Spejling af `tokens.js` i Tokens Studio-format til Figma. **Skal opdateres samtidig** med `tokens.js`. |
| [`component-inventory.md`](./component-inventory.md) | Prioriteret liste over komponenter der skal designes i Figma. |
| [`figma/SETUP.md`](./figma/SETUP.md) | Hvordan Figma-filen sættes op. |
| [`figma/sitemap-mealplan.md`](./figma/sitemap-mealplan.md) | Flow-diagram for første prioritet (madplan + opskrifter). |

## Designfilosofi

**Minimalistisk, læsbart, indholdsdrevet.** Brugeren skal kunne finde sin opskrift, sin madplan og sit indkøb uden visuel støj. Design'et træder tilbage så maden og indholdet kan træde frem.

Tre principper:

1. **Whitespace før dekoration.** Komponenter skal have rigeligt åndehul. Vi tilføjer ikke shadows, gradienter eller borders med mindre de tjener en funktion.
2. **Typografi som hierarki.** Vi bruger størrelse og weight til at skabe orden — ikke farver og badges.
3. **App-native følelse.** På mobil skal det føles som en native app, ikke en mobil hjemmeside. Det betyder bottom sheets, tab bars, swipe-gestures, blød radius og generøse touch targets.

## Brug i kode

### Web (Next.js + Tailwind)

Tokens er bundet ind via `tailwind.config.js` — brug bare normale Tailwind-klasser:

```tsx
<button className="bg-neutral-900 text-neutral-0 px-4 py-3 rounded-lg shadow-md">
  Klik mig
</button>
```

For værdier der ikke er Tailwind-utilities (motion, mobile dimensions, dietary colors), importér direkte:

```ts
import tokens from '@/../design-system/tokens'

const duration = tokens.motion.durations.base
const ketoColor = tokens.colors.dietary.keto
```

### React Native (kommende)

```ts
import tokens from '../design-system/tokens'
import { StyleSheet } from 'react-native'

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.neutral[0],
    borderRadius: parseInt(tokens.radii['2xl']),
    padding: parseInt(tokens.spacing[4]),
    ...tokens.shadowsNative.md,
  },
})
```

### Figma

1. Installer [Tokens Studio plugin](https://tokens.studio/) i Figma
2. Plugin → Settings → Import → Single file → vælg `design-system/tokens.json`
3. Plugin → Apply tokens to variables (opretter Figma Variables)
4. Brug Variables i alle dine designs i stedet for raw hex-værdier

## Farveskala

### Neutral
Backbone'en. Bruges til tekst, baggrunde, borders.
- `neutral-0` (#ffffff) — primær baggrund
- `neutral-100`-`neutral-300` — sekundære baggrunde, dividers, subtle borders
- `neutral-500`-`neutral-700` — sekundær tekst
- `neutral-900`-`neutral-950` — primær tekst, primær knap

### Brand (sage green)
Functional Foods accent — bruges sparsomt til at signalere brand-identitet (logo, primær CTA i visse sammenhænge, success-tilstande).

> Den er **provisional**. Brand identity kan ændres uden at røre komponenter — skift kun værdierne i tokens.

### Accent (terracotta)
Sekundær accent. Bruges til at fremhæve specifikke kategorier, særlige tilbud, "fremhævet" badges.

### Semantic
`success` / `warning` / `danger` / `info` — bruges KUN til feedback/status. Aldrig dekorativt.

### Dietary
Én farve per kost-kategori. Bruges på chips og filter-UI.

| Token | Farve | Brug |
|---|---|---|
| `dietary.keto` | Lilla | Keto-opskrifter |
| `dietary.paleo` | Brun | Paleo / LCHF |
| `dietary.antiInflammatory` | Teal | Anti-inflammatorisk |
| `dietary.flexitarian` | Lime | Flexitarian |
| `dietary.proteinRich` | Rød | Proteinrig kost |
| `dietary.fiveTwo` | Blå | 5:2-kuren |
| `dietary.glp1` | Violet | GLP-1 |
| `dietary.sense` | Cyan | SENSE |
| `dietary.weightLoss` | Pink | Vægttab |
| `dietary.calorieCounting` | Orange | Kalorietælling |

## Typografi

System fonts på alle platforme — `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`. Det er hurtigt, det er familiært, og det matcher native iOS/Android.

| Token | Brug |
|---|---|
| `display` (40/48) | Splash-screens, hero på landing |
| `h1` (32/40) | Skærm-titler |
| `h2` (28/36) | Section headers på samme skærm |
| `h3` (24/32) | Card titler, modal titler |
| `h4` (20/28) | Sub-sections |
| `h5` (18/26) | Mindre headers (fx ingrediens-grupper) |
| `bodyLg` (18/28) | Læse-tung tekst (artikler, opskriftbeskrivelse) |
| `body` (16/24) | Standard body — default |
| `bodySm` (14/20) | Sekundær tekst, hjælpetekst |
| `label` (14/20 medium) | Form labels, button text |
| `caption` (12/16) | Metadata, timestamps |
| `micro` (11/14) | Badges, micro-labels |

## Radius

Blød skala valgt for native app-feel:

| Token | Værdi | Bruges på |
|---|---|---|
| `none` | 0 | Aldrig — undgå skarpe hjørner i app'en |
| `xs` | 2px | Indre dekorative elementer |
| `sm` | 4px | Små badges, micro chips |
| `md` | 8px | Inputs, chips, secondary buttons |
| `lg` | 12px | Primary buttons, små kort |
| `xl` | 16px | Store cards, list items |
| `2xl` | 24px | RecipeCard, modaler, sheets |
| `3xl` | 32px | Hero-cards, splash elements |
| `full` | 9999 | Pill-knapper, avatars |

## Spacing

4px baseline. Brug ALDRIG værdier udenfor skalaen.

## Shadows

Bruges sparsomt. Apps har normalt mindre shadows end web-design.

- `sm` — subtile separations (mellem cards på samme niveau)
- `md` — hævede cards
- `lg` — modaler, popovers
- `xl` — bottom sheets
- `2xl` — kun til særligt prominent UI

## Motion

| Token | Duration | Brug |
|---|---|---|
| `fast` (150ms) | Hover-feedback, knap-press |
| `base` (200ms) | Standard transitions |
| `slow` (300ms) | Sheet open/close |
| `slower` (500ms) | Page transitions |

Easing: brug `standard` til alt med mindre du har en god grund til andet.

## Mobile constants

- **Touch target minimum**: 44pt (Apple) / 48pt (Android)
- **iPhone safe area top**: 47pt (Dynamic Island / notch)
- **iPhone safe area bottom**: 34pt (home indicator)
- **TabBar height**: 49pt
- **AppBar height**: 44pt

## Hvordan tokens opdateres

1. Ret værdien i [`tokens.js`](./tokens.js)
2. Spejl ændringen i [`tokens.json`](./tokens.json)
3. Hvis Tailwind skal kende den nye nøgle — opdater også [`../tailwind.config.js`](../tailwind.config.js)
4. Hvis du har Figma åbent — re-importér `tokens.json` i Tokens Studio

> En fremtidig opgave er at auto-generere `tokens.json` fra `tokens.js` via et build-script. Indtil da er det manuelt — hold de to filer i lockstep.
