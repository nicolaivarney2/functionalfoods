'use client'

import { useEffect, useState } from 'react'

interface ImagePerformanceProps {
  src: string
  alt: string
  className?: string
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
}

export default function ImagePerformance({ 
  src, 
  alt, 
  className = '', 
  priority = false,
  onLoad,
  onError 
}: ImagePerformanceProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [loadTime, setLoadTime] = useState<number | null>(null)

  useEffect(() => {
    const startTime = performance.now()
    
    const img = new Image()
    img.onload = () => {
      const endTime = performance.now()
      setLoadTime(endTime - startTime)
      setIsLoading(false)
      onLoad?.()
    }
    img.onerror = () => {
      setHasError(true)
      setIsLoading(false)
      onError?.()
    }
    img.src = src
  }, [src, onLoad, onError])

  if (hasError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">Billede ikke tilgængeligt</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        loading={priority ? 'eager' : 'lazy'}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 w-6 h-6" />
        </div>
      )}
      {process.env.NODE_ENV === 'development' && loadTime && (
        <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded">
          {loadTime.toFixed(0)}ms
        </div>
      )}
    </div>
  )
} 