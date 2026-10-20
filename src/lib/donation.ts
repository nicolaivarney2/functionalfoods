/** Dage fra kontoens oprettelse, før donations-popuppen må vises. */
export const DONATION_AFTER_DAYS = 14

const MS_PER_DAY = 86_400_000

/**
 * MobilePay-boks. Tom streng = kun tekst, ingen nummer og ingen knap.
 * Sæt de 8 tegn her, når boksen er klar.
 */
export const MOBILEPAY_BOX = ''

export function mobilePayBoxLabel(box: string = MOBILEPAY_BOX): string {
  return box.trim().toUpperCase()
}

export function hasMobilePayBox(box: string = MOBILEPAY_BOX): boolean {
  return mobilePayBoxLabel(box).length > 0
}

export function donationDismissKey(userId: string): string {
  return `functionalfoods_donation_dismissed_v1:${userId}`
}

/** Sandt når kontoen er mindst 14 dage gammel. Ukendt dato viser ikke popuppen. */
export function donationIsDue(createdAt: string | null | undefined, nowMs: number = Date.now()): boolean {
  const created = Date.parse(createdAt ?? '')
  if (!Number.isFinite(created)) return false
  return nowMs - created >= DONATION_AFTER_DAYS * MS_PER_DAY
}
