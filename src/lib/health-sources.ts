/** Fælles kilder til sundheds- og ernæringsinformation i app og web. */

export type HealthSource = {
  id: number
  label: string
  note?: string
  href: string
}

export const HEALTH_METHODOLOGY_PATH = '/metode/kalorier-og-vaegttab'

/** Kort note i app-flows (madbudget, onboarding, dagbog). */
export const HEALTH_DISCLAIMER =
  'Tallene er vejledende estimater — ikke personlig sundhedsrådgivning.'

/** Lidt mere kontekst på metode-/kildesiden. */
export const HEALTH_DISCLAIMER_FULL =
  'Functional Foods er til information og inspiration. Tal og anbefalinger er vejledende og erstatter ikke professionel sundhedsrådgivning.'

/** Nummererede kilder — id matcher #kilde-n på metode-siden og Cite-komponenten. */
export const HEALTH_SOURCES: HealthSource[] = [
  {
    id: 1,
    label:
      'Mifflin MD, St Jeor ST, Hill LA, et al. A new predictive equation for resting energy expenditure in healthy individuals.',
    note: 'Basal stofskifte (BMR) i appens kalorieberegning.',
    href: 'https://doi.org/10.1093/ajcn/51.2.241',
  },
  {
    id: 2,
    label: 'Nordic Nutrition Recommendations 2023 (NNR2023).',
    note: 'Energi, makrofordeling og befolkningsanbefalinger i nordisk kontekst.',
    href: 'https://norden.org/en/publication/nordic-nutrition-recommendations-2023',
  },
  {
    id: 3,
    label: 'Alt om kost — Fødevarestyrelsen (officielle danske kostråd).',
    note: 'Generelle kostråd og livsstil.',
    href: 'https://altomkost.dk/',
  },
  {
    id: 4,
    label: 'FRIDA — DTU Fødevareinstituttet (fødevaredatabase og næringsdata).',
    note: 'Opskrifters næringsindhold og referenceværdier.',
    href: 'https://frida.fooddata.dk/',
  },
  {
    id: 5,
    label:
      'Hall KD, et al. Quantification of the effect of energy imbalance on bodyweight (energy balance / kalorieunderskud).',
    note: 'Princippet om energibalance ved vægttab.',
    href: 'https://doi.org/10.1016/S0140-6736(11)60812-X',
  },
  {
    id: 6,
    label: 'WHO — Physical activity and adults (anbefalinger for daglig bevægelse).',
    note: 'Råd om fysisk aktivitet og energiforbrug.',
    href: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
  },
  {
    id: 7,
    label:
      'de Cabo R, Mattson MP. Effects of intermittent fasting on health, aging, and disease (oversigtsartikel).',
    note: 'Baggrund for generelle pointer om periodisk faste — ikke individuel behandling.',
    href: 'https://doi.org/10.1056/NEJMra1905136',
  },
  {
    id: 8,
    label: 'EFSA — Dietary Reference Values for nutrients (vitaminer og mineraler).',
    note: 'Vejledende daglige referenceværdier i ernæringsoverblikket.',
    href: 'https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values',
  },
]

export function healthSourceById(id: number): HealthSource | undefined {
  return HEALTH_SOURCES.find((s) => s.id === id)
}

export function healthMethodologyAnchor(id: number): string {
  return `${HEALTH_METHODOLOGY_PATH}#kilde-${id}`
}
