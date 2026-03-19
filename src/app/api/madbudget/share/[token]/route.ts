import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** GET: Hent delt madplan (offentlig, ingen login) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: plan, error } = await supabase
      .from('user_meal_plans')
      .select('*')
      .eq('share_token', token)
      .eq('is_shared', true)
      .maybeSingle()

    if (error || !plan) {
      return NextResponse.json({ error: 'Plan not found or no longer shared' }, { status: 404 })
    }

    return NextResponse.json({ success: true, plan })
  } catch (error) {
    console.error('Fetch shared plan error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
