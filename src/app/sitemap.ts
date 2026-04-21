import { MetadataRoute } from 'next'
import { databaseService } from '@/lib/database-service'

export const revalidate = 60 * 30 // refresh sitemap every 30 minutes

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  // Recipe pages (real published recipes from DB)
  const publishedRecipes = await databaseService.getRecipes()
  const recipePages = publishedRecipes
    .filter((recipe) => Boolean(recipe.slug))
    .map((recipe) => ({
    url: `${baseUrl}/opskrift/${recipe.slug}`,
    lastModified: recipe.updatedAt || new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...recipePages]
} 