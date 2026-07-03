import { VITAMIN_RDA_ADULT } from '@/lib/nutrition-reference-values'

export type MicroMap = Record<string, number>

const MINERAL_CANONICAL: { key: string; match: (k: string) => boolean }[] = [
  { key: 'calcium', match: (k) => /calcium|kalcium/i.test(k) },
  { key: 'iron', match: (k) => /^jern$/i.test(k) || /^iron$/i.test(k) || /\bjern\b/i.test(k) },
  { key: 'magnesium', match: (k) => /magnesium/i.test(k) },
  { key: 'phosphor', match: (k) => /phosphor|fosfor/i.test(k) },
  { key: 'potassium', match: (k) => /potassium|kalium/i.test(k) },
  { key: 'zinc', match: (k) => /^zink$/i.test(k) || /^zinc$/i.test(k) },
  { key: 'selenium', match: (k) => /selen|selenium/i.test(k) },
  { key: 'sodium', match: (k) => /natrium|sodium/i.test(k) },
]

function roundMicro(n: number): number {
  return Math.round(n * 100) / 100
}

/** Parse jsonb / API-body til positiv tal-map. */
export function parseMicroMap(raw: unknown): MicroMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: MicroMap = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v)
    if (Number.isFinite(n) && n > 0) out[String(k)] = n
  }
  return out
}

export function mergeMicroMaps(...maps: (MicroMap | undefined | null)[]): MicroMap {
  const out: MicroMap = {}
  for (const map of maps) {
    if (!map) continue
    for (const [k, v] of Object.entries(map)) {
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = (out[k] ?? 0) + v
    }
  }
  return out
}

/** Skaler pr.-portion-map til antal loggede portioner. */
export function scaleMicroMap(map: MicroMap, factor: number): MicroMap {
  if (!factor || factor <= 0) return {}
  const out: MicroMap = {}
  for (const [k, v] of Object.entries(map)) {
    out[k] = roundMicro(v * factor)
  }
  return out
}

/** Normaliser Frida/opskrift-nøgler til kanoniske vitamin-nøgler (A, C, B12, Folate, …). */
export function normalizeVitaminMap(raw: MicroMap): MicroMap {
  const out: MicroMap = {}
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) continue
    const rda = VITAMIN_RDA_ADULT.find((v) => v.matchKeys(key))
    if (!rda) continue
    const canonical = rda.display === 'Folsyre' ? 'Folate' : rda.display
    out[canonical] = roundMicro((out[canonical] ?? 0) + val)
  }
  return out
}

/** Normaliser mineral-nøgler til lowercase engelske kanoniske nøgler. */
export function normalizeMineralMap(raw: MicroMap): MicroMap {
  const out: MicroMap = {}
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val !== 'number' || !Number.isFinite(val) || val <= 0) continue
    const canon = MINERAL_CANONICAL.find((m) => m.match(key))
    if (canon) {
      out[canon.key] = roundMicro((out[canon.key] ?? 0) + val)
      continue
    }
    const lower = key.toLowerCase().trim()
    if (MINERAL_CANONICAL.some((m) => m.key === lower)) {
      out[lower] = roundMicro((out[lower] ?? 0) + val)
    }
  }
  return out
}

export function prepareStoredMicros(
  vitamins: MicroMap | undefined | null,
  minerals: MicroMap | undefined | null,
  portionsLogged: number
): { vitamins: MicroMap; minerals: MicroMap } {
  return {
    vitamins: normalizeVitaminMap(scaleMicroMap(parseMicroMap(vitamins), portionsLogged)),
    minerals: normalizeMineralMap(scaleMicroMap(parseMicroMap(minerals), portionsLogged)),
  }
}

export function aggregateEntryMicros(
  entries: Array<{ vitamins?: unknown; minerals?: unknown }>
): { vitamins: MicroMap; minerals: MicroMap } {
  const vitaminMaps: MicroMap[] = []
  const mineralMaps: MicroMap[] = []
  for (const e of entries) {
    const v = parseMicroMap(e.vitamins)
    const m = parseMicroMap(e.minerals)
    if (Object.keys(v).length) vitaminMaps.push(v)
    if (Object.keys(m).length) mineralMaps.push(m)
  }
  return {
    vitamins: mergeMicroMaps(...vitaminMaps),
    minerals: mergeMicroMaps(...mineralMaps),
  }
}
