const citeColors = {
  purple: 'text-purple-700',
  emerald: 'text-emerald-700',
  teal: 'text-teal-700',
  amber: 'text-amber-700',
  blue: 'text-blue-700',
} as const

export type CiteColor = keyof typeof citeColors

/** Superscript kildehenvisning med link til #kilde-n i bunden af siden */
export function Cite({ n, color = 'purple' }: { n: number; color?: CiteColor }) {
  return (
    <sup className={`text-[0.65em] font-semibold ml-0.5 align-super ${citeColors[color]}`}>
      <a href={`#kilde-${n}`} className="hover:underline underline-offset-2">
        {n}
      </a>
    </sup>
  )
}
