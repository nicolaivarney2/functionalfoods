import type { Metadata } from 'next'
import Link from 'next/link'

import AppStoreBadges from '@/components/AppStoreBadges'

export const metadata: Metadata = {
  title: 'Henvis en ven | Functional Foods',
  description:
    'Inviter 10 venner til Functional Foods — når de opretter sig, kan du få Lifetime med ubegrænset madplaner.',
  alternates: {
    canonical: 'https://www.functionalfoods.dk/henvis',
  },
}

export default function HenvisMarketingPage() {
  return (
    <div className="bg-white text-slate-900">
      <section className="border-b border-emerald-100 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container max-w-2xl px-4 py-14 sm:py-20">
          <p className="text-sm font-medium text-emerald-800">Henvisningsprogram</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Inviter 10 — få Lifetime</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Del Functional Foods med venner. Når 10 personer downloader appen og opretter sig via dit link eller din
            kode — også på gratis plan — kan du få Lifetime: ubegrænset madplaner og prisalarmer, uden månedlig
            betaling.
          </p>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            På et tidspunkt forsvinder den nuværende gratis ramme. Med Lifetime har du det gratis for altid.
          </p>
          <p className="mt-6 text-sm text-slate-500">
            Dit personlige link og din progress finder du i appen under Profil → Inviter venner. Lifetime tildeles
            manuelt, når vi har tjekket at henvisningerne er ægte. Læs{' '}
            <Link href="/betingelser#henvisning" className="font-medium text-emerald-800 underline underline-offset-2">
              betingelserne
            </Link>
            .
          </p>
          <div className="mt-8">
            <AppStoreBadges showCaption />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/kom-i-gang"
              className="inline-flex rounded-xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white"
            >
              Åbn appen / opret dig
            </Link>
            <Link
              href="/funktioner"
              className="inline-flex rounded-xl border border-emerald-800 px-5 py-3 text-sm font-semibold text-emerald-900"
            >
              Se funktioner
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
