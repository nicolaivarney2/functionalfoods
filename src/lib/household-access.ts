import type { User } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { createSupabaseServiceClient } from '@/lib/supabase'

export type AccountKind = 'primary' | 'partner'

export type HouseholdAccess = {
  user: Pick<User, 'id'>
  ownerId: string
  accountKind: AccountKind
}

export async function loadHouseholdForUser(user: Pick<User, 'id'>): Promise<HouseholdAccess | null> {
  const supabase = createSupabaseServiceClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('account_kind, linked_owner_id')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('loadHouseholdForUser:', error.message)
    return { user, ownerId: user.id, accountKind: 'primary' }
  }

  if (data?.account_kind === 'partner') {
    if (!data.linked_owner_id) return null
    return { user, ownerId: data.linked_owner_id, accountKind: 'partner' }
  }

  return { user, ownerId: user.id, accountKind: 'primary' }
}

export async function getHouseholdAccess(request: NextRequest): Promise<HouseholdAccess | null> {
  const user = await getAuthenticatedUser(request)
  if (!user) return null
  return loadHouseholdForUser(user)
}

export function displayNameFromUser(user: User): string {
  const meta = (user.user_metadata ?? {}) as { name?: string }
  if (typeof meta.name === 'string' && meta.name.trim()) return meta.name.trim()
  const email = user.email ?? ''
  return email.split('@')[0] || 'Bruger'
}

export function partnerInviteUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.functionalfoods.dk').replace(/\/$/, '')
  return `${base}/partner/invite/${encodeURIComponent(token)}`
}
