import Link from 'next/link'
import { ArrowRight, ClipboardList, Heart, Sparkles } from 'lucide-react'

export type RecipeGridSlot<T extends { id: string }> =
  | { type: 'recipe'; recipe: T; listIndex: number }
  | { type: 'cta' }

/** Efter de første `threshold` opskrifter indsættes ét CTA-slot (kun hvis der er flere opskrifter end threshold). */
export function buildRecipeSlotsWithMidCta<T extends { id: string }>(
  recipes: T[],
  threshold = 30
): RecipeGridSlot<T>[] {
  const out: RecipeGridSlot<T>[] = []
  const insertCta = recipes.length > threshold
  recipes.forEach((recipe, listIndex) => {
    out.push({ type: 'recipe', recipe, listIndex })
    if (insertCta && listIndex === threshold - 1) {
      out.push({ type: 'cta' })
    }
  })
  return out
}

/**
 * Fuld bredde i opskrifts-grid (2/3/4 kolonner) — indsættes efter de første ~30 kort.
 */
export default function RecipeSignupMidGridCta() {
  return (
    <div className="col-span-2 lg:col-span-3 xl:col-span-4 my-2">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white shadow-lg shadow-emerald-900/20">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-100/90">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Gratis at starte
            </p>
            <h2 className="mt-2 text-xl font-bold leading-snug sm:text-2xl">
              Opret en bruger — gem favoritopskrifter og lav personlige madplaner
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-50/95">
              Saml de opskrifter du bruger igen og igen, og kobl dem til Madbudget, når du vil have ugeplaner og indkøb, der
              passer til dig.
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-emerald-50/90">
              <li className="inline-flex items-center gap-1.5">
                <Heart className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                Favoritter
              </li>
              <li className="inline-flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                Madplaner
              </li>
            </ul>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
            <Link
              href="/kom-i-gang"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-800 shadow-md transition hover:bg-emerald-50"
            >
              Opret dig gratis
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/funktioner"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Se funktioner
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
