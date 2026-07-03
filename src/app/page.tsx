'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import {
  ArrowRight,
  Check,
  Sparkles,
  Target,
  Zap,
  TrendingDown,
  ChevronDown,
  Search,
  ChevronRight,
  Tag,
  Clock,
  ShoppingCart,
  Calendar,
  ListChecks,
  Store,
  Ban,
  ShieldAlert,
  Users,
} from 'lucide-react'
import { Recipe } from '@/types/recipe'
import HeroVideo from '@/components/home/HeroVideo'
import HeroPlanCard from '@/components/home/HeroPlanCard'
import { useAnalytics } from '@/components/AnalyticsProvider'

const PILLARS = [
  {
    key: 'nemt',
    label: 'Nem at følge',
    headline: 'Hele ugen på plads',
    body: 'Madplan, opskrifter og indkøbsliste - du slipper for at gætte hver aften og kan følge planen i stedet for at starte forfra mandag.',
    icon: Clock,
    gradient: 'from-emerald-500 to-teal-600',
    ring: 'ring-emerald-200/80',
    bg: 'bg-emerald-50',
  },
  {
    key: 'billigt',
    label: 'Spar på indkøbet',
    headline: 'Bygget på ugens tilbud',
    body: 'Din vægttabsplan tager udgangspunkt i, hvad der faktisk er på tilbud i de butikker du handler i - ikke fuldpris og specialvarer du skal jagte.',
    icon: Tag,
    gradient: 'from-amber-500 to-orange-600',
    ring: 'ring-amber-200/80',
    bg: 'bg-amber-50',
  },
  {
    key: 'effektivt',
    label: 'Effektivt',
    headline: 'Kalorier der matcher målet',
    body: 'Planen er beregnet til dit vægttabsmål med danske næringsdata - så du bygger underskud måltid for måltid, uden at leve i en app.',
    icon: TrendingDown,
    gradient: 'from-sky-500 to-cyan-600',
    ring: 'ring-sky-200/80',
    bg: 'bg-sky-50',
  },
] as const

const PLAN_STEPS = [
  {
    step: '1',
    title: 'Ugens tilbud',
    description: 'Vi henter tilbud fra de dagligvarebutikker du vælger - så planen starter i virkeligheden, ikke i en fantasivareliste.',
    icon: Store,
  },
  {
    step: '2',
    title: 'Din profil',
    description:
      'Vægttabsmål, madstil, fravalg af mad du ikke kan lide, allergier, familie og vaner - 30+ parametre samlet ét sted.',
    icon: Target,
  },
  {
    step: '3',
    title: 'Din ugeplan',
    description: 'Retter, kalorier og indkøbsliste klar til dig. Følg ugen - justér når livet sker. Næste måltid tæller mere end sidste fejl.',
    icon: ListChecks,
  },
] as const

const HERO_LABELS = [
  { text: 'Nem at følge' },
  { text: 'Spar på indkøbet' },
  { text: 'Bygget til vægttab' },
] as const

/** Vægttabs-USP'er (inspireret af samme motor som Planomo - holdt til vægttab) */
const PERSONAL_USPS = [
  {
    icon: Ban,
    title: 'Fravælg det du ikke kan lide',
    description:
      'Laks, leverpostej eller broccoli? Marker fravalg - så undgår planen det i hele ugen, ikke kun i én opskrift.',
  },
  {
    icon: ShieldAlert,
    title: 'Allergier og intolerancer',
    description: 'Allergier og mad du ikke tåler indgår i filtreringen, så forslag og ugeplan passer til dig.',
  },
  {
    icon: Store,
    title: 'Din butik, dine tilbud',
    description:
      'Vælg hvor du handler. Planen bygges på tilbud netop dér - du skal ikke skifte butik for at spare.',
  },
  {
    icon: TrendingDown,
    title: 'Dit vægttabsmål',
    description: 'Kalorieunderskud og makro er sat op til dit mål - så planen understøtter vægttab, ikke bare "sund mad".',
  },
  {
    icon: Target,
    title: 'Din madstil',
    description: 'Keto, sense, kalorietælling, GLP-1-venlig kost og flere spor - du vælger, vi tilpasser.',
  },
  {
    icon: Users,
    title: 'Familie og hverdag',
    description:
      'Antal personer, aktivitet og hverdagsvaner kan indgå - så planen er realistisk at følge uge efter uge.',
  },
] as const

const RECIPES_INITIAL = 6
const RECIPES_LOAD_MORE = 6

