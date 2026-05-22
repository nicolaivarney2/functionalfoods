import { type NextRequest } from 'next/server'
import { requireApiKey } from '@/grocery/api/auth'
import { serverError } from '@/grocery/api/responses'
import { getGroceryServiceClient } from '@/grocery/db/client'
import { NextResponse } from 'next/server'
import type { GroceryCategoryNode } from '@/grocery/api/shapes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/grocery/categories
 *
 * Returns the 3-level category tree built from `category_lvl0/1/2` with
 * product counts per node. Cached for 10 minutes.
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireApiKey(request)
  if (unauthorized) return unauthorized

  const { searchParams } = new URL(request.url)
  const chain = searchParams.get('chain') ?? undefined

  const supabase = getGroceryServiceClient()

  // Pull just the category fields. With 60k+ rows we paginate.
  type Row = { category_lvl0: string | null; category_lvl1: string | null; category_lvl2: string | null }
  const rows: Row[] = []
  const PAGE = 1000
  for (let offset = 0; ; offset += PAGE) {
    let q = supabase
      .from('products')
      .select('category_lvl0, category_lvl1, category_lvl2')
      .eq('active', true)
      .not('name', 'eq', '')
      .not('category_lvl0', 'is', null)
      .range(offset, offset + PAGE - 1)
    if (chain) q = q.eq('source_chain', chain)
    const { data, error } = await q
    if (error) return serverError('Categories query failed', error.message)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }

  // Build the tree
  const root = new Map<string, { count: number; children: Map<string, { count: number; children: Map<string, number> }> }>()
  for (const r of rows) {
    const l0 = r.category_lvl0 || '(uden kategori)'
    let n0 = root.get(l0)
    if (!n0) {
      n0 = { count: 0, children: new Map() }
      root.set(l0, n0)
    }
    n0.count++
    if (!r.category_lvl1) continue
    let n1 = n0.children.get(r.category_lvl1)
    if (!n1) {
      n1 = { count: 0, children: new Map() }
      n0.children.set(r.category_lvl1, n1)
    }
    n1.count++
    if (!r.category_lvl2) continue
    n1.children.set(r.category_lvl2, (n1.children.get(r.category_lvl2) ?? 0) + 1)
  }

  const tree: GroceryCategoryNode[] = [...root.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, node]) => ({
      name,
      productCount: node.count,
      children: [...node.children.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .map(([childName, childNode]) => ({
          name: childName,
          productCount: childNode.count,
          children: [...childNode.children.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([leafName, count]) => ({ name: leafName, productCount: count })),
        })),
    }))

  return NextResponse.json(
    { data: tree, meta: { totalProducts: rows.length } },
    {
      headers: { 'Cache-Control': 'private, max-age=600, stale-while-revalidate=1800' },
    },
  )
}
