import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildSleepCutoffs, sweepFfProductOffers } from './ff-offer-sweep'

type Row = {
  id: string
  store_id: string | null
  source: string | null
  is_on_sale: boolean | null
  normal_price: number | null
  sale_valid_to: string | null
  last_seen_at: string | null
}

type Writes = {
  slept: string[]
  deleted: string[]
  normalPriceCleared: string[]
  pageRequests: number
}

function row(partial: Partial<Row> & { id: string }): Row {
  return {
    store_id: 'foetex',
    source: 'salling-algolia:foetex',
    is_on_sale: false,
    normal_price: null,
    sale_valid_to: null,
    last_seen_at: null,
    ...partial,
  }
}

/**
 * Minimal PostgREST-stub: nok til at dække keyset-pagineringen (`.gt('id')`) og
 * de tre skrive-stier. Rigtig SupabaseClient kan ikke bruges her — sweepen skal
 * kunne verificeres uden at ramme FF.
 */
function fakeFf(rows: Row[], pageLimit = 1000): { ff: SupabaseClient; writes: Writes } {
  const writes: Writes = { slept: [], deleted: [], normalPriceCleared: [], pageRequests: 0 }
  const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id))

  const selectBuilder = () => {
    let after: string | null = null
    let limit = pageLimit
    const builder: Record<string, unknown> = {
      order: () => builder,
      limit: (n: number) => {
        limit = Math.min(n, pageLimit)
        return builder
      },
      gt: (_col: string, value: string) => {
        after = value
        return builder
      },
      then: (resolve: (value: { data: Row[]; error: null }) => unknown) => {
        writes.pageRequests++
        const page = sorted.filter((r) => after === null || r.id > after).slice(0, limit)
        return Promise.resolve(resolve({ data: page, error: null }))
      },
    }
    return builder
  }

  const writeBuilder = (target: string[]) => {
    const builder: Record<string, unknown> = {
      in: (_col: string, ids: string[]) => {
        target.push(...ids)
        return Promise.resolve({ data: null, error: null })
      },
    }
    return builder
  }

  const ff = {
    from: () => ({
      select: selectBuilder,
      update: (payload: Record<string, unknown>) =>
        writeBuilder(
          payload.is_on_sale === false ? writes.slept : writes.normalPriceCleared,
        ),
      delete: () => writeBuilder(writes.deleted),
    }),
  } as unknown as SupabaseClient

  return { ff, writes }
}

const NOISE = () => {}

describe('buildSleepCutoffs', () => {
  it('holder Tjek-overlay og primærkilde adskilt pr. butik', () => {
    const cutoffs = buildSleepCutoffs([
      { store_id: 'foetex', source: 'salling-algolia:foetex', is_on_sale: true, last_seen_at: '2026-09-01T12:00:00Z' },
      { store_id: 'foetex', source: 'tjek:offers', is_on_sale: true, last_seen_at: '2026-08-30T09:00:00Z' },
    ])
    assert.equal(cutoffs.get('foetex|native'), '2026-09-01T12:00:00Z')
    assert.equal(cutoffs.get('foetex|tjek'), '2026-08-30T09:00:00Z')
  })

  it('ignorerer rækker uden tilbud eller uden last_seen', () => {
    const cutoffs = buildSleepCutoffs([
      { store_id: 'netto', source: 'x', is_on_sale: false, last_seen_at: '2026-09-01T12:00:00Z' },
      { store_id: 'netto', source: 'x', is_on_sale: true, last_seen_at: null },
    ])
    assert.equal(cutoffs.size, 0)
  })
})

