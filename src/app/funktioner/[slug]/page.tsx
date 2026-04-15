import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
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
  FUNKTION_SLUGS,
  type FunktionIconName,
  type FunktionImage,
  type FunktionLanding,
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

type Props = { params: Promise<{ slug: string }> }

function publicSrc(path: string) {
  return path.startsWith('/') ? path : `/${path}`
}

function partitionImages(images: FunktionImage[] | undefined) {
  if (!images?.length) {
    return { hero: null, mid: null, afterBullets: [] as FunktionImage[] }
  }
  const resolved = images.map((img, i) => ({
    ...img,
    placement:
      img.placement ??
      (i === 0 ? ('hero' as const) : ('betweenHeroAndBullets' as const)),
  }))
  return {
    hero: resolved.find((x) => x.placement === 'hero') ?? null,
    mid: resolved.find((x) => x.placement === 'betweenHeroAndBullets') ?? null,
    afterBullets: resolved.filter((x) => x.placement === 'afterBullets'),
  }
}

function figureWrapClass(img: FunktionImage, zone: 'hero' | 'mid' | 'afterBullets') {
  if (img.compact) {
    return 'mx-auto w-full max-w-[200px] sm:max-w-[240px] md:max-w-[280px]'
  }
  if (zone === 'afterBullets' || zone === 'mid') {
    return 'mx-auto w-full max-w-3xl'
  }
  return 'w-full'
}

export function generateStaticParams() {
  return FUNKTION_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = FUNKTIONER[slug as FunktionSlug]
  if (!page) return { title: 'Funktion | Functional Foods' }
  const { hero } = partitionImages(page.images)
  const firstImg = hero ?? page.images?.[0]
  const ogImages = firstImg
    ? [{ url: publicSrc(firstImg.src), alt: firstImg.alt }]
    : undefined
  return {
    title: page.title,
    description: page.description,
    openGraph: {
      title: page.shortTitle,
      description: page.description,
      ...(ogImages ? { images: ogImages } : {}),
    },
  }
}

export default async function FunktionLandingPage({ params }: Props) {
  const { slug } = await params
  const data: FunktionLanding | undefined = FUNKTIONER[slug as FunktionSlug]
  if (!data) notFound()

  const Icon = ICON_BY_NAME[data.iconName]
  const { hero: heroImage, mid: midImage, afterBullets } = partitionImages(data.images)
  const hasHeroImage = Boolean(heroImage)

  return (
    <div className="bg-white text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-800 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div
          className={`container mx-auto px-4 py-14 sm:py-20 relative ${hasHeroImage ? 'max-w-6xl' : 'max-w-4xl'}`}
        >
          <div
            className={
              hasHeroImage
                ? 'grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 lg:items-start'
                : undefined
            }
          >
            <div className="min-w-0">
              <p className="text-emerald-300/90 text-sm font-medium tracking-wide uppercase mb-3">
                {data.heroEyebrow}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                <div className="shrink-0 rounded-2xl bg-white/10 border border-white/15 p-4 backdrop-blur-sm">
                  <Icon className="w-12 h-12 text-amber-200" strokeWidth={1.5} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                    {data.heroTitle}
                  </h1>
                  <div className="mt-5 space-y-4 text-lg sm:text-xl text-emerald-100/95 leading-relaxed max-w-2xl">
                    {(data.heroLeadParagraphs?.length
                      ? data.heroLeadParagraphs
                      : [data.heroLead].filter(Boolean)
                    ).map((p, i) => (
                      <p key={`hero-${i}`}>{p}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {heroImage ? (
              <div className={figureWrapClass(heroImage, 'hero')}>
                <figure className="relative overflow-hidden rounded-2xl border border-white/20 bg-black/20 shadow-2xl ring-1 ring-white/10 lg:mt-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicSrc(heroImage.src)}
                    alt={heroImage.alt}
                    className="w-full h-auto object-cover"
                    loading="eager"
                    decoding="async"
                  />
                </figure>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {midImage ? (
        <section className="bg-slate-100/90 border-y border-slate-200/80">
          <div className="container mx-auto px-4 py-10 sm:py-12 max-w-4xl">
            <div className={figureWrapClass(midImage, 'mid')}>
              <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicSrc(midImage.src)}
                  alt={midImage.alt}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-b border-slate-100 bg-slate-50/80">
        <div className="container mx-auto px-4 py-12 sm:py-16 max-w-3xl">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Hvad du får</h2>
          <ul className="mt-6 space-y-4">
            {data.bullets.map((b) => (
              <li key={b.title} className="flex gap-3">
                <CheckCircle2
                  className="w-6 h-6 shrink-0 text-emerald-600 mt-0.5"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <div>
                  <p className="font-medium text-slate-900">{b.title}</p>
                  <p className="mt-1 text-slate-600 leading-relaxed">{b.text}</p>
                </div>
              </li>
            ))}
          </ul>

          {afterBullets.length > 0 ? (
            <div className="mt-10 pt-10 border-t border-slate-200/90 space-y-8">
              {afterBullets.map((img) => (
                <div key={img.src} className={figureWrapClass(img, 'afterBullets')}>
                  <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={publicSrc(img.src)}
                      alt={img.alt}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 sm:py-16 max-w-3xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">Hvorfor det hjælper dig</h2>
          <p className="mt-4 text-slate-600 leading-relaxed text-lg">{data.howItHelps}</p>
          <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <Link
              href={data.ctaHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              {data.ctaLabel}
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            {data.secondaryCta ? (
              <Link
                href={data.secondaryCta.href}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-5 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100/80 transition-colors"
              >
                {data.secondaryCta.label}
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            ) : null}
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50 transition-colors"
            >
              Til forsiden
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
