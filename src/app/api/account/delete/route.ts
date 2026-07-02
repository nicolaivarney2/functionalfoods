import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Sletter den aktuelle brugers konto + alle tilknyttede data.
 * Bruges af Functional Foods-appen (Apple kræver "Slet konto" i appen) og kaldes
 * Bearer-autentificeret. Service-role bruges til både data-sletning og
 * auth-bruger-sletning.
 */

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase configuration')
  }
  return createSupabaseClient(supabaseUrl, serviceKey)
}

async function getUser(request: NextRequest, supabase: ReturnType<typeof getServiceClient>) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

// Tabeller med brugerens data. De fleste er keyed på `user_id`; user_profiles på `id`.
const USER_ID_TABLES = [
  'family_profiles',
  'user_meal_plans',
  'user_saved_recipes',
  'user_price_alert_groups',
  'user_price_alert_meta',
  'user_price_alerts',
  'user_manual_shopping_items',
  'user_savings_totals',
  'user_savings_snapshots',
]

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    const user = await getUser(request, supabase)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Best-effort sletning af data. Vi fortsætter selv hvis en tabel mangler/fejler,
    // så selve kontoen altid kan slettes.
    for (const table of USER_ID_TABLES) {
      const { error } = await supabase.from(table).delete().eq('user_id', user.id)
      if (error) console.warn(`account/delete: kunne ikke rydde ${table}:`, error.message)
    }

    const { error: profileError } = await supabase.from('user_profiles').delete().eq('id', user.id)
    if (profileError) console.warn('account/delete: kunne ikke rydde user_profiles:', profileError.message)

    const { error: authError } = await supabase.auth.admin.deleteUser(user.id)
    if (authError) {
      console.error('account/delete: kunne ikke slette auth-bruger:', authError.message)
      return NextResponse.json({ error: 'Kunne ikke slette kontoen' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/account/delete:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
