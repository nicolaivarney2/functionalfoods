'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact'
        }
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const turnstileElRef = useRef<HTMLDivElement | null>(null)
  const turnstileWidgetIdRef = useRef<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')

  const { signIn, signUp } = useAuth()
  const router = useRouter()

  // Kun ved oprettelse: bot-beskyttelse er vigtigst her; ved login undgår vi friktion (samme mønster som mange sites).
  useEffect(() => {
    if (!isOpen || !turnstileSiteKey || !isSignUp) {
      if (turnstileWidgetIdRef.current && typeof window !== 'undefined' && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current)
        } catch {
          /* ignore */
        }
        turnstileWidgetIdRef.current = null
      }
      setCaptchaToken('')
      return
    }

    let cancelled = false
    const timeouts: number[] = []

    const removeWidget = () => {
      if (turnstileWidgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current)
        } catch {
          /* ignore */
        }
        turnstileWidgetIdRef.current = null
      }
      setCaptchaToken('')
    }

    const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(fn, ms)
      timeouts.push(id)
    }

    const renderTurnstile = () => {
      if (cancelled || !turnstileElRef.current || !window.turnstile || turnstileWidgetIdRef.current) return
      // Altid compact i modal: "normal" giver ofte meget høj iframe + dårlig scroll på mobil.
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileElRef.current, {
        sitekey: turnstileSiteKey,
        theme: 'light',
        size: 'compact',
        callback: (token: string) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(''),
        'error-callback': () => setCaptchaToken(''),
      })
    }

    const cleanup = () => {
      cancelled = true
      timeouts.forEach((id) => window.clearTimeout(id))
      removeWidget()
    }

    const existing = document.querySelector('script[data-turnstile="true"]')
    if (window.turnstile) {
      renderTurnstile()
      schedule(() => renderTurnstile(), 200)
      return cleanup
    }

    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.turnstile = 'true'
      script.onload = () => {
        if (cancelled) return
        renderTurnstile()
        schedule(() => renderTurnstile(), 300)
      }
      document.head.appendChild(script)
      return cleanup
    }

    existing.addEventListener('load', renderTurnstile, { once: true })
    return () => {
      existing.removeEventListener('load', renderTurnstile)
      cleanup()
    }
  }, [isOpen, turnstileSiteKey, isSignUp])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    if (turnstileSiteKey && isSignUp && !captchaToken) {
      setError('Bekræft venligst, at du ikke er en robot.')
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, name, captchaToken || undefined)
        if (error) {
          setError(error.message)
          if (turnstileWidgetIdRef.current && window.turnstile) {
            window.turnstile.reset(turnstileWidgetIdRef.current)
            setCaptchaToken('')
          }
        } else {
          setSuccess('Tjek din email for at bekræfte din konto! Du vil blive sendt tilbage til denne side efter bekræftelse.')
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
          if (turnstileWidgetIdRef.current && window.turnstile) {
            window.turnstile.reset(turnstileWidgetIdRef.current)
            setCaptchaToken('')
          }
        } else {
          onClose()
          router.refresh()
        }
      }
    } catch (err) {
      setError('Der opstod en fejl. Prøv igen.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div className="flex min-h-full items-center justify-center py-2 sm:py-6">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[min(92dvh,880px)] overflow-y-auto overscroll-contain p-6 relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 id="login-modal-title" className="text-2xl font-bold text-gray-900 mb-2">
            {isSignUp ? 'Opret konto' : 'Log ind'}
          </h2>
          <p className="text-gray-600">
            {isSignUp 
              ? 'Få adgang til alle funktioner og gem dine favoritopskrifter'
              : 'Log ind for at kommentere og gemme opskrifter'
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Navn
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Dit navn"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="din@email.dk"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adgangskode
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Din adgangskode"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {turnstileSiteKey && isSignUp && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <p className="text-xs font-medium text-slate-700 mb-2">Sikkerhedstjek</p>
              <div className="flex justify-center w-full">
                <div ref={turnstileElRef} className="w-full max-w-[300px] min-h-0" />
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 mt-2">
                Vi bruger et sikkerhedstjek ved oprettelse for at undgå bots – ikke ved hvert login.
              </p>
            </div>
          )}

          {/* Error/Success messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Indlæser...' : (isSignUp ? 'Opret konto' : 'Log ind')}
          </button>
        </form>

        {/* Toggle sign up/login */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-600">
            {isSignUp ? 'Har du allerede en konto?' : 'Har du ikke en konto?'}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
                setSuccess('')
                if (turnstileWidgetIdRef.current && window.turnstile) {
                  window.turnstile.reset(turnstileWidgetIdRef.current)
                }
                setCaptchaToken('')
              }}
              className="ml-1 text-green-600 hover:text-green-700 font-medium"
            >
              {isSignUp ? 'Log ind' : 'Opret dig her'}
            </button>
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Få adgang til:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Gem dine favoritopskrifter
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Ubegrænsede personlige madplaner
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Madplaner ud fra tilbud i butikkerne
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Vægt-tracker
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Personlige anbefalinger og hjælp til vægttab
            </li>
          </ul>
        </div>
        </div>
      </div>
    </div>,
    document.body
  )
} 