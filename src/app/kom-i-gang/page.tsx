import { redirect } from 'next/navigation'

/** Signup + wizard + abonnement — samlet på /lav-din-plan */
export default async function KomIGangRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; code?: string }>
}) {
  const params = await searchParams
  const ref = params.ref || params.code
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  redirect(`/lav-din-plan${q}`)
}
