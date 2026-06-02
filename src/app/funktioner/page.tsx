import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Calculator,
  ChefHat,
  LayoutGrid,
  MessageSquare,
  PiggyBank,
  Scale,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  FUNKTIONER,
  FUNKTION_OVERVIEW_ORDER,
  type FunktionIconName,
  type FunktionSlug,
} from '@/content/funktioner-landing'

const ICON_BY_NAME: Record<FunktionIconName, LucideIcon> = {
  Sparkles,
  PiggyBank,
  Calculator,
  ChefHat,
  LayoutGrid,
  MessageSquare,
  Scale,
  Users,
}

export const metadata: Metadata = {
  title: 'Funktioner | Functional Foods',
  description:
    'Oversigt over Madbudget, madplaner ud fra tilbud, vægttabsrejse, opskrifter med makro og mikro, smart indkøbsliste på sms og vægt tracker.',
  alternates: {
    canonical: 'https://functionalfoods.dk/funktioner',
  },
  openGraph: {
    title: 'Funktioner | Functional Foods',
    description:
      'Se hvad du kan på Functional Foods - madplaner, tilbud, ernæring, opskrifter og personlig støtte.',
    url: 'https://functionalfoods.dk/funktioner',
  },
}

export default function FunktionerOversigtPage() {
  return (
    <div className="bg-white text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-800 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="container relative mx-auto max-w-5xl px-4 py-14 sm:py-20 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/90">Functional Foods</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">Funktioner</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-emerald-50/95 sm:text-lg">
            Én platform til madplaner ud fra tilbud, tusindvis af ernæringsberegnede opskrifter, personlig vægttabsrejse og
            praktiske værktøjer som sms-indkøbsliste og vægt tracker. Her får du overblikket - med dybdegående sider for hver
            del.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/kom-i-gang"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-900 shadow-lg transition hover:bg-emerald-50"
            >
              Kom i gang gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/opskriftsoversigt"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              Find opskrifter
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">Alle funktioner</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Klik ind for forklaring, fordele og konkrete eksempler - hver side er skrevet til at matche den rigtige oplevelse i
          appen.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FUNKTION_OVERVIEW_ORDER.map((slug) => {
            const f = FUNKTIONER[slug as FunktionSlug]
            if (!f) return null
            const Icon = ICON_BY_NAME[f.iconName]
            return (
              <Link
                key={slug}
                href={`/funktioner/${slug}`}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {f.shortTitle}
                </h3>
                <p className="mt-2 flex-1 text-sm text-slate-600 leading-relaxed line-clamp-4">{f.description}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:gap-2 transition-all">
                  Læs mere
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
