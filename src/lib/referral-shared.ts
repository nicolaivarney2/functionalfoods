export const REFERRAL_GOAL = 10
export const REFERRAL_COOKIE = 'ff_ref'
export const REFERRAL_CODE_LENGTH = 8
export const REFERRAL_SHARE_ORIGIN = 'https://www.functionalfoods.dk'
export const REFERRAL_REWARD_EMAIL = 'nicolai@planomo.dk'
export const REFERRAL_CLAIM_WINDOW_DAYS = 7
export const REFERRAL_PROMPT_AFTER_MEAL_PLANS = 3

export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=dk.functionalfoods.app'
/** App Store Connect id 6782384316 (eas.json submit.production.ios.ascAppId). */
export const APP_STORE_URL = 'https://apps.apple.com/dk/app/id6782384316'

export type ReferralRewardStatus = 'in_progress' | 'pending_review' | 'granted' | 'revoked'

export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (code.length < 6 || code.length > 12) return null
  return code
}

export function shareUrlForCode(code: string): string {
  return `${REFERRAL_SHARE_ORIGIN}/h/${encodeURIComponent(code.toUpperCase())}`
}
