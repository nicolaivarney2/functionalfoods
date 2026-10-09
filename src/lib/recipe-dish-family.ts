/**
 * Retfamilier til FunctionalFoods' nicher.
 * Koden vælger familien før modellen skriver. `label` læses af modellen.
 * `needles` bruges kun til at tælle, hvad der allerede er lavet.
 */

export type FfRecipeNiche =
  | 'keto'
  | 'sense'
  | 'glp1'
  | 'proteinrig'
  | 'antiinflammatorisk'
  | 'fleksitarisk'

export type DishFamily = { id: string; label: string; needles: string[] }

export const NICHE_PROMPT_NAME: Record<FfRecipeNiche, string> = {
  keto: 'keto',
  sense: 'Sense',
  glp1: 'GLP-1',
  proteinrig: 'proteinrig',
  antiinflammatorisk: 'antiinflammatorisk',
  fleksitarisk: 'fleksitarisk',
}

const KETO_FAMILIES: DishFamily[] = [
  { id: 'omelet', label: 'en omelet eller et æggefad', needles: ['omelet', 'æggefad', 'æggekage'] },
  { id: 'ovn', label: 'en ovnret uden stivelse', needles: ['ovn'] },
  { id: 'gryde', label: 'en gryderet', needles: ['gryde', 'gullasch'] },
  { id: 'pande', label: 'en panderet', needles: ['pande', 'bøf', 'kotelet'] },
  { id: 'suppe', label: 'en cremet suppe', needles: ['suppe'] },
  { id: 'fyld', label: 'fyldte grøntsager', needles: ['fyldt', 'aubergine', 'squash'] },
  { id: 'salat', label: 'en lun salat der er et måltid', needles: ['salat'] },
]

const SENSE_FAMILIES: DishFamily[] = [
  { id: 'tallerken', label: 'fisk eller kylling med kartofler, sovs og grønt', needles: ['kartoffel', 'torsk', 'laks', 'kylling'] },
  { id: 'frikadeller', label: 'frikadeller med kartofler og sovs', needles: ['frikadelle'] },
  { id: 'pasta', label: 'hakket kød i tomatsauce med pasta', needles: ['pasta', 'spaghetti', 'lasagne'] },
  { id: 'gryde', label: 'en gryderet med rodfrugt', needles: ['gryde'] },
  { id: 'suppe', label: 'en suppe med brød', needles: ['suppe'] },
  { id: 'wok', label: 'en wok med kød eller fisk og lidt ris', needles: ['wok', 'nudel'] },
]

const GLP1_FAMILIES: DishFamily[] = [
  { id: 'suppe', label: 'en suppe', needles: ['suppe'] },
  { id: 'ovn', label: 'en ovnret i portionsform', needles: ['ovn'] },
  { id: 'salat', label: 'en mættende salat', needles: ['salat'] },
  { id: 'aeg', label: 'en æggeret eller omelet', needles: ['omelet', 'æg'] },
  { id: 'gryde', label: 'en gryderet', needles: ['gryde'] },
  { id: 'fisk', label: 'fisk med et lille tilbehør af fuldkorn eller kartoffel', needles: ['laks', 'torsk', 'fisk'] },
]

const PROTEINRIG_FAMILIES: DishFamily[] = [
  { id: 'pasta', label: 'en pastaret', needles: ['pasta', 'spaghetti', 'lasagne', 'penne'] },
  { id: 'karry', label: 'en karry', needles: ['karry'] },
  { id: 'frikadeller', label: 'frikadeller eller krebinetter med sovs', needles: ['frikadelle', 'krebinet', 'karbonade'] },
  { id: 'gryde', label: 'en gryderet', needles: ['gryde', 'gullasch'] },
  { id: 'wok', label: 'en wok eller panderet med ris eller nudler', needles: ['wok', 'nudel'] },
  { id: 'broed', label: 'tacos, wraps eller pitabrød', needles: ['taco', 'wrap', 'pita', 'burger'] },
  { id: 'suppe', label: 'en suppe med brød', needles: ['suppe'] },
  { id: 'ovn', label: 'en ovnret', needles: ['ovn', 'tærte', 'gratin'] },
  { id: 'fisk', label: 'fisk eller rejer som hovedret', needles: ['laks', 'torsk', 'reje', 'fisk'] },
  { id: 'steg', label: 'kotelet, kam eller bøf med tilbehør', needles: ['kotelet', 'svinekam', 'bøf', 'mørbrad'] },
]

