import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/referral-shared'

type AppStoreBadgesProps = {
  /** Kort linje under badges. Hold den tynd på forsiden. */
  showCaption?: boolean
  align?: 'start' | 'center'
  /** `dark` = hvid tekst (hero/footer). */
  tone?: 'light' | 'dark'
  className?: string
}

export default function AppStoreBadges({
  showCaption = false,
  align = 'start',
  tone = 'light',
  className = '',
}: AppStoreBadgesProps) {
  const alignCls = align === 'center' ? 'items-center text-center' : 'items-start text-left'
  const captionCls = tone === 'dark' ? 'text-white/70' : 'text-slate-500'
  const linkCls =
    tone === 'dark'
      ? 'text-white decoration-white/40 hover:decoration-white'
      : 'text-slate-700 decoration-slate-400 hover:decoration-slate-700'

  return (
    <div className={`flex flex-col gap-2 ${alignCls} ${className}`}>
      {showCaption ? (
        <p className={`text-xs leading-snug ${captionCls}`}>
          <a href={APP_STORE_URL} className={`font-medium underline underline-offset-2 ${linkCls}`}>
            Hent appen til iPhone
          </a>
          {'. '}
          <a href={PLAY_STORE_URL} className={`font-medium underline underline-offset-2 ${linkCls}`}>
            Hent appen til Android
          </a>
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <a href={APP_STORE_URL} className="inline-flex h-11 shrink-0 items-center" aria-label="Hent i App Store">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/store-badges/app-store-da.svg"
            alt="Hent i App Store"
            className="h-11 w-auto"
          />
        </a>
        <a href={PLAY_STORE_URL} className="inline-flex h-11 shrink-0 items-center" aria-label="Hent den på Google Play">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/store-badges/google-play-da.png"
            alt="Hent den på Google Play"
            className="h-[58px] w-auto"
          />
        </a>
      </div>
    </div>
  )
}
