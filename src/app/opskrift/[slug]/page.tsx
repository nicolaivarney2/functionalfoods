import { Metadata } from 'next'
import RecipeDetail from '@/components/RecipeDetail'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  
  return {
    title: `Opskrift - ${resolvedParams.slug}`,
    description: 'Se denne lækre opskrift',
  }
}

export default async function RecipePage({ params }: PageProps) {
  const resolvedParams = await params
  
  return <RecipeDetail slug={resolvedParams.slug} />
} 