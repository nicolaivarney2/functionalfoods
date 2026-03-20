'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Check,
  Shield,
  Lock,
  Sparkles,
  ShoppingBasket,
  Users,
  Scale,
  Mail,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const PRESETS = [
  { kr: 0, label: '0 kr – kom i gang gratis' },
  { kr: 60, label: '60 kr' },
  { kr: 100, label: '100 kr' },
  { kr: 200, label: '200 kr' },
] as const

function KomIGangInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUp, user, session, loading: authLoading } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [amountKr, setAmountKr] = useState<number>(60)
  const [customAmount, setCustomAmount] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [productUpdatesConsent, setProductUpdatesConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const cancelled = searchParams.get('betaling') === 'annulleret'

  useEffect(() => {
    if (cancelled) {
      setInfo('Betaling blev annulleret. Din konto er stadig oprettet – du kan prøve igen senere under din profil.')
    }
  }, [cancelled])

  const resolvedAmountKr = (): number => {
    if (useCustom) {
      const n = parseInt(customAmount.replace(',', '.').trim(), 10)
      return Number.isFinite(n) ? n : 0
    }
    return amountKr
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    if (!acceptTerms) {
      setError('Du skal acceptere betingelserne for at fortsætte.')
      return
    }
    if (password.length < 8) {
      setError('Adgangskode skal være mindst 8 tegn.')
      return
    }

    const payKr = resolvedAmountKr()
    if (useCustom && (payKr < 0 || payKr > 50_000)) {
      setError('Vælg et beløb mellem 0 og 50.000 kr.')
      return
    }
    if (useCustom && payKr > 0 && payKr < 5) {
      setError('Valgfri støtte under 5 kr kan ikke betales online – vælg 0 kr eller mindst 5 kr.')
      return
    }

    setSubmitting(true)
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_redirect_url')
      }

      const { error: signErr, session: newSession } = await signUp(
        email.trim(),
        password,
        name.trim() || email.trim().split('@')[0]
      )

      if (signErr) {
        setError(signErr.message)
        setSubmitting(false)
        return
      }

      const activeSession = newSession ?? session
      const accessToken = activeSession?.access_token

      if (!accessToken) {
        setInfo(
          'Tjek din email for at bekræfte kontoen. Når du er logget ind, kan du bruge Madbudget og frivilligt støtte os senere.'
        )
        setSubmitting(false)
        return
      }

      const prefRes = await fetch('/api/user/signup-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ productUpdatesConsent }),
      })

      if (!prefRes.ok) {
        const j = await prefRes.json().catch(() => ({}))
        setError(j.error || 'Kunne ikke gemme dine valg. Prøv igen under profil.')
        setSubmitting(false)
        return
      }

      if (payKr > 0) {
        const payRes = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ amountKr: payKr }),
        })
        const payJson = await payRes.json().catch(() => ({}))
        if (!payRes.ok || !payJson.url) {
          setError(
            payJson.error ||
              'Kunne ikke starte betaling. Du er oprettet – gå til Madbudget og prøv evt. senere fra din profil.'
          )
          setSubmitting(false)
          return
        }
        window.location.href = payJson.url
        return
      }

      router.push('/overblik?ny=1')
    } catch {
      setError('Noget gik galt. Prøv igen om lidt.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-sm">Indlæser…</p>
      </div>
    )
  }

  if (user) {
    return (
      <div className="bg-slate-50 min-h-screen py-16 px-4">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Du er allerede logget ind</h1>
          <p className="text-slate-600 text-sm mb-6">
            Gå til Madbudget eller dagligvarer, eller besøg din profil.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/overblik"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-3 text-sm font-medium hover:bg-emerald-700"
            >
              Dit overblik
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/madbudget"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Åbn Madbudget
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-gradient-to-b from-emerald-900 to-emerald-800 text-white">
        <div className="container mx-auto px-4 py-14 max-w-3xl text-center">
          <p className="text-emerald-200 text-sm font-medium tracking-wide uppercase mb-3">
            Functional Foods · Madbudget
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
            Personlige madplaner – bygget omkring <span className="text-amber-300">rigtige tilbud</span> i
            dagligvarebutikkerne
          </h1>
          <p className="text-emerald-100 text-lg max-w-2xl mx-auto">
            Særligt stærkt til vægttab: ugeplaner der matcher din familie, smag og kalorier – og som tager
            udgangspunkt i det, der faktisk er på tilbud hos Netto, REMA, Bilka m.fl.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Det får du</h2>
            <ul className="space-y-4">
              {[
                {
                  icon: Sparkles,
                  title: 'Madbudget med ét klik',
                  text: 'Ugeplan laves ud fra familieindstillinger, alder, vægt og energibehov – plus det I kan lide at spise.',
                },
                {
                  icon: ShoppingBasket,
                  title: 'Tilbuds-drevne planer',
                  text: 'Systemet kobler på aktuelle tilbud, så du ikke betaler for dyr “madplan-magi”, der ignorerer butikkernes priser.',
                },
                {
                  icon: Scale,
                  title: 'Vægttab i fokus',
                  text: 'Struktur og kalorier, der understøtter et realistisk forbrug – stadig med plads til hverdagsfamilien.',
                },
                {
                  icon: Users,
                  title: 'Hele husstanden',
                  text: 'Indstil antal voksne og børn, allergier og butikker – én plan, I kan følge sammen.',
                },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{title}</h3>
                    <p className="text-slate-600 text-sm mt-0.5">{text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Shield className="text-emerald-600" size={18} />
                Tryghed – ikke “quick fix”-scam
              </h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex gap-2">
                  <Check className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                  Betaling kører gennem <strong className="text-slate-800">Stripe</strong> – vi ser ikke dit kortnummer.
                </li>
                <li className="flex gap-2">
                  <Check className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                  De første <strong className="text-slate-800">120 dage</strong>: “betal det du kan”. De fleste har valgt omkring{' '}
                  <strong className="text-slate-800">60 kr</strong> – du bestemmer helt selv, også <strong>0 kr</strong>.
                </li>
                <li className="flex gap-2">
                  <Mail className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                  E-mail om <strong className="text-slate-800">opdateringer til produktet</strong> kun hvis du krydser af –
                  ingen reklamer.
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Opret konto</h2>
            <p className="text-sm text-slate-500 mb-6">Kun det nødvendige – typisk under ét minut.</p>

            {info && (
              <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm px-4 py-3">
                {info}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fornavn (valgfrit)</label>
                <input
                  type="text"
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="fx Anna"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="dig@email.dk"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adgangskode</label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Mindst 8 tegn"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-800 mb-3">Frivillig støtte (første 120 dage)</p>
                <p className="text-xs text-slate-500 mb-3">
                  Gennemsnit blandt dem der har støttet: ca. <strong>60 kr</strong>. Vælg 0 kr hvis du vil prøve først –
                  helt ok.
                </p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map(({ kr, label }) => (
                    <button
                      key={kr}
                      type="button"
                      onClick={() => {
                        setUseCustom(false)
                        setAmountKr(kr)
                      }}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                        !useCustom && amountKr === kr
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setUseCustom(true)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                      useCustom
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    Andet beløb
                  </button>
                </div>
                {useCustom && (
                  <div className="mt-3">
                    <label className="block text-xs text-slate-600 mb-1">Beløb i kr (0 eller min. 5)</label>
                    <input
                      type="number"
                      min={0}
                      max={50000}
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="fx 75"
                    />
                  </div>
                )}
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-600">
                  Jeg accepterer{' '}
                  <Link href="/indstillinger" className="text-emerald-700 underline hover:text-emerald-800">
                    betingelser og brug af konto
                  </Link>{' '}
                  (krævet).
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productUpdatesConsent}
                  onChange={(e) => setProductUpdatesConsent(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-600">
                  Ja tak – send mig e-mail når der er <strong>vigtige opdateringer til Madbudget og værktøjerne</strong>.
                  Ingen reklamer, kun produktnyt du kan framelde når som helst.
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-semibold py-3.5 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                <Lock size={18} />
                {submitting ? 'Arbejder…' : resolvedAmountKr() > 0 ? 'Opret og gå til sikker betaling' : 'Opret og gå til Madbudget'}
              </button>
            </form>

            <p className="text-xs text-slate-500 text-center mt-4">
              Har du allerede en konto? Brug <strong>Log ind</strong> øverst på siden.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function KomIGangPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-sm">
          Indlæser…
        </div>
      }
    >
      <KomIGangInner />
    </Suspense>
  )
}
