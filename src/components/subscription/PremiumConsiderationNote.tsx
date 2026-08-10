import {
  PREMIUM_CONSIDERATION_CITATION,
  PREMIUM_CONSIDERATION_NOTE,
  PREMIUM_CONSIDERATION_SOURCE_URL,
} from '@/lib/subscription-tiers'

type Props = {
  className?: string
  variant?: 'default' | 'dark'
}

export default function PremiumConsiderationNote({ className = '', variant = 'default' }: Props) {
  const isDark = variant === 'dark'

  return (
    <div
      className={`rounded-xl px-4 py-3 ring-1 ${isDark ? 'bg-amber-400/15 text-emerald-50/95 ring-amber-300/25' : 'bg-amber-50 text-neutral-800 ring-amber-200/80'} ${className}`}
    >
      <p className={`text-sm leading-relaxed ${isDark ? '' : 'font-medium'}`}>{PREMIUM_CONSIDERATION_NOTE}</p>
      <p className={`mt-2 text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-emerald-100/70' : 'text-neutral-500'}`}>
        Kilde
      </p>
      <a
        href={PREMIUM_CONSIDERATION_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-0.5 block text-xs leading-relaxed underline underline-offset-2 ${isDark ? 'text-amber-200 hover:text-amber-100' : 'text-emerald-800 hover:text-emerald-950'}`}
      >
        {PREMIUM_CONSIDERATION_CITATION}
      </a>
    </div>
  )
}
