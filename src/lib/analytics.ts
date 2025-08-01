export interface UserBehavior {
  source: 'ketoliv.dk' | 'direct' | 'google' | 'social'
  interests: string[]
  timeOnSite: number
  pagesViewed: string[]
  recipesViewed: string[]
  categoriesViewed: string[]
}

export function trackUserBehavior(data: Partial<UserBehavior>) {
  // Send to your analytics service
  console.log('User behavior tracked:', data)
  
  // Store in localStorage for personalization
  const existing = JSON.parse(localStorage.getItem('userBehavior') || '{}')
  const updated = { ...existing, ...data }
  localStorage.setItem('userBehavior', JSON.stringify(updated))
}

export function getUserProfile(): UserBehavior {
  const stored = localStorage.getItem('userBehavior')
  return stored ? JSON.parse(stored) : {
    source: 'direct',
    interests: [],
    timeOnSite: 0,
    pagesViewed: [],
    recipesViewed: [],
    categoriesViewed: []
  }
}

export function trackRecipeView(recipeSlug: string) {
  const profile = getUserProfile()
  if (!profile.recipesViewed.includes(recipeSlug)) {
    profile.recipesViewed.push(recipeSlug)
    trackUserBehavior(profile)
  }
}

export function trackCategoryView(category: string) {
  const profile = getUserProfile()
  if (!profile.categoriesViewed.includes(category)) {
    profile.categoriesViewed.push(category)
    trackUserBehavior(profile)
  }
}

export function getPersonalizedRecommendations(): string[] {
  const profile = getUserProfile()
  
  // Analyze user interests based on behavior
  const interests = new Set<string>()
  
  // Add interests from viewed categories
  profile.categoriesViewed.forEach(category => {
    interests.add(category.toLowerCase())
  })
  
  // Add interests from viewed recipes
  profile.recipesViewed.forEach(recipeSlug => {
    // You could analyze recipe data to extract interests
    if (recipeSlug.includes('keto')) interests.add('keto')
    if (recipeSlug.includes('sense')) interests.add('sense')
  })
  
  return Array.from(interests)
} 