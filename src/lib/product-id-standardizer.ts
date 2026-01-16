/**
 * Standardizes product_external_id format across the system
 * 
 * Standard formats:
 * - Old structure (REMA): "python-12345" or "rema-12345" (kept as-is for backward compatibility)
 * - New structure: "productId-storeId" (numeric, e.g., "123-456")
 * 
 * This ensures consistent product matching and lookup.
 */

export interface ProductIdInfo {
  format: 'old' | 'new' | 'invalid'
  productId?: number
  storeId?: number
  originalId?: string
  storeName?: string
}

/**
 * Parses and standardizes a product_external_id
 */
export function parseProductId(productExternalId: string): ProductIdInfo {
  if (!productExternalId) {
    return { format: 'invalid' }
  }

  // Old structure: "python-12345" or "rema-12345"
  if (productExternalId.startsWith('python-') || productExternalId.startsWith('rema-')) {
    return {
      format: 'old',
      originalId: productExternalId
    }
  }

  // New structure: "productId-storeId" (numeric)
  const numericMatch = /^(\d+)-(\d+)$/.exec(productExternalId)
  if (numericMatch) {
    return {
      format: 'new',
      productId: parseInt(numericMatch[1]),
      storeId: parseInt(numericMatch[2]),
      originalId: productExternalId
    }
  }

  // Invalid format (hash-based, etc.)
  return {
    format: 'invalid',
    originalId: productExternalId
  }
}

/**
 * Creates a standardized product_external_id for new products
 */
export function createProductId(productId: number, storeId: number): string {
  return `${productId}-${storeId}`
}

/**
 * Checks if a product_external_id is in the new standardized format
 */
export function isStandardizedFormat(productExternalId: string): boolean {
  const info = parseProductId(productExternalId)
  return info.format === 'new' || info.format === 'old'
}


