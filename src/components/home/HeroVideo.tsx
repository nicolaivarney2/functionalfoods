'use client'

import Image from 'next/image'
import { Play } from 'lucide-react'

function youtubeIdFromUrl(raw: string): string | null {
  const url = raw.trim()
  if (!url) return null
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').slice(0, 11)
      return id.length === 11 ? id : null
    }
    const v = u.searchParams.get('v')
    if (v && v.length === 11) return v
    const embed = u.pathname.match(/\/embed\/([\w-]{11})/)
    if (embed) return embed[1]
    return null
  } catch {
    return null
  }
}

const POSTER =
  'https://najaxycfjgultwdwffhv.supabase.co/storage/v1/object/public/recipe-images/jordbaer-header.webp'

/**
 * Venstre kolonne på forsiden: MP4-URL eller YouTube-link via NEXT_PUBLIC_HOME_HERO_VIDEO_URL.
 * Uden URL: pæn placeholder med plads til senere video.
 */
export default function HeroVideo() {
  const url = (process.env.NEXT_PUBLIC_HOME_HERO_VIDEO_URL || '').trim()
  const yt = url ? youtubeIdFromUrl(url) : null

  if (yt) {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15 aspect-video bg-black">
        <iframe
          title="Functional Foods — introduktion"
          src={`https://www.youtube-nocookie.com/embed/${yt}?rel=0`}
          className="absolute inset-0 h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    )
  }

  if (url) {
    return (
      <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/15 aspect-video bg-black">
        <video
          className="h-full w-full object-cover"
          controls
          playsInline
          preload="metadata"
          poster={POSTER}
        >
          <source src={url} />
        </video>
      </div>
    )
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 to-slate-950 shadow-2xl ring-1 ring-white/15">
      <Image
        src={POSTER}
        alt=""
        fill
        className="object-cover object-center opacity-35"
        sizes="(min-width: 1024px) 50vw, 100vw"
        priority
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/25">
          <Play className="h-8 w-8 translate-x-0.5 opacity-95" fill="currentColor" aria-hidden />
        </div>
        <p className="text-sm font-semibold">Video på vej</p>
        <p className="mt-2 max-w-xs text-xs text-white/75 leading-relaxed">
          Sæt <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">NEXT_PUBLIC_HOME_HERO_VIDEO_URL</code> i{' '}
          <code className="rounded bg-black/30 px-1 py-0.5 text-[11px]">.env.local</code> til en MP4 eller et YouTube-link.
        </p>
      </div>
    </div>
  )
}
