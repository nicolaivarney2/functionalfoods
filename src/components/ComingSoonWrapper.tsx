'use client'

import { useState, useEffect } from 'react'
import { useAdminCheck } from '@/hooks/useAdminCheck'
import ComingSoonModal from './ComingSoonModal'

interface ComingSoonWrapperProps {
  children: React.ReactNode
  modalTitle: string
  modalContent: React.ReactNode
}

export default function ComingSoonWrapper({ children, modalTitle, modalContent }: ComingSoonWrapperProps) {
  const { isAdmin, checking } = useAdminCheck()
  const [showModal, setShowModal] = useState(false)
  const [shouldBlur, setShouldBlur] = useState(false)

  useEffect(() => {
    // Only blur and show modal if not admin
    if (!checking && !isAdmin) {
      setShouldBlur(true)
    } else {
      setShouldBlur(false)
    }
  }, [isAdmin, checking])

  const handleClick = () => {
    if (shouldBlur) {
      setShowModal(true)
    }
  }

  return (
    <>
      <div 
        className={`relative transition-all duration-300 ${shouldBlur ? 'blur-sm pointer-events-none' : ''}`}
        onClick={handleClick}
      >
        {children}
      </div>
      
      {shouldBlur && (
        <div 
          className="absolute inset-0 bg-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer z-40"
          onClick={() => setShowModal(true)}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">🚧 Under udvikling</h3>
            <div className="text-gray-700 text-lg space-y-4">
              <p className="font-semibold text-blue-600">
                {modalTitle.includes('Dagligvarer') 
                  ? 'Funktion: AI madplaner ud fra tilbudsavis i ALLE dagligvarebutikker!'
                  : 'Funktion: Automatisk madplan ud fra dine præferencer, mål og ugens tilbud!'
                }
              </p>
              <p>
                Klik for at læse mere om denne kommende funktion
              </p>
            </div>
          </div>
        </div>
      )}

      <ComingSoonModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalTitle}
      >
        {modalContent}
      </ComingSoonModal>
    </>
  )
}
