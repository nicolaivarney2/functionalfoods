/**
 * Hvordan husstanden vil have morgenmad og frokost.
 * Styrer både hvilke pladser der fyldes, og hvilke opskrifter der er «anbefalet».
 */

import {
  COOK_AHEAD_DAY_KEYS,
  isLeftoverMealCell,
  type CookAheadGrid,
} from '@/lib/madbudget/cook-ahead'
import { applyNextDayLunchLeftover } from '@/lib/madbudget/next-lunch-leftover'

export const BREAKFAST_STYLES = ['skip', 'fast', 'home', 'repeat'] as const
export const LUNCH_STYLES = ['skip', 'leftovers', 'packed', 'home'] as const

export type BreakfastStyle = (typeof BREAKFAST_STYLES)[number]
export type LunchStyle = (typeof LUNCH_STYLES)[number]

export type MealSlotStyleProfile = {
  dietaryApproach?: string
  breakfastStyle?: BreakfastStyle | null
  lunchStyle?: LunchStyle | null
}

export type StyleRecipe = {
  title?: string
  category?: string
  mainCategory?: string
  subCategories?: string[]
  dietaryTags?: string[]
  dietaryCategories?: string[]
  mealType?: string
  prepTime?: string | number
  preparationTime?: number
  totalTime?: number
}

const KETO_LIKE = new Set(['keto', 'lchf-paleo', 'lchf', 'paleo'])

export function isKetoLikeDiet(id?: string | null): boolean {
  return KETO_LIKE.has(String(id || '').trim().toLowerCase())
}

export function parseBreakfastStyle(value: unknown): BreakfastStyle | null {
  const v = String(value || '').trim()
  return (BREAKFAST_STYLES as readonly string[]).includes(v) ? (v as BreakfastStyle) : null
}

export function parseLunchStyle(value: unknown): LunchStyle | null {
  const v = String(value || '').trim()
  return (LUNCH_STYLES as readonly string[]).includes(v) ? (v as LunchStyle) : null
}

export function mealsPerDayFromStyles(
  breakfast?: BreakfastStyle | null,
  lunch?: LunchStyle | null
): string[] {
  const meals = ['dinner']
  if (breakfast && breakfast !== 'skip') meals.push('breakfast')
  if (lunch && lunch !== 'skip') meals.push('lunch')
  return meals
}

/** Eksisterende brugere uden gemt stil: morgenmad = hurtig, frokost = hjemme (ingen auto-rester). */
export function inferBreakfastStyle(
  mealsPerDay?: string[] | null,
  stored?: unknown
): BreakfastStyle {
  return parseBreakfastStyle(stored) ?? (mealsPerDay?.includes('breakfast') ? 'fast' : 'skip')
}

export function inferLunchStyle(mealsPerDay?: string[] | null, stored?: unknown): LunchStyle {
  return parseLunchStyle(stored) ?? (mealsPerDay?.includes('lunch') ? 'home' : 'skip')
}

export function breakfastStyleLabel(style: BreakfastStyle, diet?: string | null): string {
  if (style === 'skip') return 'Jeg faster morgenmad'
  if (style === 'repeat') return 'Samme par retter hele ugen'
  if (style === 'home') return 'Jeg har tid hjemme'
  return isKetoLikeDiet(diet) ? 'Skal være hurtigt' : 'Skal være hurtigt'
}

export function lunchStyleLabel(style: LunchStyle): string {
  if (style === 'skip') return 'Jeg fastet frokost'
  if (style === 'leftovers') return 'Rester fra aftensmad'
  if (style === 'packed') return 'Madpakke / prep'
  return 'Jeg er hjemme og laver den'
}