export default function Home() {
  const { trackEvent } = useAnalytics()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleRecipeCount, setVisibleRecipeCount] = useState(RECIPES_INITIAL)
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true)
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchResults, setSearchResults] = useState<Recipe[]>([])

  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const response = await fetch('/api/recipes')
        if (response.ok) {
          const data = await response.json()
          const recipes = data.recipes || data
          setAllRecipes(recipes)
          setVisibleRecipeCount(RECIPES_INITIAL)
        }
      } catch (error) {
        console.error('Error loading recipes:', error)
      } finally {
        setIsLoadingRecipes(false)
      }
    }
    loadRecipes()
  }, [])

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const filtered = allRecipes
        .filter(
          (recipe) =>
            recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            recipe.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 6)
      setSearchResults(filtered)
      setShowSearchDropdown(true)
    } else {
      setSearchResults([])
      setShowSearchDropdown(false)
    }
  }, [searchQuery, allRecipes])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/opskriftsoversigt?search=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  const getRecipeCategory = (recipe: Recipe): string => {
    const first =
      recipe.dietaryCategories?.find((c): c is string => typeof c === 'string' && c.trim() !== '') ??
      null
    if (first) {
      const categoryMap: { [key: string]: string } = {
        keto: 'Keto',
        sense: 'Sense',
        'glp-1': 'GLP-1 kost',
        glp1: 'GLP-1 kost',
        'anti-inflammatory': 'Anti-inflammatorisk',
        flexitarian: 'Fleksitarisk',
        '5-2-diet': '5:2 Diæt',
        familiemad: 'Kalorietælling',
        family: 'Kalorietælling',
        'proteinrig-kost': 'Proteinrig kost',
        'meal-prep': 'Proteinrig kost',
      }
      return categoryMap[first.toLowerCase()] || first
    }
    return 'Opskrifter'
  }

  const getCategoryHref = (recipe: Recipe): string => {
    const raw = recipe.dietaryCategories?.find((c): c is string => typeof c === 'string' && c.trim() !== '')
    if (raw) {
      const hrefMap: { [key: string]: string } = {
        keto: '/keto/opskrifter',
        sense: '/sense/opskrifter',
        'glp-1': '/GLP-1/opskrifter',
        glp1: '/GLP-1/opskrifter',
        'anti-inflammatory': '/anti-inflammatory/opskrifter',
        flexitarian: '/flexitarian/opskrifter',
        '5-2-diet': '/5-2-diet/opskrifter',
        familiemad: '/familie/opskrifter',
        family: '/familie/opskrifter',
        'proteinrig-kost': '/proteinrig-kost/opskrifter',
        'meal-prep': '/proteinrig-kost/opskrifter',
      }
      return hrefMap[raw.toLowerCase()] || '/opskriftsoversigt'
    }
    return '/opskriftsoversigt'
  }

  const faqs = [
    {
      question: 'Kan jeg fravælge mad jeg ikke kan lide?',
      answer:
        'Ja. I Madbudget og din profil kan du fravælge ingredienser og retter. Planen og opskriftsforslag tager højde for det - ligesom allergier og madvaner - så du ikke får en uge fuld af ting du alligevel ikke spiser.',
    },
    {
      question: 'Hvad betyder “vægttabsplan ud fra tilbud”?',
      answer:
        'Når du laver en madplan hos os, kan den bygges på næste uges tilbud i de butikker du vælger. Det gør det billigere at handle sundt - og du slipper for at købe fuldpris-varer, der ikke passer budgettet, bare fordi en generisk madplan siger det.',
    },
    {
      question: 'Hvad er de “30+ parametre”?',
      answer:
        'Ud over tilbud tager vi højde for dit vægttabsmål, madstil (keto, sense, kalorietælling osv.), aktivitet, familieliv, allergier og præferencer. Pointen er en plan du faktisk kan leve med - ikke en standard-skabelon.',
    },
    {
      question: 'Koster det noget?',
      answer:
        'Opskrifter og meget indhold er gratis. Madplaner, favoritter og personlige beregninger kræver en gratis profil. Ingen skjult abonnement - vi har “betal hvad du kan/vil”, hvis du vil støtte siden.',
    },
    {
      question: 'Skal jeg følge keto eller én bestemt kur?',
      answer:
        'Nej. Vægttab handler om energibalance over tid. Du vælger den madstil, der passer dit liv - vi tilpasser planen og opskrifterne derefter.',
    },
    {
      question: 'Kan jeg stole på næringstallene?',
      answer:
        'Beregninger bygger på danske råvarer og FRIDA. Kalorier, makro og mere detaljeret næring, når data findes - så planen understøtter dit mål med tal, ikke gæt.',
    },
    {
      question: 'Hvad hvis jeg falder fra?',
      answer:
        'Det er normalt. Vægttab går sjældent lige ned. Vi hjælper dig med at komme tilbage ved næste måltid - med konkrete retter og lister, så det gode valg er det nemme.',
    },
  ]

  const madstilKort = [
    { name: 'KETO', icon: '🥑', suitsYou: 'Vil have struktur og færre kulhydrater', href: '/keto/opskrifter' },
    { name: 'SENSE', icon: '✋', suitsYou: 'Vil spise almindelig mad uden forbud', href: '/sense/opskrifter' },
    { name: 'GLP-1 KOST', icon: '🧠', suitsYou: 'Vil mættes bedre med naturlig mad', href: '/GLP-1/opskrifter' },
    { name: 'PROTEINRIG', icon: '💪', suitsYou: 'Vil optimere protein og mæthed', href: '/proteinrig-kost/opskrifter' },
    { name: 'ANTI-INFLAMMATORISK', icon: '🌿', suitsYou: 'Vil ren, uforarbejdet mad', href: '/anti-inflammatory/opskrifter' },
    { name: 'FLEKSITARISK', icon: '🥬', suitsYou: 'Vil spise plante-fokuseret med fleksibilitet', href: '/flexitarian/opskrifter' },
    { name: '5:2 DIÆT', icon: '⏰', suitsYou: 'Vil fastedage ind i hverdagen', href: '/5-2-diet/opskrifter' },
    { name: 'KALORIETÆLLING', icon: '👨‍👩‍👧‍👦', suitsYou: 'Vil spise med familien og styre energien', href: '/familie/opskrifter' },
  ]

  const vaegttabOmrader = [
    { label: 'Keto', href: '/keto/vaegttab', icon: '🥑' },
    { label: 'Sense', href: '/sense/vaegttab', icon: '✋' },
    { label: 'GLP-1', href: '/GLP-1/vaegttab', icon: '🧠' },
    { label: 'Proteinrig', href: '/proteinrig-kost/vaegttab', icon: '💪' },
    { label: 'Anti-inflammatorisk', href: '/anti-inflammatory/vaegttab', icon: '🌿' },
    { label: 'Fleksitarisk', href: '/flexitarian/vaegttab', icon: '🥬' },
    { label: '5:2', href: '/5-2-diet/vaegttab', icon: '⏰' },
    { label: 'Kalorietælling', href: '/kalorietaelling/vaegttab', icon: '👨‍👩‍👧‍👦' },
  ]

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative z-30 overflow-x-clip bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="container relative px-4 py-10 sm:py-12 lg:py-16">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-6 sm:gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="order-1 min-w-0">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-950 ring-1 ring-amber-500 sm:gap-2 sm:px-4 sm:py-1.5 sm:text-xs">
                <Tag className="h-3 w-3 text-amber-950 sm:h-3.5 sm:w-3.5" aria-hidden />
                Vægttabsplan ud fra tilbud
              </p>
              <h1 className="mt-4 text-[1.75rem] font-extrabold leading-[1.1] tracking-tight sm:mt-5 sm:text-3xl md:text-[2.5rem]">
                Tab dig med smarte madplaner tilpasset ugens tilbud
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-emerald-50/90 sm:mt-5 sm:text-base md:text-lg">
                Personlig ugeplan, indkøbsliste og kalorier til dit mål - inkl. mad du fravælger og{' '}
                <strong className="font-semibold text-white">30+ andre parametre</strong>. Gratis at starte.
              </p>

              <ul className="mt-6 hidden flex-col gap-2.5 sm:flex">
                {HERO_LABELS.map((item) => (
                  <li key={item.text} className="flex items-center gap-2.5 text-base text-emerald-50">
                    <Check className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
                    {item.text}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-5">
                <Link
                  href="/lav-din-plan"
                  onClick={() => trackEvent('start_guidet_plan', { cta_location: 'hero' })}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-emerald-900 shadow-lg shadow-black/15 transition hover:bg-emerald-50 sm:w-auto sm:px-7 sm:py-4 sm:text-base"
                >
                  Lav min vægttabsplan
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
                <Link
                  href="/kom-i-gang"
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-100/90 underline decoration-emerald-300/50 underline-offset-4 transition hover:text-white sm:text-base"
                >
                  Opret gratis profil
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
            <div className="order-2 min-w-0">
              <HeroPlanCard />
            </div>
          </div>

          <div className="relative z-40 mx-auto mt-8 max-w-2xl border-t border-white/15 pt-8 pb-2 sm:mt-12 sm:pt-10">
            <p className="mb-3 text-center text-sm text-emerald-100/90">Eller find en opskrift med det samme</p>
            <form onSubmit={handleSearch} className="relative isolate z-40">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length > 0 && setShowSearchDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  placeholder="Søg opskrift eller madstil…"
                  className="w-full rounded-xl px-6 py-4 pl-14 pr-14 text-gray-900 shadow-xl placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              </div>
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/5">
                  {searchResults.map((recipe) => (
                    <Link
                      key={recipe.id}
                      href={`/opskrift/${recipe.slug}`}
                      className="block border-b border-gray-100 px-6 py-4 transition-colors last:border-b-0 hover:bg-gray-50"
                      onClick={() => {
                        setShowSearchDropdown(false)
                        setSearchQuery('')
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {recipe.imageUrl && (
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                            <Image src={recipe.imageUrl} alt={recipe.title} fill className="object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold text-gray-900">{recipe.title}</h3>
                          {recipe.totalTime && <p className="text-sm text-gray-500">{recipe.totalTime} min</p>}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {searchQuery.trim().length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
                      <Link
                        href={`/opskriftsoversigt?search=${encodeURIComponent(searchQuery.trim())}`}
                        className="flex items-center gap-2 font-semibold text-emerald-600 hover:text-emerald-700"
                        onClick={() => setShowSearchDropdown(false)}
                      >
                        Se alle resultater for &quot;{searchQuery}&quot;
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </form>
            <p className="mt-4 text-center text-sm text-emerald-100/90">
              {isLoadingRecipes ? (
                '…'
              ) : (
                <>
                  <span className="font-semibold text-white">
                    {allRecipes.length.toLocaleString('da-DK')}
                  </span>{' '}
                  gratis opskrifter
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Nemt · Billigt · Effektivt */}
      <section className="relative z-20 -mt-1 border-b border-gray-100 bg-white py-14 lg:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">Derfor virker det</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
              En vægttabsplan skal være <span className="text-emerald-600">nem at følge</span>,{' '}
              <span className="text-amber-600">økonomisk</span> og{' '}
              <span className="text-sky-600">effektiv</span>!
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Vi er et smart dansk værktøj til varigt vægttab - Se hvad det kan
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3 md:gap-8">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.key}
                className={`relative overflow-hidden rounded-2xl border-2 border-gray-100 ${pillar.bg} p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg`}
              >
                <div
                  className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${pillar.gradient} text-white shadow-lg ring-4 ${pillar.ring}`}
                >
                  <pillar.icon className="h-7 w-7" strokeWidth={2.5} aria-hidden />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{pillar.label}</p>
                <h3 className="mt-2 text-xl font-bold text-gray-900">{pillar.headline}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App & video */}
      <section className="border-b border-gray-100 bg-white pt-14 pb-16 lg:pt-20 lg:pb-20">
        <div className="container px-4">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="order-2 lg:order-1">
              <HeroVideo />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Appen i aktion</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
                Madplan <span className="text-emerald-600">og</span> madlog i samme app
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-gray-600">
                Lav en madplan ud fra tilbud, og log resten af det du spiser i maddagbogen. Tag et billede af retten,
                indtal hvad du har spist, eller vælg en opskrift — appen estimerer kalorier og næring (Frida) og viser
                dig om du rammer dit mål.
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {[
                  'Maddagbog med kalorier, makro og mikro mod dit personlige mål',
                  'Foto eller stemme: appen lægger måltidet ind for dig',
                  'Madplan synkroniseres til dagbogen — log kun det ekstra',
                  'Skridt fra Apple Sundhed eller Health Connect, vægttracker og ugentligt ernæringstilbageblik',
                  'Indkøbsliste, dagligvarer, prisalarmer og personlig vejledning',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] text-gray-700">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/funktioner/maddagbog-madlogger"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Læs om maddagbog og app-funktioner
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tilpasset dig - vægttabs-USP'er */}
      <section className="border-b border-gray-100 bg-gray-50 py-16 lg:py-20">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Tilpasset dig</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
              Planen følger dit liv - ikke omvendt
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Samme smarte motor som familie-madplaner - her sat op til vægttab: tilbud, mål, fravalg og vaner i ét flow.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {PERSONAL_USPS.map((usp) => (
              <div
                key={usp.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <usp.icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{usp.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{usp.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiator: tilbud → plan */}
      <section className="bg-gradient-to-b from-emerald-50/80 via-white to-white py-16 lg:py-20 border-y border-emerald-100/60">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
              Din vægttabsplan starter i tilbudsavisen - ikke i en fantasivareliste
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              Andre giver dig opskrifter. Vi giver dig en <strong className="font-semibold text-gray-900">hel uge</strong>: retter
              der matcher dit kalorimål, bygget på tilbud i de butikker du vælger - plus indkøbsliste og næring beregnet
              på danske data.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-3">
            {PLAN_STEPS.map((item) => (
              <div key={item.step} className="relative text-center md:text-left">
                <div className="mx-auto md:mx-0 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-2 ring-emerald-100">
                  <item.icon className="h-8 w-8 text-emerald-600" strokeWidth={2} aria-hidden />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Trin {item.step}</span>
                <h3 className="mt-2 text-xl font-bold text-gray-900">{item.title}</h3>
                <p className="mt-3 text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-14 max-w-4xl">
            <div className="flex flex-col items-stretch gap-4 rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-lg md:flex-row md:items-center md:justify-between md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                  <ShoppingCart className="h-6 w-6 text-emerald-700" aria-hidden />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">Klar til din første uge?</p>
                  <p className="mt-1 text-gray-600">
                    Vælg butikker, mål og madstil - få madplan og indkøbsliste med det samme.
                  </p>
                </div>
              </div>
              <Link
                href="/madbudget"
                onClick={() => trackEvent('start_madbudget', { cta_location: 'differentiator' })}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 font-bold text-white transition hover:bg-emerald-700"
              >
                Start Madbudget
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Små valg - condensed */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="container px-4">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-gray-900 md:text-4xl">
                Effektivt vægttab = gode valg igen og igen
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                10 kg er mange måltider. Du behøver ikke ramme plet hver gang - men jo oftere planen gør det nemt at vælge
                rigtigt, jo mere rykker vægten.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  title: '10 kg = mange måltider',
                  text: 'Små, realistiske valg hver uge slår ét stort skift du ikke kan holde.',
                  icon: Target,
                  border: 'border-emerald-200',
                  iconBg: 'bg-emerald-100 text-emerald-600',
                },
                {
                  title: 'Næste måltid > sidste fejl',
                  text: 'Vi hjælper dig tilbage på sporet med konkrete retter - ikke dårlig samvittighed.',
                  icon: Zap,
                  border: 'border-sky-200',
                  iconBg: 'bg-sky-100 text-sky-600',
                },
                {
                  title: 'Planen gør det nemt',
                  text: 'Tilbud + opskrifter + liste = det sunde valg er det billige og nemme valg.',
                  icon: Sparkles,
                  border: 'border-amber-200',
                  iconBg: 'bg-amber-100 text-amber-600',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className={`rounded-2xl border-2 ${card.border} bg-white p-6 shadow-sm`}
                >
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${card.iconBg}`}>
                    <card.icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{card.text}</p>
                </div>
              ))}
            </div>

            <p className="mt-10 text-center text-base font-semibold text-emerald-800">
              Det er sådan du taber 5, 10 eller 20 kg - uden at starte forfra hver mandag.
            </p>
          </div>
        </div>
      </section>

      {/* Find madstil */}
      <section id="find-din-madstil" className="py-16 lg:py-20 bg-gray-50">
        <div className="container px-4">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-extrabold text-gray-900 md:text-4xl">Vælg madstil - vi tilpasser planen</h2>
            <p className="mt-4 text-lg text-gray-600">
              Keto, sense, kalorietælling eller andet. <strong className="text-gray-900">Planen følger dig</strong> - tilbud og
              parametre gør resten.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {madstilKort.map((niche) => (
              <Link
                key={niche.name}
                href={niche.href}
                className="group rounded-xl border-2 border-gray-100 bg-white p-5 transition hover:border-emerald-200 hover:shadow-lg"
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{niche.icon}</div>
                <h3 className="font-bold text-gray-900 group-hover:text-emerald-700">{niche.name}</h3>
                <p className="mt-3 text-sm text-gray-600 border-t border-gray-100 pt-3">
                  <span className="font-medium text-emerald-700">Passer hvis:</span> {niche.suitsYou}
                </p>
              </Link>
            ))}
          </div>

          <p className="mt-10 text-center">
            <Link href="/vaegttab" className="inline-flex items-center gap-2 font-semibold text-emerald-700 hover:text-emerald-800">
              Læs mere om vægttab hos os
              <ChevronRight className="h-4 w-4" />
            </Link>
          </p>
        </div>
      </section>

      {/* Opskrifter */}
      <section className="py-16 lg:py-20 bg-white border-t border-gray-100">
        <div className="container px-4">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900">Gratis opskrifter til din plan</h2>
              <p className="mt-2 text-gray-600">
                Gennemtestede retter med fulde næringstal - klar til madplan og vægttab.
              </p>
            </div>
            <Link
              href="/opskriftsoversigt"
              className="inline-flex items-center gap-2 font-semibold text-emerald-600 hover:text-emerald-700"
            >
              Se alle opskrifter
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          {isLoadingRecipes ? (
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {Array.from({ length: RECIPES_INITIAL }, (_, i) => (
                <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-4 h-48 rounded-lg bg-gray-200" />
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                {allRecipes.slice(0, visibleRecipeCount).map((recipe) => {
                  const category = getRecipeCategory(recipe)
                  const categoryHref = getCategoryHref(recipe)
                  return (
                    <div
                      key={recipe.id}
                      className="group overflow-hidden rounded-xl border border-gray-200 bg-white hover:shadow-lg transition"
                    >
                      <Link href={`/opskrift/${recipe.slug}`}>
                        <div className="relative h-48 overflow-hidden">
                          <Image
                            src={recipe.imageUrl || '/images/recipe-placeholder.jpg'}
                            alt={recipe.title}
                            fill
                            className="object-cover transition group-hover:scale-105 duration-300"
                          />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 line-clamp-2">
                            {recipe.title}
                          </h3>
                          {recipe.totalTime && (
                            <p className="mt-1 text-sm text-gray-500">{recipe.totalTime} min</p>
                          )}
                        </div>
                      </Link>
                      <div className="px-4 pb-4">
                        <Link href={categoryHref} className="text-sm font-medium text-gray-600 hover:text-emerald-600">
                          Flere {category}-opskrifter →
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>

              {visibleRecipeCount < allRecipes.length && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleRecipeCount((n) =>
                        Math.min(n + RECIPES_LOAD_MORE, allRecipes.length)
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-200 bg-white px-8 py-3.5 text-base font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    Indlæs flere
                    <ChevronDown className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Vægttab guides + funktioner */}
      <section className="border-t border-gray-100 bg-gray-50/80 py-12">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Gå dybere</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {vaegttabOmrader.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900"
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
            <p className="mt-8 text-sm text-gray-500">
              <Link href="/funktioner" className="font-medium text-gray-700 underline underline-offset-2 hover:text-emerald-700">
                Alle funktioner
              </Link>
              {' · '}
              <Link href="/succeshistorier" className="font-medium text-gray-700 underline underline-offset-2 hover:text-emerald-700">
                Succeshistorier
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-10">Ofte stillede spørgsmål</h2>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div key={index} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-gray-50 transition"
                  >
                    <span className="font-semibold text-gray-900">{faq.question}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-gray-400 transition ${openFaq === index ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openFaq === index && (
                    <div className="border-t border-gray-100 px-5 pb-5 pt-0 text-gray-600 leading-relaxed">
                      <p className="pt-4">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white">
        <div className="container px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/25 mb-6">
              <Calendar className="h-4 w-4" aria-hidden />
              Din uge venter
            </div>
            <h2 className="text-3xl font-extrabold md:text-4xl">
              Start din vægttabsplan ud fra ugens tilbud - gratis
            </h2>
            <p className="mt-5 text-lg text-emerald-50 leading-relaxed">
              Nem at følge. Spar på indkøbet. Effektivt mod dit mål.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/lav-din-plan"
                onClick={() => trackEvent('start_guidet_plan', { cta_location: 'final_cta' })}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-10 py-4 text-lg font-bold text-emerald-800 shadow-xl transition hover:bg-emerald-50"
              >
                Lav min vægttabsplan
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/opskriftsoversigt"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/80 px-10 py-4 text-lg font-semibold text-white transition hover:bg-white/10"
              >
                Se opskrifter først
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
