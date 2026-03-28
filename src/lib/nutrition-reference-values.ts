/**
 * Vejledende daglige referenceværdier for voksne (vitaminer).
 * Baseret på nordiske/anbefalede niveauer i samme stil som danske mærkninger — ikke individuel lægefaglig rådgivning.
 */

export type VitaminRda = {
  /** Kort navn til visning */
  display: string
  /** Anbefalet dagligt indtag */
  amount: number
  unit: string
  /** Mønstre der matcher nøgler fra opskriftsdata (frida, m.fl.) */
  matchKeys: (key: string) => boolean
}

/** Rækkefølge = prioriteret visning */
export const VITAMIN_RDA_ADULT: VitaminRda[] = [
  {
    display: 'A',
    amount: 800,
    unit: 'µg',
    matchKeys: (k) => {
      const s = k.toLowerCase().trim()
      return (
        s === 'a' ||
        s === 'retinol' ||
        /(?:^|[^a-z])a-vitamin/i.test(k) ||
        /^vitamin\s*a\b/i.test(k)
      )
    },
  },
  {
    display: 'C',
    amount: 80,
    unit: 'mg',
    matchKeys: (k) => {
      const s = k.toLowerCase().trim()
      return s === 'c' || /c-vitamin|vitamin\s*c\b|ascorb/i.test(k)
    },
  },
  {
    display: 'D',
    amount: 5,
    unit: 'µg',
    matchKeys: (k) => {
      const s = k.toLowerCase().trim()
      return (
        s === 'd' ||
        /d-vitamin|vitamin\s*d\b|d3|d2|calciferol|kolekalciferol/i.test(k)
      )
    },
  },
  {
    display: 'E',
    amount: 12,
    unit: 'mg',
    matchKeys: (k) => {
      const s = k.toLowerCase().trim()
      return s === 'e' || /e-vitamin|vitamin\s*e\b|tokoferol/i.test(k)
    },
  },
  {
    display: 'K',
    amount: 75,
    unit: 'µg',
    matchKeys: (k) => {
      const s = k.toLowerCase().trim()
      return (
        s === 'k' ||
        /^k\d?$/.test(s) ||
        /k-vitamin|vitamin\s*k\b|k1|k2|fylloquinon|menaquinon/i.test(k)
      )
    },
  },
  {
    display: 'B1',
    amount: 1.1,
    unit: 'mg',
    matchKeys: (k) => {
      const s = k.toLowerCase().trim()
      return (
        s === 'b1' ||
        /thiamin|tiamin|vitamin\s*b1\b|b1-vitamin/i.test(k)
      )
    },
  },
  {
    display: 'B2',
    amount: 1.4,
    unit: 'mg',
    matchKeys: (k) => {
      const s = k.toLowerCase().trim()
      return s === 'b2' || /riboflavin|vitamin\s*b2\b|b2-vitamin/i.test(k)
    },
  },
  {
    display: 'B3',
    amount: 16,
    unit: 'mg',
    matchKeys: (k) => {
      const s = k.toLowerCase().trim()
      return s === 'b3' || /niacin|vitamin\s*b3\b|b3-vitamin|pp/i.test(k)
    },
  },
  {
    display: 'B6',
    amount: 1.4,
    unit: 'mg',
    matchKeys: (k) => {
      const s = k.toLowerCase().trim()
      return s === 'b6' || /pyridoxin|vitamin\s*b6\b|b6-vitamin/i.test(k)
    },
  },
  {
    display: 'B12',
    amount: 2.4,
    unit: 'µg',
    matchKeys: (k) => {
      const s = k.toLowerCase().trim()
      return s === 'b12' || /cobalamin|vitamin\s*b12\b|b12-vitamin/i.test(k)
    },
  },
  {
    display: 'Folsyre',
    amount: 400,
    unit: 'µg',
    matchKeys: (k) => {
      const s = k.toLowerCase().trim()
      return (
        s === 'folate' ||
        s === 'folinsyre' ||
        /folat|folsyre|folacin|vitamin\s*b9\b|b9/i.test(k)
      )
    },
  },
]

export type MergedVitaminRow = {
  display: string
  value: number
  rda: number
  unit: string
  pct: number
}

/**
 * Slår duplikerede nøgler (fx "A" og "A-vitamin") sammen og matcher til én RDA pr. vitamin.
 * For hvert display tages den højeste værdi blandt matchende nøgler.
 */
export function mergeVitaminsAgainstRda(
  raw: Record<string, number> | undefined | null
): MergedVitaminRow[] {
  if (!raw || typeof raw !== 'object') return []
  const best = new Map<string, number>()

  for (const [key, val] of Object.entries(raw)) {
    if (typeof val !== 'number' || !Number.isFinite(val)) continue
    const rda = VITAMIN_RDA_ADULT.find((v) => v.matchKeys(key))
    if (!rda) continue
    const prev = best.get(rda.display) ?? 0
    if (val > prev) best.set(rda.display, val)
  }

  return VITAMIN_RDA_ADULT.map((rda) => {
    const value = best.get(rda.display)
    if (value === undefined) return null
    const pct = rda.amount > 0 ? Math.min(200, Math.round((value / rda.amount) * 100)) : 0
    return {
      display: rda.display,
      value: Math.round(value * 100) / 100,
      rda: rda.amount,
      unit: rda.unit,
      pct,
    }
  }).filter((row): row is MergedVitaminRow => row !== null)
}
