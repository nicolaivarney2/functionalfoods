'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackUserBehavior, getUserProfile, UserBehavior } from '@/lib/analytics'

interface AnalyticsContextType {
  trackEvent: (event: string, data?: any) => void
  trackPageView: (page: string) => void
  trackRecipeView: (recipeId: string, recipeTitle: string) => void
  trackSearch: (query: string, results: number) => void
  trackCategoryView: (category: string) => void
  userProfile: UserBehavior
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined)

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserBehavior>({
    source: 'direct',
    interests: [],
    timeOnSite: 0,
    pagesViewed: [],
    recipesViewed: [],
    categoriesViewed: []
  })

  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Load user profile on mount
    const profile = getUserProfile()
    setUserProfile(profile)

    // Track page view
    trackPageView(pathname)

    // Track time on site
    const interval = setInterval(() => {
      setUserProfile(prev => ({
        ...prev,
        timeOnSite: prev.timeOnSite + 1
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [pathname])

  const trackEvent = (event: string, data?: any) => {
    console.log('Analytics Event:', event, data)
    
    // Track to your analytics service (Google Analytics, etc.)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event, data)
    }
    
    // Update local profile
    setUserProfile(prev => ({
      ...prev,
      interests: Array.from(new Set([...(prev.interests || []), event]))
    }))
  }

  const trackPageView = (page: string) => {
    trackUserBehavior({
      pagesViewed: [page]
    })
    
    setUserProfile(prev => ({
      ...prev,
      pagesViewed: Array.from(new Set([...(prev.pagesViewed || []), page]))
    }))
  }

  const trackRecipeView = (recipeId: string, recipeTitle: string) => {
    trackEvent('recipe_view', {
      recipe_id: recipeId,
      recipe_title: recipeTitle,
      page: pathname
    })
    
    setUserProfile(prev => ({
      ...prev,
      recipesViewed: Array.from(new Set([...(prev.recipesViewed || []), recipeId]))
    }))
  }

  const trackSearch = (query: string, results: number) => {
    trackEvent('search', {
      query,
      results,
      page: pathname
    })
  }

  const trackCategoryView = (category: string) => {
    trackEvent('category_view', {
      category,
      page: pathname
    })
    
    setUserProfile(prev => ({
      ...prev,
      categoriesViewed: Array.from(new Set([...(prev.categoriesViewed || []), category]))
    }))
  }

  const value: AnalyticsContextType = {
    trackEvent,
    trackPageView,
    trackRecipeView,
    trackSearch,
    trackCategoryView,
    userProfile
  }

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  )
} 