export function breakfastStyleHint(style: BreakfastStyle, diet?: string | null): string {
  const keto = isKetoLikeDiet(diet)
  if (style === 'skip') return 'Kalorierne fordeles på de andre måltider.'
  if (style === 'repeat') return 'To faste morgenmadsvalg på skift i løbet af ugen.'
  if (style === 'home') {
    return keto
      ? 'Frittata, æggekage eller noget i ovnen. 2–3 retter på skift i ugen.'
      : 'Grød, æggekage eller noget der må tage 20–30 minutter. 2–3 retter på skift i ugen.'
  }
  return keto
    ? 'Æg, ost eller keto-rugbrød med pålæg. 2–3 retter på skift i ugen.'
    : 'Yoghurt, æg eller rugbrød. 2–3 retter på skift i ugen.'
}

export function lunchStyleHint(style: LunchStyle, diet?: string | null): string {
  const keto = isKetoLikeDiet(diet)
  if (style === 'skip') return 'Kalorierne fordeles på de andre måltider.'
  if (style === 'leftovers') {
    return 'Vi lægger én extra portion på aftensmaden, så frokosten dagen efter er rester.'
  }
  if (style === 'packed') {
    return keto
      ? 'Salat, wrap eller tærte. 2–3 frokoster på skift, så prep er overskuelig.'
      : 'Salat, wrap, rugbrød eller tærte. 2–3 frokoster på skift, så prep er overskuelig.'
  }
  return keto
    ? 'Almindelig keto-frokost derhjemme. 2–3 retter på skift i ugen.'
    : 'Almindelig frokost derhjemme. 2–3 retter på skift i ugen.'
}

