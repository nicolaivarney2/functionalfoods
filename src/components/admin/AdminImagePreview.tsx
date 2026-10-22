'use client'

import { useEffect } from 'react'

export default function AdminImagePreview({
  src,
  alt,
  onClose,
}: {
  src: string
  alt: string
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Billede i stort format"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow"
      >
        Luk
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-md object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  )
}
