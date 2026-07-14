const citeColors = {
  purple: 'text-purple-700',
  emerald: 'text-emerald-700',
  teal: 'text-teal-700',
  amber: 'text-amber-700',
  blue: 'text-blue-700',
} as const

export type CiteColor = keyof typeof citeColors

/** Superscript kildehenvisning med link til #kilde-n (lokal side) eller angivet URL. */
export function Cite({
  n,
  color = 'purple',
  href,
}: {
  n: number
  color?: CiteColor
  /** Standard: #kilde-n på samme side. Brug fx /metode/kalorier-og-vaegttab#kilde-n i app-flow. */
  href?: string
}) {
  const target = href ?? `#kilde-${n}`
  return (
    <sup className={`text-[0.65em] font-semibold ml-0.5 align-super ${citeColors[color]}`}>
      <a href={target} className="hover:underline underline-offset-2">
        {n}
      </a>
    </sup>
  )
}
