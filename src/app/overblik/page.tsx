'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Heart,
  LayoutGrid,
  MessageCircle,
  Scale,
  Settings,
  ShoppingBasket,
  User,
  UtensilsCrossed,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { FF_OPEN_MESSENGER_GUIDANCE } from '@/lib/messenger-guidance-events'

type Tool =
  | {
      href: string
      title: string
      description: string
      icon: LucideIcon
      accent: string
      badge?: string
    }
  | {
      messenger: true
      title: string
      description: string
      icon: LucideIcon
      accent: string
      badge?: string
    }

const TOOLS: Tool[] = [
  {
    href: '/madbudget',
    title: 'Madbudget',
    description:
      'Ugeplan med ét klik – familie, kalorier, smag og aktuelle tilbud fra dagligvarebutikkerne samlet ét sted.',
    icon: CalendarDays,
    accent: 'from-emerald-600 to-teal-600',
    badge: 'Kerne',
  },
  {
    href: '/dagligvarer',
    title: 'Dagligvarer & tilbud',
    description: 'Søg og filtrér varer, se tilbudspriser og sammenlign på tværs af butikker.',
    icon: ShoppingBasket,
    accent: 'from-blue-600 to-indigo-600',
  },
  {
    href: '/vaegt-tracker',
    title: 'Vægt tracker',
    description: 'Log vægt, se udvikling og hold motivationen – personligt for dig.',
    icon: Scale,
    accent: 'from-violet-600 to-purple-600',
  },
  {
    href: '/opskriftsoversigt',
    title: 'Opskrifter',
    description: 'Gennemse opskrifter efter kosttype – gem favoritter og find inspiration.',
    icon: UtensilsCrossed,
    accent: 'from-amber-600 to-orange-600',
  },
  {
    href: '/wizard',
    title: 'Personlig trykt bog',
    description:
      'Kør vores trin-for-trin guide om kostvalg, præferencer og mål – og så bygger vi og trykker en personlig bog med opskrifter, indkøbsliste hver uge, og 40–50 siders vægttabshjælp.',
    icon: BookOpen,
    accent: 'from-rose-600 to-pink-600',
  },
  {
    href: '/favoritter',
    title: 'Favoritter',
    description: 'Alle dine gemte opskrifter samlet – hurtigt tilbage til det du elsker.',
    icon: Heart,
    accent: 'from-red-500 to-rose-500',
  },
  {
    href: '/profil',
    title: 'Profil',
    description: 'Navn, konto og overblik over din bruger.',
    icon: User,
    accent: 'from-slate-600 to-slate-700',
  },
  {
    href: '/indstillinger',
    title: 'Indstillinger',
    description: 'Notifikationer og personlige præferencer for siden.',
    icon: Settings,
    accent: 'from-gray-600 to-gray-700',
  },
  {
    messenger: true,
    title: 'Personlig vejledning',
    description:
      'Skriv med os i Messenger om din madplan, ugens tilbud, opskrifter eller det, der driller i hverdagen. Nicolai eller en anden fra teamet svarer, og vi kan koble samtalen til din konto, så hjælpen bliver konkret.',
    icon: MessageCircle,
    accent: 'from-[#0084FF] to-blue-700',
    badge: 'Messenger',
  },
]

function OverblikContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const [dismissWelcome, setDismissWelcome] = useState(false)

  const ny = searchParams.get('ny') === '1'
  const betalingOk = searchParams.get('betaling') === 'ok'

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/kom-i-gang')
    }
  }, [loading, user, router])

  const displayName = useMemo(() => {
    if (!user) return ''
    const n = user.user_metadata?.name as string | undefined
    if (n?.trim()) return n.trim().split(/\s+/)[0]
    return user.email?.split('@')[0] || 'der'
  }, [user])

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-sm">Indlæser dit overblik…</p>
      </div>
    )
  }

  const showWelcome = !dismissWelcome && (ny || betalingOk)

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {showWelcome && (
        <div
          className={`border-b ${
            betalingOk
              ? 'bg-gradient-to-r from-emerald-800 to-teal-800 border-emerald-900'
              : 'bg-gradient-to-r from-emerald-700 to-green-700 border-emerald-800'
          } text-white`}
        >
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex gap-3">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">
                    {betalingOk ? 'Tak for din støtte – velkommen!' : `Velkommen, ${displayName}!`}
                  </h1>
                  <p className="text-white/90 text-sm mt-1 max-w-xl">
                    {betalingOk
                      ? 'Betalingen er gennemført. Herunder ser du alt, du kan bruge – start med Madbudget eller udforsk værktøjerne.'
                      : 'Din konto er klar. Her er et overblik over, hvad Functional Foods kan for dig – vi anbefaler at starte med Madbudget og familieindstillinger.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissWelcome(true)}
                className="text-sm text-white/80 hover:text-white underline self-start sm:self-center shrink-0"
              >
                Skjul
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 max-w-5xl pt-10">
        <header className="mb-10">
          {!showWelcome && (
            <h1 className="text-3xl font-bold text-slate-900">
              Hej, {displayName}
              <span className="text-slate-400 font-normal"> – dit overblik</span>
            </h1>
          )}
          <p className="text-slate-600 mt-2 max-w-2xl">
            Madplaner der følger <strong>rigtige tilbud</strong>, din familie og dine mål – plus opskrifter,
            dagligvarer og vægt tracker. Vælg hvor du vil starte.
          </p>
        </header>

        <section className="mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
            Kom godt i gang (3 trin)
          </h2>
          <ol className="grid md:grid-cols-3 gap-4">
            {[
              {
                step: '1',
                title: 'Åbn Madbudget',
                text: 'Her sætter du familie, butikker, kalorier og smag – og genererer ugeplan.',
                href: '/madbudget',
              },
              {
                step: '2',
                title: 'Tjek familieindstillinger',
                text: 'I Madbudget: brug knappen «Familieindstillinger». Antal voksne/børn, butikker og præferencer styrer din plan.',
                href: '/madbudget',
              },
              {
                step: '3',
                title: 'Se tilbud i dagligvarer',
                text: 'Browse eller søg efter varer og tilbud, så du kender priserne i praksis.',
                href: '/dagligvarer',
              },
            ].map((item) => (
              <li
                key={item.step}
                className="relative rounded-2xl bg-white border border-slate-200 p-5 shadow-sm flex flex-col"
              >
                <span className="absolute -top-3 left-5 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  Trin {item.step}
                </span>
                <h3 className="font-semibold text-slate-900 mt-2 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 flex-1 mb-4">{item.text}</p>
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                >
                  Gå hertil
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
            Alle funktioner
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {TOOLS.map((tool) => {
              const Icon = tool.icon
              const cardClassName =
                'group flex gap-4 rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all text-left w-full'
              const inner = (
                <>
                  <div
                    className={`shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${tool.accent} flex items-center justify-center text-white shadow-inner`}
                  >
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors">
                        {tool.title}
                      </h3>
                      {tool.badge && (
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full ${
                            'messenger' in tool && tool.messenger
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{tool.description}</p>
                    <span className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-emerald-600 group-hover:gap-2 transition-all">
                      {'messenger' in tool && tool.messenger ? 'Åbn personlig vejledning' : 'Åbn'}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </>
              )

              if ('href' in tool) {
                return (
                  <Link key={tool.href} href={tool.href} className={cardClassName}>
                    {inner}
                  </Link>
                )
              }

              return (
                <button
                  key="personlig-vejledning"
                  type="button"
                  onClick={() => window.dispatchEvent(new Event(FF_OPEN_MESSENGER_GUIDANCE))}
                  className={`${cardClassName} cursor-pointer`}
                >
                  {inner}
                </button>
              )
            })}
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-slate-500" />
                Vil du dykke dybere ned i vægttab?
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Vægttabsunivers med kosttyper, artikler og struktur – stadig med udgangspunkt i sunde vaner.
              </p>
            </div>
            <Link
              href="/vaegttab"
              className="inline-flex justify-center items-center gap-2 rounded-xl bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800 shrink-0"
            >
              Til vægttab
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default function OverblikPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
          Indlæser…
        </div>
      }
    >
      <OverblikContent />
    </Suspense>
  )
}