const ANTI_FAMILIES: DishFamily[] = [
  { id: 'fisk', label: 'fisk som hovedret, med grønt', needles: ['laks', 'torsk', 'makrel', 'reje', 'fisk'] },
  { id: 'kylling', label: 'kylling med grønt', needles: ['kylling'] },
  { id: 'gryde', label: 'en gryde med meget grønt', needles: ['gryde'] },
  { id: 'suppe', label: 'en suppe', needles: ['suppe'] },
  { id: 'omelet', label: 'en omelet eller æggekage med grønt', needles: ['omelet', 'æggekage'] },
  { id: 'ovn', label: 'en ovnret med grønt', needles: ['ovn', 'tærte'] },
  { id: 'wok', label: 'en wok med grønt og lidt fuldkorn', needles: ['wok', 'nudel'] },
  { id: 'salat', label: 'en salat der er et måltid', needles: ['salat'] },
  { id: 'pasta', label: 'en ret med en lille portion fuldkornspasta', needles: ['pasta', 'spaghetti'] },
]

const FLEKSI_FAMILIES: DishFamily[] = [
  { id: 'pasta', label: 'en pastaret', needles: ['pasta', 'spaghetti', 'lasagne'] },
  { id: 'karry', label: 'en karry', needles: ['karry'] },
  { id: 'aeg', label: 'en ret med æg', needles: ['omelet', 'æggekage', 'tærte'] },
  { id: 'gryde', label: 'en gryderet', needles: ['gryde'] },
  { id: 'suppe', label: 'en suppe med brød', needles: ['suppe'] },
  { id: 'taco', label: 'tacos, wraps eller pitabrød', needles: ['taco', 'wrap', 'pita'] },
  { id: 'wok', label: 'en wok eller panderet', needles: ['wok', 'nudel'] },
  { id: 'ovn', label: 'en ovnret eller gratin', needles: ['ovn', 'gratin'] },
]

const FAMILIES_BY_NICHE: Record<FfRecipeNiche, DishFamily[]> = {
  keto: KETO_FAMILIES,
  sense: SENSE_FAMILIES,
  glp1: GLP1_FAMILIES,
  proteinrig: PROTEINRIG_FAMILIES,
  antiinflammatorisk: ANTI_FAMILIES,
  fleksitarisk: FLEKSI_FAMILIES,
}

