import { NextResponse } from 'next/server'
import { isMissingTableError } from '@/lib/supabase-postgrest-error'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { count, error } = await supabase
      .from('success_stories')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ count: 0, missingTable: true })
      }
      return NextResponse.json({ error: 'Kunne ikke tælle afventende historier' }, { status: 500 })
    }

    return NextResponse.json({ count: count ?? 0 })
  } catch (error) {
    console.error('admin success-stories pending-count', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