describe('sweepFfProductOffers', () => {
  it('slukker forsvundne tilbud men lader friske og Tjek-overlay stå', async () => {
    const { ff, writes } = fakeFf([
      row({ id: 'a', is_on_sale: true, last_seen_at: '2026-09-01T12:00:00Z' }),
      row({ id: 'b', is_on_sale: true, last_seen_at: '2026-08-25T12:00:00Z' }),
      row({
        id: 'c',
        source: 'tjek:offers',
        is_on_sale: true,
        last_seen_at: '2026-08-30T09:00:00Z',
        sale_valid_to: '2026-09-10T00:00:00Z',
      }),
    ])
    const result = await sweepFfProductOffers({
      ff,
      cutoffs: buildSleepCutoffs([
        { store_id: 'foetex', source: 'salling-algolia:foetex', is_on_sale: true, last_seen_at: '2026-09-01T12:00:00Z' },
        { store_id: 'foetex', source: 'tjek:offers', is_on_sale: true, last_seen_at: '2026-08-30T09:00:00Z' },
      ]),
      gomaImportEnabled: true,
      log: NOISE,
    })

    assert.deepEqual(writes.slept, ['b'])
    assert.equal(result.slept, 1)
    assert.equal(result.sleptByReason['væk fra fooddata'], 1)
  })

  it('slukker udløbne tilbud uanset last_seen', async () => {
    const { ff, writes } = fakeFf([
      row({
        id: 'a',
        is_on_sale: true,
        last_seen_at: '2026-09-01T12:00:00Z',
        sale_valid_to: '2026-08-20T00:00:00Z',
      }),
    ])
    const result = await sweepFfProductOffers({ ff, gomaImportEnabled: true, log: NOISE })
    assert.deepEqual(writes.slept, ['a'])
    assert.equal(result.sleptByReason['udløbet tilbud'], 1)
  })

  it('sletter goma på Salling, udløbet goma og Tjek på Goma-kæder', async () => {
    const { ff, writes } = fakeFf([
      row({ id: 'a', store_id: 'bilka', source: 'goma', is_on_sale: true }),
      row({ id: 'b', store_id: 'meny', source: 'goma', is_on_sale: true, sale_valid_to: '2026-08-01T00:00:00Z' }),
      row({ id: 'c', store_id: 'lidl', source: 'tjek:offers', is_on_sale: true }),
      row({ id: 'd', store_id: 'meny', source: 'goma', is_on_sale: true, sale_valid_to: '2099-01-01T00:00:00Z' }),
    ])
    const result = await sweepFfProductOffers({ ff, gomaImportEnabled: true, log: NOISE })
    assert.deepEqual(writes.deleted.sort(), ['a', 'b', 'c'])
    assert.equal(result.deleted, 3)
    assert.deepEqual(writes.slept, [])
  })

  it('lader goma-rækker stå når Goma-import er slået fra', async () => {
    const { ff, writes } = fakeFf([
      row({ id: 'a', store_id: 'bilka', source: 'goma', is_on_sale: true }),
      row({ id: 'b', store_id: 'lidl', source: 'tjek:offers', is_on_sale: true }),
    ])
    await sweepFfProductOffers({ ff, gomaImportEnabled: false, log: NOISE })
    assert.deepEqual(writes.deleted, [])
  })

  it('rydder normal_price på rækker uden tilbud', async () => {
    const { ff, writes } = fakeFf([
      row({ id: 'a', is_on_sale: false, normal_price: 24.95 }),
      row({ id: 'b', is_on_sale: false, normal_price: null }),
    ])
    const result = await sweepFfProductOffers({ ff, gomaImportEnabled: true, log: NOISE })
    assert.deepEqual(writes.normalPriceCleared, ['a'])
    assert.equal(result.normalPriceCleared, 1)
  })

  it('scanner videre forbi PostgREST-loftet på 1000 rækker', async () => {
    const rows = Array.from({ length: 2500 }, (_, i) =>
      row({ id: `row-${String(i).padStart(5, '0')}`, is_on_sale: false, normal_price: 10 }),
    )
    const { ff, writes } = fakeFf(rows, 1000)
    const result = await sweepFfProductOffers({ ff, gomaImportEnabled: true, log: NOISE })
    assert.equal(result.scanned, 2500)
    assert.equal(result.normalPriceCleared, 2500)
    // 3 fulde/delvise sider + én tom side der afslutter løkken.
    assert.equal(writes.pageRequests, 4)
  })

  it('skriver intet i dry-run', async () => {
    const { ff, writes } = fakeFf([
      row({ id: 'a', store_id: 'bilka', source: 'goma', is_on_sale: true }),
      row({ id: 'b', is_on_sale: false, normal_price: 12 }),
    ])
    const result = await sweepFfProductOffers({
      ff,
      gomaImportEnabled: true,
      dryRun: true,
      log: NOISE,
    })
    assert.deepEqual(writes.deleted, [])
    assert.deepEqual(writes.normalPriceCleared, [])
    assert.equal(result.deleted, 1)
    assert.equal(result.normalPriceCleared, 1)
  })
})
