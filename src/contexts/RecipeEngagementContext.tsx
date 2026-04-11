'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type RecipeEngagementContextValue = {
  commentCount: number
  setCommentCount: (n: number) => void
}

const RecipeEngagementContext = createContext<RecipeEngagementContextValue | null>(null)

export function RecipeEngagementProvider({ children }: { children: ReactNode }) {
  const [commentCount, setCommentCount] = useState(0)
  return (
    <RecipeEngagementContext.Provider value={{ commentCount, setCommentCount }}>
      {children}
    </RecipeEngagementContext.Provider>
  )
}

export function useRecipeEngagementOptional() {
  return useContext(RecipeEngagementContext)
}