function textBlob(recipe: StyleRecipe): string {
  return [
    recipe.title,
    recipe.category,
    recipe.mainCategory,
    recipe.mealType,
    ...(recipe.subCategories || []),
    ...(recipe.dietaryTags || []),
    ...(recipe.dietaryCategories || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function recipePrepMinutes(recipe: StyleRecipe): number | null {
  const raw = recipe.preparationTime ?? recipe.totalTime ?? recipe.prepTime
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return raw
  if (typeof raw === 'string') {
    const n = Number.parseInt(raw.replace(',', '.'), 10)
    if (Number.isFinite(n) && n >= 0) return n
  }
  return null
}

const FAST_BREAKFAST = /æg|omelet|yoghurt|skyr|rugbrød|pålæg|spejl|overnight|chia|granola|smoothie|ost|laks|bacon|keto-rugbrød|ketorugbrød/
const HOME_BREAKFAST = /frittata|æggekage|æggefad|grød|pandekage|ovn|bagt|waffle|vafler/
const PACKED_LUNCH = /salat|wrap|madpakke|tærte|frittata|bowl|pita|rugbrød|smørrebrød|rest/

export function recipeFitsBreakfastStyle(
  recipe: StyleRecipe,
  style: BreakfastStyle,
  _diet?: string | null
): boolean {
  if (style === 'skip') return false
  const minutes = recipePrepMinutes(recipe)
  const blob = textBlob(recipe)
  if (style === 'fast') {
    if (minutes != null && minutes <= 15) return true
    if (minutes != null && minutes > 25) return false
    return FAST_BREAKFAST.test(blob) && !HOME_BREAKFAST.test(blob)
  }
  if (style === 'home') {
    if (minutes != null && minutes >= 15) return true
    return HOME_BREAKFAST.test(blob) || minutes == null
  }
  // repeat: samme pulje som hurtig + hjemme — generatoren gentager bagefter
  return true
}

export function recipeFitsLunchStyle(
  recipe: StyleRecipe,
  style: LunchStyle,
  _diet?: string | null
): boolean {
  if (style === 'skip') return false
  if (style === 'home') return true
  const blob = textBlob(recipe)
  if (style === 'packed' || style === 'leftovers') return PACKED_LUNCH.test(blob)
  return true
}

export function recipeFitsSlotStyle(
  recipe: StyleRecipe,
  meal: 'breakfast' | 'lunch' | 'dinner',
  profile: MealSlotStyleProfile
): boolean {
  if (meal === 'breakfast') {
    const style = profile.breakfastStyle ?? 'fast'
    return recipeFitsBreakfastStyle(recipe, style, profile.dietaryApproach)
  }
  if (meal === 'lunch') {
    const style = profile.lunchStyle ?? 'home'
    return recipeFitsLunchStyle(recipe, style, profile.dietaryApproach)
  }
  return true
}

function recipeKey(cell: Record<string, unknown>): string {
  return String(cell.id || cell.slug || cell.title || '')
}

/** Hold 2–3 retter og læg dem på skift. Rester-celler røres ikke. */
export function repeatMealSlotsAcrossGrids(
  grids: CookAheadGrid[],
  meal: 'breakfast' | 'lunch',
  maxUnique = 3
): CookAheadGrid[] {
  const unique: Record<string, unknown>[] = []
  for (const grid of grids) {
    for (const day of COOK_AHEAD_DAY_KEYS) {
      const cell = grid[day]?.[meal]
      if (!cell || isLeftoverMealCell(cell)) continue
      const id = recipeKey(cell)
      if (!id || unique.some((item) => recipeKey(item) === id)) continue
      unique.push(cell)
    }
  }
  const keep = unique.slice(0, Math.max(1, maxUnique))
  if (keep.length === 0) return grids

  let i = 0
  return grids.map((grid) => {
    let next = grid
    for (const day of COOK_AHEAD_DAY_KEYS) {
      const cell = next[day]?.[meal]
      if (!cell || isLeftoverMealCell(cell)) continue
      next = {
        ...next,
        [day]: { ...(next[day] || {}), [meal]: keep[i % keep.length] },
      }
      i += 1
    }
    return next
  })
}

function applyLeftoversToGrid(
  grid: CookAheadGrid,
  isLocked?: (day: string, meal: 'breakfast' | 'lunch' | 'dinner') => boolean
): CookAheadGrid {
  let next = grid
  for (const day of COOK_AHEAD_DAY_KEYS.slice(0, -1)) {
    const result = applyNextDayLunchLeftover(next, day, { overwrite: true, isLocked })
    if (result.ok) next = result.grid
  }
  return next
}

/** Hvor mange unikke retter der skal gå på skift. `null` = spring over (fast eller rester). */
export function slotRepeatUniqueCount(
  meal: 'breakfast' | 'lunch',
  profile: MealSlotStyleProfile
): number | null {
  if (meal === 'breakfast') {
    if (profile.breakfastStyle === 'skip') return null
    return profile.breakfastStyle === 'repeat' ? 2 : 3
  }
  if (profile.lunchStyle === 'skip' || profile.lunchStyle === 'leftovers') return null
  return 3
}

/** Efter generering: rester-frokost plus 2–3 gentagne morgenmad/frokost-retter. */
export function applyMealSlotStylesToGrids(
  grids: CookAheadGrid[],
  profile: MealSlotStyleProfile,
  isLocked?: (day: string, meal: 'breakfast' | 'lunch' | 'dinner') => boolean
): CookAheadGrid[] {
  let next = profile.lunchStyle === 'leftovers' ? grids.map((grid) => applyLeftoversToGrid(grid, isLocked)) : grids
  const breakfastCount = slotRepeatUniqueCount('breakfast', profile)
  if (breakfastCount) next = repeatMealSlotsAcrossGrids(next, 'breakfast', breakfastCount)
  const lunchCount = slotRepeatUniqueCount('lunch', profile)
  if (lunchCount) next = repeatMealSlotsAcrossGrids(next, 'lunch', lunchCount)
  return next
}

export function applyMealSlotStylesToGrid(
  grid: CookAheadGrid,
  profile: MealSlotStyleProfile,
  isLocked?: (day: string, meal: 'breakfast' | 'lunch' | 'dinner') => boolean
): CookAheadGrid {
  return applyMealSlotStylesToGrids([grid], profile, isLocked)[0]
}

export function mealSlotStylesSummary(profile: MealSlotStyleProfile): string {
  const parts: string[] = []
  const breakfast = profile.breakfastStyle ?? 'skip'
  const lunch = profile.lunchStyle ?? 'skip'
  parts.push(breakfastStyleLabel(breakfast, profile.dietaryApproach))
  parts.push(lunchStyleLabel(lunch))
  parts.push('Aftensmad')
  return parts.join(' · ')
}
