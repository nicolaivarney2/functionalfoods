import 'server-only'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe-server'

type UserProfileStripeFields = {
  id: string
  email: string | null
  first_name: string | null
  stripe_customer_id: string | null
}

function getUserDisplayName(user: User, profile?: UserProfileStripeFields | null): string | undefined {
  const metadataName =
    typeof user.user_metadata?.name === 'string'
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : undefined

  return metadataName || profile?.first_name || undefined
}

/**
 * Ensures every signed-up user can be referenced from Stripe before any payment exists.
 */
export async function ensureStripeCustomerForUser(
  supabase: SupabaseClient,
  user: User
): Promise<string> {
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id,email,first_name,stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(`Could not load user profile before Stripe customer creation: ${profileError.message}`)
  }

  const typedProfile = profile as UserProfileStripeFields | null
  if (typedProfile?.stripe_customer_id) {
    return typedProfile.stripe_customer_id
  }

  const email = user.email || typedProfile?.email || undefined
  const stripe = getStripe()
  const customer = await stripe.customers.create({
    ...(email ? { email } : {}),
    ...(getUserDisplayName(user, typedProfile) ? { name: getUserDisplayName(user, typedProfile) } : {}),
    metadata: {
      supabase_user_id: user.id,
    },
  })

  const now = new Date().toISOString()

  if (typedProfile) {
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        ...(email ? { email } : {}),
        stripe_customer_id: customer.id,
        updated_at: now,
      })
      .eq('id', user.id)

    if (updateError) {
      throw new Error(`Could not save Stripe customer id on user profile: ${updateError.message}`)
    }
  } else {
    const { error: insertError } = await supabase.from('user_profiles').insert({
      id: user.id,
      role: 'user',
      email: email ?? null,
      stripe_customer_id: customer.id,
      updated_at: now,
    })

    if (insertError) {
      throw new Error(`Could not create user profile with Stripe customer id: ${insertError.message}`)
    }
  }

  return customer.id
}
