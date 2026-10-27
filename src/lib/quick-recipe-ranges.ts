/**
 * Quick recipe låser ikke kriterierne til ét punkt på skalaen.
 * Teksten beskriver hele det interval, modalen allerede bruger.
 */

export type QuickRecipeCategory =
  | 'keto'
  | 'sense'
  | 'glp1'
  | 'proteinrig'
  | 'proteinrig-kost'
  | 'familiemad'
  | '5-2'
  | 'antiinflammatorisk'
  | 'fleksitarisk'

const QUICK_RANGE: Record<QuickRecipeCategory, string> = {
  keto: `QUICK RECIPE: Kriterierne er ikke sat til ét punkt. Variér frit inden for hele intervallet 0–3, og gå ikke udenfor det.
- Protein-fokus 0–3: 0 er lavt protein med fedt som primær energi. 1 er standard keto (ca. 20–25 % protein). 2 er moderat til høj protein. 3 er en proteinrig keto-ret.
- Fedt-indhold 0–3: 0 er standard keto (ca. 70–75 % fedt). 1 er moderat til høj fedt. 2 er klassisk keto (ca. 75–80 % fedt). 3 er fat-bomb.
- Kulhydrat-strikthed 0–3: 0 er maks 10 g netto. 1 og 2 er maks 20 g netto. 3 er op til 25 g netto. For denne opskrift er vinduet hele skalaen, fra 10 g til 25 g netto.
- Kompleksitet 0–3: 0 er 5–7 ingredienser og 4–5 trin. 1 er 7–9 ingredienser og 5–7 trin. 2 er 8–10 ingredienser og 6–8 trin. 3 er 10+ ingredienser og 7–10 trin.
- Ingen fast hovedingrediens, ret-type eller tidsloft. Vælg selv et niveau på hver skala.`,
  sense: `QUICK RECIPE: Stivelse er ikke låst til standard. Hele intervallet er tilladt: ingen stivelse, standard Sense (0–1 håndfuld) eller mere stivelse i den øvre ende af Sense-intervallet, stadig kun én slags. Vælg selv det der passer til måltidet. Ingen fast ret-type.`,
  glp1: `QUICK RECIPE: Fiber-fokus 0–3 og mæthedsprofil 0–3. Hele intervallet er tilladt. Vælg selv et niveau på hver skala. Ingen fast proteinkilde eller ret-type.`,
  proteinrig: `QUICK RECIPE: Ingen fast proteinkilde. Protein må være kylling, kalkun, fisk, æg, okse, svin eller vegetarisk. Ingen fast ret-type.`,
  'proteinrig-kost': `QUICK RECIPE: Ingen fast proteinkilde. Protein må være kylling, kalkun, fisk, æg, okse, svin eller vegetarisk. Ingen fast ret-type.`,
  familiemad: `QUICK RECIPE: Kriterierne er ikke sat til ét punkt. Variér frit inden for hele intervallet 0–3.
- One-pot 0–3: 0 er klassisk med flere elementer. 3 er alt i én gryde eller pande.
- Pasta/ris/kartoffel-klassiker 0–3: 0 lader grønt og protein bære retten, stadig familiemad. 3 er en tydelig klassiker med pasta, ris eller kartofler.
- Mere grønt 0–3: 0 er minimalt grønt. 3 er grønt integreret i retten, ikke en salat ved siden af.
- Børnefavorit 0–3: 0 er mere neutralt. 3 er en sikker vinder med kendte smage.
- Tid: ingen maksimal tidsgrænse.
- Ingen fast ret-type eller inspiration.`,
  '5-2': `QUICK RECIPE: Ingen ekstra kriterier. Dagstypen og måltidet er rammerne. Variér frit inden for den valgte dagtypes kalorie- og stilinterval.`,
  antiinflammatorisk: `QUICK RECIPE: Ingen ekstra indsnævring. Variér frit inden for den antiinflammatoriske ramme: protein, grønt og ret-type.`,
  fleksitarisk: `QUICK RECIPE: Ingen ekstra indsnævring. Variér frit inden for den fleksitariske ramme: grønt bærer retten, kød eller fisk er en del af den.`,
}

export function quickRecipeRangeInstruction(category: QuickRecipeCategory): string {
  return QUICK_RANGE[category]
}
