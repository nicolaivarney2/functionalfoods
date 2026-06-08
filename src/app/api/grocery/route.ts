import { type NextRequest } from 'next/server'
import { requireApiKey } from '@/grocery/api/auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/grocery
 *
 * Discovery document for the Fooddata (grocery) HTTP API.
 */
export async function GET(request: NextRequest) {
  const unauthorized = await requireApiKey(request, 'read:catalog')
  if (unauthorized) return unauthorized

  const base = new URL(request.url).origin

  return NextResponse.json({
    name: 'Fooddata API',
    version: '1.0',
    description:
      'Dansk dagligvare-katalog, tilbud og fælles kurering (matches, fravalg, øko).',
    auth: {
      type: 'bearer',
      header: 'Authorization: Bearer <api_key>',
    },
    endpoints: {
      catalog: {
        stores: `${base}/api/grocery/stores`,
        products: `${base}/api/grocery/products`,
        product: `${base}/api/grocery/products/{idOrGtin}`,
        search: `${base}/api/grocery/search?q=banan`,
        offers: `${base}/api/grocery/offers`,
        categories: `${base}/api/grocery/categories`,
      },
      curation: {
        matches: `${base}/api/grocery/curation/matches`,
        queue: `${base}/api/grocery/curation/queue`,
        ingredientTags: `${base}/api/grocery/curation/ingredient-tags`,
        organicTags: `${base}/api/grocery/curation/organic-tags`,
      },
    },
    docs: 'https://github.com/functionalfoods/functionalfoods/blob/main/docs/FOODDATA_API.md',
  })
}
