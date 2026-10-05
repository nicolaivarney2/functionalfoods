/**
 * Billeder og butikslinks fra Goma og Tjek må ikke bruges.
 * Funktionen returnerer null for de værter, så serveren ikke henter filen.
 */

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

function hostIs(hostname: string, suffix: string): boolean {
  return hostname === suffix || hostname.endsWith(`.${suffix}`)
}

/** Upstream-værter hvis indhold vi ikke må hente. */
export function isHiddenCatalogImageHost(url: string | null | undefined): boolean {
  if (!url) return false
  const host = hostnameOf(url.trim())
  if (!host) return false
  return hostIs(host, 'goma.gg') || hostIs(host, 'tjek.com') || hostIs(host, 'etilbudsavis.dk')
}

function isRetiredCatalogProxy(url: string): boolean {
  return (
    url.includes('/api/images/catalog/g/') ||
    url.includes('/api/images/catalog/e/') ||
    url.includes('/api/images/catalog/a/')
  )
}

/** Offentlig billed-URL. Goma- og Tjek-adresser bliver null. */
export function toPublicCatalogImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null
  const url = imageUrl.trim()
  if (!url) return null
  if (isRetiredCatalogProxy(url) || isHiddenCatalogImageHost(url)) return null
  return url
}

/** Butikslink der peger på en skjult leverandør må ikke sendes til browseren. */
export function publicStoreUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  if (isHiddenCatalogImageHost(url)) return null
  return url.trim()
}
