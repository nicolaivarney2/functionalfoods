import Link from 'next/link'
import { databaseService } from '@/lib/database-service'
import { RecipePrintView, type PrintRecipe } from '@/components/print/RecipePrintView'
import type { Ingredient, IngredientGroup, InstructionGroup, Recipe, RecipeStep } from '@/types/recipe'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ autoprint?: string }>
}

function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function toPrintRecipe(recipe: Recipe): PrintRecipe {
  return {
    title: recipe.title,
    slug: recipe.slug,
    description: recipe.description || '',
    shortDescription: recipe.shortDescription || '',
    preparationTime: Number(recipe.preparationTime) || 0,
    cookingTime: Number(recipe.cookingTime) || 0,
    servings: Number(recipe.servings) > 0 ? Number(recipe.servings) : 4,
    difficulty: recipe.difficulty || '',
    imageUrl: recipe.imageUrl || '',
    imageAlt: recipe.imageAlt || recipe.title,
    personalTips: recipe.personalTips || '',
    calories: Number(recipe.calories) || 0,
    protein: Number(recipe.protein) || 0,
    carbs: Number(recipe.carbs) || 0,
    fat: Number(recipe.fat) || 0,
    fiber: Number(recipe.fiber) || 0,
    ingredients: asList<Ingredient>(recipe.ingredients),
    ingredientGroups: asList<IngredientGroup>(recipe.ingredientGroups),
    instructions: asList<RecipeStep>(recipe.instructions),
    instructionGroups: asList<InstructionGroup>(recipe.instructionGroups),
  }
}

export default async function RecipePrintPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { autoprint } = await searchParams
  const recipe = await databaseService.getPublishedRecipeBySlug(slug)

  if (!recipe) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <h1 className="text-2xl font-bold">Opskrift ikke fundet</h1>
        <p className="mt-2 text-gray-600">Opskriften kan ikke printes, fordi den ikke er udgivet.</p>
        <Link href="/opskriftsoversigt" className="mt-6 inline-block text-emerald-800 underline">
          Tilbage til opskrifter
        </Link>
      </div>
    )
  }

  return <RecipePrintView recipe={toPrintRecipe(recipe)} autoprint={autoprint === '1'} />
}
