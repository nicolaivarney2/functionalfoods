'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Lock, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import LoginModal from '@/components/LoginModal'

type AuthRequiredFeatureGateProps = {
  children: ReactNode
  featureTitle: string
  /** Kort forklaring under titlen (ren tekst eller JSX) */
  description?: ReactNode
}

export default function AuthRequiredFeatureGate({
  children,
  featureTitle,
  description,
}: AuthRequiredFeatureGateProps) {
  const { user, loading } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-600">Indlæser…</p>
      </div>
    )
  }

  if (user) {
    return <>{children}</>
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600"
              aria-hidden
            >
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Log ind for at bruge {featureTitle}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              {description ?? (
                <>
                  Funktionen kan ikke bruges uden en bruger — opret en gratis konto, så vi kan gemme dine
                  indstillinger og data til dig.
                </>
              )}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
              >
                Log ind
              </button>
              <Link
                href="/kom-i-gang"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50"
              >
                <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
                Opret bruger gratis
              </Link>
            </div>
          </div>
        </div>
      </div>
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  )
}
