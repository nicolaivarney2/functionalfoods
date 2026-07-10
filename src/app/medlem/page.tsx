import { redirect } from 'next/navigation'

/** Tidligere medlemsside — samme flow som lav-din-plan. */
export default function MedlemRedirectPage() {
  redirect('/lav-din-plan')
}
