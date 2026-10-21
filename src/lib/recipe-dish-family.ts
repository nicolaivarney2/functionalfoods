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
  {
    id: 'ovn',
    label: 'en ovnret serveret med ét tilbehør ved siden af: blomkålsris, broccoli til ris-tilbehør, smørstegt spidskål eller salat',
    needles: ['ovn'],
  },
  {
    id: 'gryde',
    label: 'en gryderet serveret på ét tilbehør: blomkålsris, broccoli til ris-tilbehør, smørstegt spidskål eller salat',
    needles: ['gryde', 'gullasch'],
  },
  {
    id: 'pande',
    label: 'en panderet serveret på ét tilbehør: blomkålsris, broccoli til ris-tilbehør, smørstegt spidskål eller salat',
    needles: ['pande', 'bøf', 'kotelet'],
  },
  {
    id: 'suppe',
    label: 'en cremet suppe plus en salat eller smørstegt kål ved siden af',
    needles: ['suppe'],
  },
  { id: 'fyld', label: 'fyldte grøntsager som et helt måltid, uden ekstra ris', needles: ['fyldt', 'aubergine', 'squash'] },
  { id: 'salat', label: 'en mættende salat med protein, fedt og grønt, som hele aftensmaden', needles: ['salat'] },
  {
    id: 'tilbehor',
    label: 'kød eller fisk med ét tilbehør: blomkålsris, broccoli til ris-tilbehør eller smørstegt kål',
    needles: ['blomkålsris', 'broccoli', 'spidskål'],
  },
]

/** Frokost, morgenmad og snacks. Aftensmad bruger KETO_FAMILIES. */
const KETO_BREAKFAST_FAMILIES: DishFamily[] = [
  {
    id: 'hurtig-aeg',
    label: 'en hurtig salt morgenmad med æg, grønt og sundt fedt',
    needles: ['spejlæg', 'røræg', 'bacon'],
  },
  {
    id: 'omelet',
    label: 'en hurtig omelet eller æggebåd med ost og grønt',
    needles: ['omelet', 'æggebåd'],
  },
  {
    id: 'kold',
    label: 'en kold dansk morgenmadstallerken med æg, ost eller røget laks og grønt',
    needles: ['røget laks', 'morgenmadstallerken'],
  },
  {
    id: 'roelig',
    label: 'en æggekage eller frittata til en morgen med lidt mere tid',
    needles: ['æggekage', 'frittata', 'æggefad'],
  },
  {
    id: 'soed',
    label: 'en sød keto-morgenmad i ny variant, til dem der savner grød eller pandekager',
    needles: ['chia', 'pandekage', 'pudding'],
  },
]

const KETO_LUNCH_FAMILIES: DishFamily[] = [
  {
    id: 'salat',
    label: 'en fyldig keto-salat med protein og sundt fedt, uden brød',
    needles: ['salat', 'cæsar'],
  },
  {
    id: 'wrap',
    label: 'en wrap eller bowl uden brød, med kød, fed ost og grønt',
    needles: ['wrap', 'crepe', 'bowl', 'romaine'],
  },
  {
    id: 'taerte',
    label: 'en tærte uden mel eller en frittata, nem nok til frokost',
    needles: ['tærte', 'frittata'],
  },
]

