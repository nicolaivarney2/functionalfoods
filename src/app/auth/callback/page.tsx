'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const finish = async () => {
      const supabase = createSupabaseClient()
      const next = searchParams.get('next') || '/madbudget'
      const code = searchParams.get('code')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (exchangeError) {
          setError(exchangeError.message)
          return
        }
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (cancelled) return
        if (!session) {
          setError('Kunne ikke logge ind. Prøv igen.')
          return
        }
      }

      router.replace(next)
    }

    finish()
    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-emerald-950 px-4 text-center text-emerald-50">
        <p className="text-sm text-red-200">{error}</p>
        <Link href="/lav-din-plan" className="mt-4 text-sm font-medium text-amber-200 underline">
          Tilbage til oprettelse
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-emerald-950 px-4 text-emerald-100">
      <Image
        src="/billeder/favicon/ff-logo%20favicon%20white%20logo.jpg.png"
        alt=""
        width={48}
        height={48}
        className="mb-4 rounded-xl opacity-90"
      />
      <p className="text-sm">Logger ind…</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-emerald-950 text-emerald-100">
          <p className="text-sm">Logger ind…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}
