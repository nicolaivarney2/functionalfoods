import { redirect } from 'next/navigation'

/** Tidligere medlemsside – samme flow som kom-i-gang (signup + valgfri støtte). */
export default function MedlemRedirectPage() {
  redirect('/kom-i-gang')
}
