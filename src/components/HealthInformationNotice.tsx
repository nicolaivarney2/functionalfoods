import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { HEALTH_DISCLAIMER, HEALTH_METHODOLOGY_PATH } from '@/lib/health-sources'

type Variant = 'light' | 'dark' | 'inline'

type Props = {
  variant?: Variant
  className?: string
  /** Vis link til fuld kildeliste (anbefalet i app-flow). */
  showSourcesLink?: boolean
}

const variantStyles: Record<Variant, { box: string; text: string; link: string }> = {
  light: {
    box: 'rounded-xl border border-gray-200 bg-gray-50 px-4 py-3',
    text: 'text-xs text-gray-600 leading-relaxed',
    link: 'text-green-700 hover:text-green-800 font-medium underline underline-offset-2',
  },
  dark: {
    box: 'rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15',
    text: 'text-xs text-emerald-100/80 leading-relaxed',
    link: 'text-amber-200 hover:text-amber-100 font-medium underline underline-offset-2',
  },
  inline: {
    box: '',
    text: 'text-xs text-gray-500 leading-relaxed',
    link: 'text-green-600 hover:text-green-700 font-medium underline underline-offset-2',
  },
}

export default function HealthInformationNotice({
  variant = 'light',
  className = '',
  showSourcesLink = true,
}: Props) {
  const styles = variantStyles[variant]

  return (
    <div className={`${styles.box} ${className}`.trim()}>
      <p className={styles.text}>{HEALTH_DISCLAIMER}</p>
      {showSourcesLink ? (
        <p className={`mt-2 ${styles.text}`}>
          <Link href={HEALTH_METHODOLOGY_PATH} className={`inline-flex items-center gap-1 ${styles.link}`}>
            Se kilder og beregningsmetode
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          </Link>
        </p>
      ) : null}
    </div>
  )
}
