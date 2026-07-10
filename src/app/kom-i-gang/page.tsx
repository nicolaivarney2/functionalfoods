import { redirect } from 'next/navigation'

/** Signup + wizard + abonnement — samlet på /lav-din-plan */
export default function KomIGangRedirectPage() {
  redirect('/lav-din-plan')
}
