# Figma fil — opsætning

Sådan sætter du Figma-filen op så den er kompatibel med kodebasens design tokens og senere Code Connect.

## 1. Opret filen

1. **Figma → File → New design file**
2. Omdøb til **`Functional Foods — App`**
3. Læg den i Functional Foods-teamet (så du senere kan dele med udviklere)

## 2. Fil-struktur (sider)

Opret disse sider i præcis denne rækkefølge — gør navigation og produktivitet meget bedre:

```
01 — Cover
02 — Changelog
03 — Foundations
04 — Components / Atoms
05 — Components / Molecules
06 — Components / Organisms
07 — Templates
08 — Flow: Onboarding
09 — Flow: Madplan
10 — Flow: Opskrifter
11 — Flow: Indkøb
12 — Flow: Profil & Settings
13 — Prototype
99 — Scratchpad
```

Brug `—` (em-dash) til separators så de er nemme at scanne.

## 3. Importér design tokens (Tokens Studio)

Det her er det vigtigste step — det binder Figma til kodebasens tokens.

1. **Plugins → Browse plugins in Community → søg "Tokens Studio for Figma"** (gratis)
2. **Kør pluginet** → Settings (tandhjul-ikon)
3. **Storage → Local document** (eller GitHub hvis du vil have auto-sync — det kan vi sætte op senere)
4. **File → Import** → vælg `[design-system/tokens.json](../tokens.json)`
5. **Tools → Create variables** → opretter Figma Variables fra alle tokens
6. **Tools → Create styles** → opretter Color Styles og Text Styles (legacy, men nogle plugins kræver det)

Når du er færdig, har du:
- **Variables** under hver collection (Color, Spacing, Radius, Typography, Shadow, Motion, Mobile)
- **Color Styles** der spejler variables
- **Text Styles** der spejler typography tokens

> Når tokens i koden opdateres, re-importér `tokens.json` her — det updater variables on-the-spot.

## 4. Foundations-siden (sektion-by-section)

Lav følgende frames på `03 — Foundations`-siden. Hver frame skal være rene swatches/specimens — ingen "smart" UI, bare visuel reference.

### Frame: Colors
- Hver palette (neutral, brand, accent, success, warning, danger, info) som horisontal swatch-strip
- Dietary colors som separat sektion med navn under hver
- Hver swatch er 64×64 med token-navn + hex under

### Frame: Typography
- Specimen for hver token (display, h1, h2, ..., micro)
- Vis token-navn til venstre + samplet tekst til højre

### Frame: Spacing
- Visualisér 4px-baseline med horizontal bars i forskellige størrelser
- Label hver med token-navn (`spacing.4 = 16px`)

### Frame: Radii
- 9 firkanter, hver med en radius-værdi anvendt
- Label med token-navn

### Frame: Shadows
- 6 firkanter, hver med en shadow anvendt
- Label

### Frame: Motion
- Animeret prototype af hver duration (eller bare statisk specimens med beskrivelse)

### Frame: Mobile constants
- iPhone 15 Pro frame med overlay: safe-area top (47pt), safe-area bottom (34pt), tabBar (49pt), appBar (44pt)
- Touch target minimum (44pt firkant til reference)

## 5. Frame-templates til skærme

Opret tre device-templates som components på `07 — Templates`:

| Component | Width | Height | Brug |
|---|---|---|---|
| `Frame / iPhone 15 Pro` | 393 | 852 | Primær — design alt her |
| `Frame / iPhone SE` | 375 | 667 | Mindste device — test layouts |
| `Frame / Android` | 360 | 800 | Android-test |

Hver template skal indeholde:
- Status bar overlay (47pt top)
- Home indicator overlay (34pt bottom)
- "Content area" placeholder mellem dem

Når du designer skærme, drag denne template ind og fyld content-arealet ud.

## 6. Komponent-navngivning

**Følg listen i [component-inventory.md](../component-inventory.md)** præcist. Hvis du opretter `Button`, skal det hedde nøjagtig `Button` (ikke `Btn`, `button`, `MainButton`).

For variants, brug Figma's variant-system med disse property-navne (matcher React-props):

- `variant` (primary, secondary, ...)
- `size` (sm, md, lg)
- `state` (default, hover, pressed, disabled, loading)
- `icon` (none, left, right, only)
- `fullWidth` (true, false)

Eksempel: `Button` med Component Properties:
- `variant` → enum: primary | secondary | tertiary | danger
- `size` → enum: sm | md | lg
- `state` → enum: default | pressed | disabled | loading
- `icon` → enum: none | left | right
- `label` → text
- `iconLeft` → instance swap (Icon)
- `iconRight` → instance swap (Icon)

## 7. Brug ALDRIG raw hex / px

Når du sætter en farve eller spacing, brug **altid Variables** — aldrig en raw hex eller raw px-værdi. Det er ikke-forhandleligt — hele tokens-modellen er afhængig af det.

Hvis du finder dig selv i at have brug for en værdi der ikke findes som token, sig til, så tilføjer vi den til `tokens.js` + `tokens.json` først.

## 8. Code Connect (kommer senere)

Når komponenterne i Figma er stabile, sætter vi [Figma Code Connect](https://www.figma.com/code-connect-docs/) op så hver Figma-komponent peger på den React/RN-komponent den repræsenterer.

- Config findes allerede: [`code-connect.config.json`](./code-connect.config.json)
- Template-eksempel: [`RecipeCard.figma.ts.template`](./RecipeCard.figma.ts.template)

Workflow:
1. Du publicerer Figma-komponenter til biblioteket
2. Du kopierer komponentens Figma-URL
3. Vi skriver en `.figma.ts` fil per komponent der binder URL'en til React-komponenten
4. `npx figma connect publish` uploader bindings
5. I Figma's Dev Mode kan udviklere nu se den faktiske React-kode for en komponent

## 9. Hvilken plan har du brug for?

Tokens Studio + Variables kræver **Figma Professional plan eller højere** (Variables er ikke i Free).

Code Connect kræver **Dev Seat** for de udviklere der publicerer bindings (du som designer behøver ikke Dev seat).

## 10. Genvej til at komme i gang

1. Opret filen + sider (15 min)
2. Importér tokens.json via Tokens Studio + opret variables (15 min)
3. Lav frame-templates (15 min)
4. Lav Foundations-siden (45 min)
5. Start på Atoms — **Button først** (Button → IconButton → Input → Chip → Tag → Avatar → Icon → Divider)

Det her tager sandsynligvis 1-2 dages designarbejde før du har et brugbart fundament. Brug ikke tid på pixels — fokuser på korrekt brug af variables og komponentstruktur. Skønhed kan polishes senere; arkitektur kan ikke.
