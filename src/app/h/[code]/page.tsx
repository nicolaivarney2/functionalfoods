import type { Metadata } from 'next'
import Link from 'next/link'

import AppStoreBadges from '@/components/AppStoreBadges'
import ReferralCapture from '@/components/ReferralCapture'
import { normalizeReferralCode } from '@/lib/referral-shared'

type Props = { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const normalized = normalizeReferralCode(code)
  return {
    title: 'Inviteret til Functional Foods',
    description:
      'Download Functional Foods og opret dig gratis. 10 venner der opretter sig giver henviseren Lifetime.',
    robots: { index: false, follow: false },
    alternates: {
      canonical: `https://www.functionalfoods.dk/h/${encodeURIComponent(normalized || code)}`,
    },
  }
}

export default async function ReferralLandingPage({ params }: Props) {
  const { code: raw } = await params
  const code = normalizeReferralCode(raw)

  return (
    <div className="bg-white text-slate-900">
      {code ? <ReferralCapture code={code} /> : null}
      <section className="border-b border-emerald-100 bg-gradient-to-b from-emerald-50 to-white">
        <div className="container max-w-xl px-4 py-14 sm:py-20 text-center">
          <p className="text-sm font-medium text-emerald-800">Du er inviteret</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Prøv Functional Foods — gratis
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Madplaner ud fra ugens tilbud, indkøbsliste og dagbog. Opret dig — også på gratis plan.
          </p>

          {code ? (
            <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Henvisningskode</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.18em] text-slate-900">{code}</p>
              <p className="mt-2 text-sm text-slate-600">
                Download appen og skriv koden, når du opretter dig — så tæller din konto med.
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-500">Linket ser ugyldigt ud. Bed venner om et nyt.</p>
          )}

          <div className="mt-8 flex justify-center">
            <AppStoreBadges showCaption align="center" />
          </div>
          <p className="mt-4">
            <Link
              href={code ? `/lav-din-plan?ref=${encodeURIComponent(code)}` : '/lav-din-plan'}
              className="text-sm font-semibold text-emerald-800 underline underline-offset-2"
            >
              Eller opret dig på web
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
