'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, X } from 'lucide-react'

export type GuestPageTourStep = {
  selector: string
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'auto'
  onEnter?: () => void
  onLeave?: () => void
}

type Props = {
  open: boolean
  steps: GuestPageTourStep[]
  onClose: () => void
  onDone?: () => void
}

const SPOTLIGHT_PADDING = 10
const TOOLTIP_OFFSET = 18
const TOOLTIP_WIDTH = 420

export default function GuestPageTour({ open, steps, onClose, onDone }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const [viewport, setViewport] = useState({ w: 0, h: 0 })

  useEffect(() => {
    setMounted(true)
    setViewport({ w: window.innerWidth, h: window.innerHeight })
  }, [])

  const currentStep = steps[stepIndex]

  useEffect(() => {
    if (!open) return
    currentStep?.onEnter?.()
    return () => {
      currentStep?.onLeave?.()
    }
  }, [open, stepIndex, currentStep])

  useLayoutEffect(() => {
    if (!open || !currentStep) return
    let cancelled = false
    let rafId = 0

    const findVisible = (): HTMLElement | null => {
      const all = document.querySelectorAll<HTMLElement>(currentStep.selector)
      for (const el of all) {
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) return el
      }
      return all[0] ?? null
    }

    const updateRect = () => {
      if (cancelled) return
      const el = findVisible()
      if (!el) {
        setRect(null)
        return
      }
      setRect(el.getBoundingClientRect())
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }

    const initialEl = findVisible()
    if (initialEl) {
      try {
        initialEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } catch {
        initialEl.scrollIntoView()
      }
    }

    updateRect()
    const timer = window.setTimeout(updateRect, 450)
    const loop = () => {
      updateRect()
      rafId = window.requestAnimationFrame(loop)
    }
    rafId = window.requestAnimationFrame(loop)

    const stopLoop = window.setTimeout(() => {
      window.cancelAnimationFrame(rafId)
    }, 600)

    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.clearTimeout(stopLoop)
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [open, stepIndex, currentStep])

  if (!open || !mounted || !currentStep) return null

  const hasRect = rect !== null && rect.width > 0 && rect.height > 0

  const spotlightStyle = hasRect
    ? {
        top: Math.max(0, rect!.top - SPOTLIGHT_PADDING),
        left: Math.max(0, rect!.left - SPOTLIGHT_PADDING),
        width: rect!.width + SPOTLIGHT_PADDING * 2,
        height: rect!.height + SPOTLIGHT_PADDING * 2,
      }
    : { top: viewport.h / 2 - 40, left: viewport.w / 2 - 40, width: 80, height: 80 }

  const placement = currentStep.placement || 'auto'
  let tooltipPos: React.CSSProperties = {}
  if (hasRect) {
    const spaceBelow = viewport.h - rect!.bottom
    const spaceAbove = rect!.top
    const useBottom =
      placement === 'bottom' ||
      (placement === 'auto' && (spaceBelow >= 240 || spaceBelow >= spaceAbove))
    if (useBottom) {
      tooltipPos.top = Math.min(
        viewport.h - 280,
        rect!.bottom + SPOTLIGHT_PADDING + TOOLTIP_OFFSET,
      )
    } else {
      tooltipPos.bottom =
        viewport.h - rect!.top + SPOTLIGHT_PADDING + TOOLTIP_OFFSET
    }
    const desiredLeft = rect!.left + rect!.width / 2 - TOOLTIP_WIDTH / 2
    const clamped = Math.max(12, Math.min(viewport.w - TOOLTIP_WIDTH - 12, desiredLeft))
    tooltipPos.left = clamped
  } else {
    tooltipPos.top = viewport.h / 2 - 100
    tooltipPos.left = Math.max(12, viewport.w / 2 - TOOLTIP_WIDTH / 2)
  }

  const handleNext = () => {
    if (stepIndex + 1 >= steps.length) {
      onDone?.()
      onClose()
      setStepIndex(0)
    } else {
      setStepIndex((i) => i + 1)
    }
  }

  const handlePrev = () => {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  const handleSkip = () => {
    onClose()
    setStepIndex(0)
  }

  const isLast = stepIndex + 1 >= steps.length

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <motion.div
        animate={{
          top: spotlightStyle.top,
          left: spotlightStyle.left,
          width: spotlightStyle.width,
          height: spotlightStyle.height,
        }}
        transition={{ type: 'spring', stiffness: 240, damping: 28 }}
        className="absolute pointer-events-none"
        style={{
          borderRadius: 16,
          boxShadow:
            '0 0 0 9999px rgba(15, 23, 42, 0.65), 0 0 0 2px rgba(34, 197, 94, 0.95), 0 8px 32px -4px rgba(15, 23, 42, 0.45)',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={handleSkip}
        aria-label="Luk rundvisning"
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          className="absolute pointer-events-auto"
          style={{ width: `min(${TOOLTIP_WIDTH}px, calc(100vw - 24px))`, ...tooltipPos }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-semibold w-6 h-6">
                  {stepIndex + 1}
                </span>
                <h3 className="text-base font-semibold text-gray-900 leading-tight">
                  {currentStep.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-700 transition-colors -mr-1"
                aria-label="Luk rundvisning"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pb-4">
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {currentStep.description}
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-gray-400">
                  {stepIndex + 1} / {steps.length}
                </span>
                <div className="flex items-center gap-2">
                  {stepIndex > 0 && (
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5"
                    >
                      Tilbage
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5"
                  >
                    Spring over
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    {isLast ? 'Færdig' : 'Næste'}
                    {!isLast && <ChevronRight size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  )
}
