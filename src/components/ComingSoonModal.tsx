'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'
import { useAdminCheck } from '@/hooks/useAdminCheck'

interface ComingSoonModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function ComingSoonModal({ isOpen, onClose, title, children }: ComingSoonModalProps) {
  const { isAdmin, checking } = useAdminCheck()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // Only show modal if not admin and modal is open
    if (!checking && !isAdmin && isOpen) {
      setShowModal(true)
    } else {
      setShowModal(false)
    }
  }, [isAdmin, checking, isOpen])

  if (!showModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-8 transform transition-all">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">{title}</h2>
          <div className="text-gray-700 text-lg leading-relaxed space-y-4">
            {children}
          </div>
          <div className="mt-8">
            <Link 
              href="/opskriftsoversigt"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Gå til opskrifter
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
