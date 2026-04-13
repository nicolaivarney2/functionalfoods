'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckIcon } from '@heroicons/react/24/solid'
import { XMarkIcon } from '@heroicons/react/24/outline'

const bullets = [
  'Ud fra data om dig og dit liv',
  'Personligt udregnet ud fra dine tal',
  'Uden ingredienser du ikke kan lide',
  '40–50 siders teori om den vægttabsform du har valgt',
  'Fuld indkøbsliste for ugen',
  'Alle opskrifter trykt i bogen',
]

const closeIconButtonClass =
  'inline-flex items-center justify-center rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800'

const tilbageButtonClass =
  'rounded-xl border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-50'

export default function VaegttabsbogPromoModal() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const goBack = () => {
    router.back()
  }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/wizard/vaegttabsbog-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setStatus('error')
        setErrorMessage(typeof data.error === 'string' ? data.error : 'Kunne ikke tilmelde. Prøv igen.')
        return
      }
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMessage('Netværksfejl. Prøv igen.')
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-4 backdrop-blur-md sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      role="presentation"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vaegttabsbog-modal-title"
        className="relative max-h-[min(90vh,720px)] w-full max-w-lg overflow-hidden rounded-2xl border border-[#1B365D]/15 bg-white shadow-2xl pointer-events-auto"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      >
        <div className="flex max-h-[min(90vh,720px)] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-[#1B365D]/5 to-[#87A96B]/10 px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1B365D]/80">
                Nyhed fra FunctionalFoods
              </p>
              <h2
                id="vaegttabsbog-modal-title"
                className="mt-1 text-lg font-bold leading-snug text-gray-900 sm:text-xl"
              >
                Personlig{' '}
                <span className="rounded bg-[#1B365D] px-1.5 py-0.5 text-xs text-white uppercase tracking-wider sm:text-sm">
                  trykt
                </span>{' '}
                6-ugers vægttabsbog
              </h2>
            </div>
            <button
              type="button"
              onClick={goBack}
              className={closeIconButtonClass}
              aria-label="Tilbage"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-sm leading-relaxed text-gray-700">
              I denne guide samler du allerede data til din plan. Her kan du også melde interesse i at få det samme
              som en fysisk bog — <strong className="text-gray-900">bogen er endnu ikke klar til tryk</strong>, og
              selve guiden på siden er midlertidigt lukket. Skriv dig op, så vi kan kontakte dig, når bestilling åbner.
            </p>

            <h3 className="mt-5 text-base font-bold text-gray-900">Bogen er trykt, og er personlig</h3>
            <ul className="mt-3 space-y-2.5">
              {bullets.map((line) => (
                <li key={line} className="flex gap-2.5 text-sm text-gray-700">
                  <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#87A96B]" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <p className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-sm font-medium text-amber-950">
              <span className="font-bold">Pris:</span> 600–950 kr. sendt med GLS til din adresse (vejledende —
              endelig pris annonceres ved lancering).
            </p>

            {status === 'success' ? (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900">
                <p className="font-semibold">Tak — du er på listen.</p>
                <p className="mt-1 text-emerald-800/95">
                  Vi skriver til dig på e-mail, når den trykte bog kan bestilles.
                </p>
                <button
                  type="button"
                  onClick={goBack}
                  className="mt-4 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#1B365D] to-[#87A96B] py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
                >
                  Tilbage
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-3">
                <label htmlFor="vaegttabsbog-interest-email" className="block text-sm font-medium text-gray-800">
                  Skriv dig op — interesse uden forpligtelse
                </label>
                <input
                  id="vaegttabsbog-interest-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@email.dk"
                  disabled={status === 'loading'}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#1B365D] focus:outline-none focus:ring-2 focus:ring-[#1B365D]/25 disabled:bg-gray-50"
                />
                {status === 'error' && (
                  <p className="text-sm text-red-600" role="alert">
                    {errorMessage}
                  </p>
                )}
                <p className="text-xs leading-relaxed text-gray-500">
                  Du får besked når det er klar. Du kan til enhver tid afmelde dig linket i mailen.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#1B365D] to-[#87A96B] py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-60"
                  >
                    {status === 'loading' ? 'Sender…' : 'Skriv mig på listen'}
                  </button>
                  <button
                    type="button"
                    onClick={goBack}
                    className={`${tilbageButtonClass} sm:shrink-0`}
                  >
                    Tilbage
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
