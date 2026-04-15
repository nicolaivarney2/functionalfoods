/**
 * GA4 (gtag) + Meta Pixel (fbq) — kun når scripts er indlæst via layout (NEXT_PUBLIC_*).
 * Bruges til sidevisninger og events fra AnalyticsProvider.
 */

type GtagFn = (...args: unknown[]) => void
type FbqFn = (...args: unknown[]) => void

function win(): (Window & { gtag?: GtagFn; fbq?: FbqFn }) | undefined {
  return typeof window !== 'undefined' ? window : undefined
}

/** GA4 page_view + Meta PageView (kald ved hver ruteændring inkl. første load). */
export function fireMarketingPageView(pathname: string): void {
  const w = win()
  if (!w) return
  const href = w.location.href
  const title = typeof document !== 'undefined' ? document.title : ''

  if (typeof w.gtag === 'function') {
    w.gtag('event', 'page_view', {
      page_path: pathname,
      page_location: href,
      page_title: title,
    })
  }
  if (typeof w.fbq === 'function') {
    w.fbq('track', 'PageView')
  }
}

/** GA4 custom event + Meta trackCustom (til konverteringer / funnel). */
export function fireMarketingEvent(
  name: string,
  params?: Record<string, unknown>
): void {
  const w = win()
  if (!w) return
  const payload = params && typeof params === 'object' ? params : {}
  if (typeof w.gtag === 'function') {
    w.gtag('event', name, payload)
  }
  if (typeof w.fbq === 'function') {
    w.fbq('trackCustom', name, payload)
  }
}
