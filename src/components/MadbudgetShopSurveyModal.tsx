'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export type ShopSurveyStoreOption = { id: number; name: string }

type ShopReason = 'cheapest' | 'closest' | 'prefer_anyway' | 'other'

const REASON_OPTIONS: { value: ShopReason; label: string }[] = [
  { value: 'cheapest', label: 'Den var billigst' },
  { value: 'closest', label: 'Den var tættest på' },
  { value: 'prefer_anyway', label: 'Jeg foretrækker den butik uanset' },
  { value: 'other', label: 'Andet' },
]

type Props = {
  open: boolean
  onClose: () => void
  storeOptions: ShopSurveyStoreOption[]
  accessToken: string
  onSubmitted: () => void
}

export default function MadbudgetShopSurveyModal({
  open,
  onClose,
  storeOptions,
  accessToken,
  onSubmitted,
}: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [storeId, setStoreId] = useState<number | null>(null)
  const [reason, setReason] = useState<ShopReason | null>(null)
  const [otherText, setOtherText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setStep(0)
    setStoreId(null)
    setReason(null)
    setOtherText('')
    setError(null)
    setSubmitting(false)
  }, [open])

  const reset = () => {
    setStep(0)
    setStoreId(null)
    setReason(null)
    setOtherText('')
    setError(null)
    setSubmitting(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const selectedStoreName = storeOptions.find((s) => s.id === storeId)?.name ?? ''

  const runSubmit = useCallback(
    async (r: ShopReason, otherTxt: string, sid: number, sName: string) => {
      if (r === 'other' && !otherTxt.trim()) {
        setError('Skriv venligst en kort forklaring.')
        return
      }
      setSubmitting(true)
      setError(null)
      try {
        const res = await fetch('/api/madbudget/shop-survey', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            storeId: sid,
            storeName: sName,
            shopReason: r,
            otherReason: r === 'other' ? otherTxt.trim() : null,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const parts = [typeof data.error === 'string' ? data.error : null, data.details].filter(Boolean)
          setError(parts.length ? parts.join(' — ') : 'Noget gik galt.')
          setSubmitting(false)
          return
        }
        setStep(2)
        onSubmitted()
      } catch {
        setError('Netværksfejl — prøv igen.')
      } finally {
        setSubmitting(false)
      }
    },
    [accessToken, onSubmitted]
  )

  const pickStore = (id: number) => {
    setStoreId(id)
    setStep(1)
  }

  const pickReason = (r: ShopReason) => {
    setReason(r)
    if (r === 'other') return
    if (storeId == null) return
    const name = storeOptions.find((s) => s.id === storeId)?.name ?? ''
    void runSubmit(r, '', storeId, name)
  }

  const submitOther = () => {
    if (storeId == null) return
    const name = storeOptions.find((s) => s.id === storeId)?.name ?? ''
    void runSubmit('other', otherText, storeId, name)
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shop-survey-title"
          className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        >
          <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white rounded-t-2xl">
            <h2 id="shop-survey-title" className="text-lg font-semibold text-gray-900 pr-8">
              Hjælper vi dig spare penge?
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 -mr-2"
              aria-label="Luk"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-5 py-5 space-y-5">
            {step === 0 && (
              <>
                <p className="text-gray-700 text-sm leading-relaxed">
                  Vi vil gerne vide, om vores tilbud og madplan faktisk påvirker, hvor du handler. Det tager under et
                  minut — vi bruger kun svarene til at forbedre oplevelsen (fx butikker og tilbudsdata).
                </p>
                <p className="text-sm font-medium text-gray-900">Hvor handlede du ind i sidste uge?</p>
                <div className="grid grid-cols-1 gap-2">
                  {storeOptions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickStore(s.id)}
                      className="text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-green-500 hover:bg-green-50 text-sm font-medium text-gray-800 transition-colors"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <p className="text-sm text-gray-600">
                  Du valgte <span className="font-semibold text-gray-900">{selectedStoreName}</span>.
                </p>
                <p className="text-sm font-medium text-gray-900">Hvorfor handlede du der?</p>
                <div className="space-y-2">
                  {REASON_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={submitting}
                      onClick={() => pickReason(opt.value)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50 ${
                        reason === opt.value
                          ? 'border-green-600 bg-green-50 text-green-900'
                          : 'border-gray-200 hover:border-gray-300 text-gray-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {reason === 'other' && (
                  <>
                    <textarea
                      value={otherText}
                      onChange={(e) => setOtherText(e.target.value)}
                      placeholder="Kort forklaring…"
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setReason(null)
                          setOtherText('')
                          setError(null)
                          setStep(0)
                        }}
                        className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-800 font-medium text-sm hover:bg-gray-50"
                      >
                        Tilbage
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => submitOther()}
                        className="flex-1 py-3 rounded-xl bg-green-600 text-white font-semibold text-sm disabled:opacity-40 hover:bg-green-700"
                      >
                        {submitting ? 'Gemmer…' : 'Send svar'}
                      </button>
                    </div>
                  </>
                )}
                {reason !== 'other' && error && <p className="text-sm text-red-600">{error}</p>}
                {reason !== 'other' && submitting && (
                  <p className="text-sm text-gray-500 text-center">Gemmer…</p>
                )}
                {reason !== 'other' && !submitting && (
                  <button
                    type="button"
                    onClick={() => {
                      setReason(null)
                      setStep(0)
                    }}
                    className="w-full py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    ← Skift butik
                  </button>
                )}
              </>
            )}

            {step === 2 && (
              <div className="text-center py-4 space-y-3">
                <p className="text-lg font-semibold text-gray-900">Tak for din hjælp!</p>
                <p className="text-sm text-gray-600">
                  Dine svar bruger vi til at forbedre tilbud, butikker og madplan — så de bedre matcher virkelige
                  valg.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800"
                >
                  Luk
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
