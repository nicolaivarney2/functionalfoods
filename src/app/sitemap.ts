import { MetadataRoute } from 'next'
import { sampleRecipes } from '@/lib/sample-data'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://functionalfoods.dk'
  
  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/opskriftsoversigt`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
  ]

  // Recipe pages
  const recipePages = sampleRecipes.map((recipe) => ({
    url: `${baseUrl}/opskrift/${recipe.slug}`,
    lastModified: recipe.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...recipePages]
} 