/** Hele LÅST-blokken. Første linje er også {{FOCUS}}. */
const LOCKED: Record<FfRecipeNiche, string> = {
  keto: `DET HER ER EN KETO-RET. Lav-kulhydrat, høj fedt. Ikke en salat uden mad.

LÅST
- Højst ca. 20 g netto kulhydrat pr. portion.
- Ingen brød, pasta, ris, kartofler, sukker eller frugt ud over lidt bær.
- Protein varierer: kylling, svin, okse, hakket kød, æg, fed fisk (laks, makrel, sild). Lam højst sjældent.
- Fremgangsmåden gør retten færdig: sovs, gryde, ost eller sky. Salt, peber og olie alene er ikke en ret.

FRIT
- Retten bestemmer grønt, sovs og fedtstof.
- Broccoli, spinat og peberfrugt må gerne være med, når retten kalder på dem. De er ikke standarden.
- Ikke den faste combo honning + dijonsennep + citron + hvidløg + olie + pandestegning.`,
  sense: `DET HER ER EN SENSE-RET. Moderat kulhydrat, mæthed, almindelig hverdagsmad. Ikke keto.

LÅST
- Masser af ikke-stivelsesholdigt grønt, en håndfuld protein, højst én stivelse, fedt som ca. 1–3 spsk pr. person.
- Aften har én tydelig stivelse i en almindelig portion: 120–220 g kartoffel, 80–140 g kogt ris, 2 skiver rugbrød eller 70–120 g kogt fuldkornspasta.
- Kikærter, linser og tofu må gerne være med, når retten kalder på dem. De er ikke standardproteinet.
- Fremgangsmåden gør retten færdig.

FRIT
- Retten bestemmer kød, fisk, grønt og hvilken stivelse der passer.
- Lav ikke den samme trio hver gang (kylling, broccoli, ris).`,
  glp1: `DET HER ER EN GLP-1-RET. Mættende, mindre tallerken, protein og grønt.

LÅST
- Aften: en lille mængde komplekst kulhydrat, ca. 40–70 g kogt fuldkorn eller 60–100 g kartoffel. Ikke hvidt brød og ikke sukker.
- Morgen, frokost og snack: æg, grød, skyr eller lidt brød. Ikke en stor portion ris, pasta eller bulgur, og aldrig i en smoothie.
- Fremgangsmåden gør retten færdig.

FRIT
- Retten bestemmer protein og grønt. Kylling og kikærter er ikke standarden i hver ret.`,
  proteinrig: `DET HER ER ALMINDELIG MAD MED LIDLIGERE MERE PROTEIN. Den skal smage godt. Ikke en fitness-tallerken.

LÅST
- Ca. 30–40 g protein pr. person, mest fra kød, fisk, rejer eller æg.
- Ost, fløde og smør må gerne være en del af retten.
- Fremgangsmåden skal gøre retten færdig: sovs, glasur, gryde, karry, tomatsovs eller sky.
- Ingen shakes og intet proteinpulver.

FRIT
- Kartofler, ris, pasta og brød er fine. Retten bestemmer.
- Kikærter må gerne være med. De er ikke standarden.
- Lav ikke den samme tallerken med et nyt navn.`,
  antiinflammatorisk: `DET HER ER ALMINDELIG AFTENSMAD, BYGGET SOM MIDDELHAVSKOST.
Færre hurtige kulhydrater. Ikke keto og ikke en kur.

LÅST
- Meget grønt. Olivenolie er fedtstoffet. Fisk, kylling eller æg oftere end rødt og forarbejdet kød.
- Stivelse er et lille tilbehør: fuldkorn, en kartoffel eller bønner. Ikke 500 g kartofler og ikke en stor portion hvid pasta som basen.
- Lidt eller intet sukker. Ingen juice, shots, proteinpulver eller superfood-bowls.
- Ingen løfter om at helbrede. Fremgangsmåden gør retten færdig.

FRIT
- Retten bestemmer grøntsager og krydderier. Kurkuma og ingefær kun når de hører til retten.
- Kikærter er tilladt. De er ikke standardproteinet, og retten er ikke en bowl.`,
  fleksitarisk: `DET HER ER ALMINDELIG MAD, MEST AF PLANTER, MED KØD ELLER FISK SOM EN DEL AF RETTEN — IKKE SOM HELE RETTEN.

LÅST
- Grønt, bælgfrugt, æg eller ost bærer mætheden. Kød eller fisk er en smagsgiver, ikke 400 g kylling som hovedrollen.
- Den skal mætte. En salat er kun hovedret, når der er æg, ost, bønner eller brød nok.
- Fremgangsmåden gør retten færdig.

FRIT
- Pasta, karry, gryde, suppe, wok og ovn er fine.`,
}

export function familiesForNiche(niche: FfRecipeNiche): DishFamily[] {
  return FAMILIES_BY_NICHE[niche]
}

export function lockedBlock(niche: FfRecipeNiche): string {
  return LOCKED[niche]
}

export function focusLine(niche: FfRecipeNiche): string {
  return LOCKED[niche].split('\n').find((line) => line.trim().length > 0)?.trim() ?? ''
}

export function pickLeastUsedFamily(titles: string[], families: DishFamily[]): string {
  const pool = families.length ? families : FAMILIES_BY_NICHE.proteinrig
  const counted = pool.map((family) => ({
    family,
    count: titles.filter((title) =>
      family.needles.some((needle) => title.toLowerCase().includes(needle.toLowerCase())),
    ).length,
  }))
  const min = Math.min(...counted.map((entry) => entry.count))
  const least = counted.filter((entry) => entry.count === min)
  return least[Math.floor(Math.random() * least.length)].family.label
}