const KETO_SNACK_FAMILIES: DishFamily[] = [
  {
    id: 'tallerken',
    label: 'en lille mættende snack af ost, æg, avocado, oliven eller nødder',
    needles: ['oliven', 'nødder', 'mandler'],
  },
  {
    id: 'groent',
    label: 'grønt med en fed dip, eller små salatbåde',
    needles: ['dip', 'selleri'],
  },
  {
    id: 'bid',
    label: 'æggebidder eller sprøde ostesnacks',
    needles: ['æggebid', 'ostesnack'],
  },
  {
    id: 'kaffe',
    label: 'fedtkaffe af kaffe blendet med smør eller MCT-olie',
    needles: ['kaffe', 'fedtkaffe', 'bulletproof', 'mct'],
  },
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
- Fremgangsmåden gør retten færdig. Salt, peber og olie alene er ikke en ret. Aftensmad har et tilbehør ved siden af sovsen. Grønt i sovsen tæller ikke som tilbehør.
- Olivenolie er madlavningsolien. Undtagelse: fedtkaffe bruger smør og/eller MCT-olie, ikke olivenolie.
- Fløde i sovs er madlavningsfløde 18%, højst 150 ml til 2. Ikke piskefløde, og ikke fløde i hver ret. Piskefløde kun når retten skal piskes, højst 100 ml til 2. Keto er ikke en undskyldning for at hælde fløde i alting.

FRIT
- Hvilket grønt, hvilken sovs og hvilket fedtstof, bestemmer retten. Skift fra gang til gang.
- Broccoli, spinat og peberfrugt må gerne være med. De er ikke standarden.
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

const KETO_MEAL_GUIDANCE: Record<'morgenmad' | 'frokost' | 'snacks' | 'aftensmad', string> = {
  aftensmad: `AFTENSMAD
Uden tilbehør er det ikke et færdigt måltid. Retten er to dele: hovedretten og et tilbehør man spiser den med. Grønt i sovsen er ikke tilbehør. Kylling i flødesovs med spinat, eller hakket kød med grønkål og champignon, er ikke færdig.

Tilbehøret er præcis én af disse. Egne ingredienslinjer. Eget trin. Server det ved siden af eller under kødet. Rør det ikke i sovsen.
- 400 g blomkålsris. Navnet er blomkålsris, notes er frosne. Det er frostposen fra butikken. Riv ikke et hoved blomkål, og køb ikke blomkål i stedet.
- 0,5 stk broccoli som ris-tilbehør. Navnet er broccoli. Notes er "til ris-tilbehør", så linjen ikke er broccoli i sovsen. Ca. 100 g pr. person. Til 2 personer er 0,5 stk nok. Samme 0,5 stk er nok til 4 personer, når 2 af dem er børn. Skriv aldrig 1 stk og aldrig gram.
- 1 stk spidskål, hakket og stegt i smør med ost eller urter. Navnet er spidskål.
- 1 stk salat bygget som tilbehør, med olie eller dressing og ost, avocado eller nødder. Navnet er salat.

Vælg ét tilbehør, og skift fra gang til gang. Ikke blomkålsris hver aften. Grønkål, spinat, champignon og squash må gerne være i sovsen. De erstatter ikke listen ovenfor.

Undtagelse: er selve retten en mættende salat eller fyldte grøntsager, bærer den tallerkenen. Så skal der ikke også ris.`,
  frokost: `FROKOST
Nemt, men lækkert. Aktiv tid typisk under 25 minutter. Ikke kedelig meal prep, og ikke en omstændelig restaurantret.

Skift spor. Eksemplerne er retning, ikke opskrifter der skal kopieres:
- Fyldig salat med sundt fedt og protein, så den mætter. Cæsarsalat med kylling eller bacon uden brød og uden croutoner. Tun med hjemmelavet mayo, avocado og æg i spidskålsblade eller salatbåde. Andre salater i samme ånd.
- Wrap eller bowl uden brød. Æggecrepe, omelet, ostewrap eller store romaine-blade med kød, fed ost og grønt. Samme fyld kan stå i en skål.
- Tærte uden mel. Bund af revet blomkål og ost, eller ingen bund som en frittata. Fyld som laks, spinat, feta eller bacon, eller andet i samme familie.

Ingen brød, croutoner, tortilla eller pita.`,
  morgenmad: `MORGENMAD
Klassisk dansk morgenmad på keto. Æg, bacon, ost, smør, avocado, agurk, tomat og røget laks er hjemme her. Lidt bær kun som pynt på en sød ret. Ikke amerikansk brunch som standard.

Tid skal være ærlig. De fleste har kort tid om morgenen.
- Hurtig morgen: samlet ca. 5–10 minutter. Det er det almindelige.
- Rolig morgen: samlet op til ca. 25 minutter, kun når retten vinder noget ved det.
Sæt prepTime og cookTime så de matcher.

De salte klassikere skal have grønt og sundt fedt med. Æg og bacon er fint. Ét eksempel er spejlæg i smør med smørstegt spinat, cherrytomater og avocado. Det er ikke skabelonen. Skift grønt og fedt: agurk, svampe, røget laks, ost, pesto, oliven.

Sødt, til dem der savner havregrød eller pandekager, kun indimellem. Chiapudding på kokos- eller mandelmælk med usødede kakaonibs og få bær. Pandekager af æg, flødeost og mandelmel. Andre søde keto-morgenmad er fine. Lav ikke den samme søde ret hver gang, og lad de salte hurtige retter fylde mest.

Gentag ikke samme ret med et nyt navn.`,
  snacks: `SNACKS
Lille, mættende og nemt. Ikke et halvt aftensmåltid.

Mad er det almindelige: ost, æg, avocado, nødder, oliven, grønt med en fed dip, æggebidder, små salatbåde. Skift mellem dem.

En drik er også en snack, når appetitten er lav: fedtkaffe, også kaldet bulletproof. Kaffe blendet med smør eller MCT-olie, evt. en smule fløde. Ikke olivenolie, ikke sukker, ikke havremælk. Det er én mulighed blandt snacks, ikke den eneste.`,
}

export type KetoMealKey = 'morgenmad' | 'frokost' | 'snacks' | 'aftensmad' | 'dessert'

export function ketoMealKey(meal: string): KetoMealKey | null {
  const value = meal.trim().toLowerCase()
  if (value === 'morgenmad' || value === 'breakfast') return 'morgenmad'
  if (value === 'frokost' || value === 'lunch') return 'frokost'
  if (value === 'snacks' || value === 'snack' || value === 'mellemmåltid' || value === 'mellemmaaltid') {
    return 'snacks'
  }
  if (value === 'dessert') return 'dessert'
  if (value === 'aftensmad' || value === 'aften' || value === 'middag' || value === 'dinner') return 'aftensmad'
  return null
}

export function ketoMealGuidance(meal: string): string | null {
  const key = ketoMealKey(meal)
  if (!key || key === 'dessert') return null
  return KETO_MEAL_GUIDANCE[key]
}

function foldMeal(value: string): string {
  return value.toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa')
}

const KETO_DINNER_SIDE = /blomkaalsris|spidskaal|hvidkaal|savojkaal|rodkaal|salat|rucola|romaine/

export const KETO_DINNER_SIDE_ERROR =
  'Aftensmad mangler tilbehør ved siden af retten. Tilføj 400 g blomkålsris (frostposen), 0,5 stk broccoli med notes "til ris-tilbehør", 1 stk spidskål stegt i smør, eller 1 stk salat. Et hoved blomkål tæller ikke. Broccoli uden den note tæller ikke. Grønkål, spinat og champignon i sovsen tæller ikke. Tilbehøret er egne ingredienslinjer og et eget trin, ikke rørt i sovsen.'

/** Grønt i sovsen tæller ikke. Salat som hele retten og fyldte grøntsager er undtaget. */
export function ketoDinnerSideIssue(
  title: string,
  ingredients: Array<{ name?: string | null; amount?: number | null; unit?: string | null; notes?: string | null }>,
): string | null {
  const titleFold = foldMeal(title)
  if (/salat/.test(titleFold)) return null
  if (/fyldt/.test(titleFold) && /aubergine|squash|zucchini|peber/.test(titleFold)) return null

  const hasSide = ingredients.some((ingredient) => {
    const name = foldMeal(ingredient.name || '')
    const notes = foldMeal(ingredient.notes || '')
    const amount = Number(ingredient.amount) || 0
    const unit = foldMeal(ingredient.unit || '')
    if (/broccoli/.test(`${name} ${notes}`) && /ris/.test(`${name} ${notes}`)) {
      return (unit === 'stk' || unit === 'st') && amount >= 0.49 && amount <= 0.51
    }
    if (!KETO_DINNER_SIDE.test(name)) return false
    const leaf = /salat|rucola|romaine/.test(name)
    if (unit === 'g' || unit === 'gram') return amount >= (leaf ? 40 : 250)
    if (unit === 'stk' || unit === 'bundt' || unit === 'hoved') return amount >= 0.5
    return false
  })

  return hasSide ? null : KETO_DINNER_SIDE_ERROR
}

export function familiesForKetoMeal(meal: string): DishFamily[] {
  const key = ketoMealKey(meal)
  if (key === 'morgenmad') return KETO_BREAKFAST_FAMILIES
  if (key === 'frokost') return KETO_LUNCH_FAMILIES
  if (key === 'snacks') return KETO_SNACK_FAMILIES
  return []
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

export function pickRandomFamily(families: DishFamily[]): string {
  const pool = families.length ? families : FAMILIES_BY_NICHE.proteinrig
  return pool[Math.floor(Math.random() * pool.length)].label
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
