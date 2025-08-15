import { Metadata } from 'next'
import CategoryRecipes from '@/components/CategoryRecipes'

interface PageProps {
  params: Promise<{ category: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  
  return {
    title: `Opskrifter - ${resolvedParams.category}`,
    description: `Se alle opskrifter i kategorien ${resolvedParams.category}`,
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const resolvedParams = await params
  
  return <CategoryRecipes category={resolvedParams.category} />
} 