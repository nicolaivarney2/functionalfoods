import { NextRequest, NextResponse } from 'next/server'
import { importGomaProducts } from '@/lib/goma-import'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    const stores: string[] = Array.isArray(body.stores) && body.stores.length > 0
      ? body.stores
      : ['Netto']

    const limit = typeof body.limit === 'number' ? body.limit : 100
    const pages = typeof body.pages === 'number' ? body.pages : 1

    const result = await importGomaProducts({
      stores,
      limit,
      pages,
      onProgress: (info) => {
        console.log(
          `Goma import – store=${info.store}, page=${info.page}, imported=${info.imported}/${info.total}`,
        )
      },
    })

    return NextResponse.json({
      success: true,
      imported: result.totalImported,
      stores,
      limit,
      pages,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Goma import failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}


