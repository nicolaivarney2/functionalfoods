import { Recipe } from '@/types/recipe'

export function generateRecipeStructuredData(recipe: Recipe) {
  const structuredData: any = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    "name": recipe.title,
    "description": recipe.description,
    "image": recipe.imageUrl,
    "author": {
      "@type": "Person",
      "name": recipe.author
    },
    "datePublished": recipe.publishedAt ? new Date(recipe.publishedAt).toISOString() : new Date().toISOString(),
    "dateModified": recipe.updatedAt ? new Date(recipe.updatedAt).toISOString() : new Date().toISOString(),
    "prepTime": recipe.prepTimeISO,
    "cookTime": recipe.cookTimeISO,
    "totalTime": recipe.totalTimeISO,
    "recipeYield": `${recipe.servings} servings`,
    "recipeCategory": recipe.mainCategory,
    "recipeCuisine": "Danish",
    "suitableForDiet": recipe.dietaryCategories ? recipe.dietaryCategories.map(category => {
      // Map dietary categories to schema.org diet types
      const dietMap: { [key: string]: string } = {
        'Keto': 'https://schema.org/LowCarbDiet',
        'GLP-1 kost': 'https://schema.org/LowCarbDiet',
        'GLP-1': 'https://schema.org/LowCarbDiet',
        'Vegetarian': 'https://schema.org/VegetarianDiet',
        'Vegan': 'https://schema.org/VeganDiet',
        'Gluten-Free': 'https://schema.org/GlutenFreeDiet',
        'Dairy-Free': 'https://schema.org/GlutenFreeDiet', // No specific dairy-free in schema.org
        'SENSE': 'https://schema.org/GlutenFreeDiet' // Danish balanced diet
      }
      return dietMap[category] || 'https://schema.org/GlutenFreeDiet'
    }) : [],
    "keywords": recipe.keywords ? 
      (Array.isArray(recipe.keywords) ? recipe.keywords.join(', ') : recipe.keywords) : '',
    "recipeIngredient": recipe.ingredients ? recipe.ingredients.map(ingredient => 
      `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`
    ) : [],
    "recipeInstructions": recipe.instructions ? recipe.instructions.map(step => ({
      "@type": "HowToStep",
      "position": step.stepNumber,
      "text": step.instruction
    })) : [],
    "nutrition": {
      "@type": "NutritionInformation",
      "calories": `${recipe.calories} calories`,
      "proteinContent": `${recipe.protein}g`,
      "carbohydrateContent": `${recipe.carbs}g`,
      "fatContent": `${recipe.fat}g`,
      "fiberContent": `${recipe.fiber}g`
    },
    "recipeServings": recipe.servings,
    "recipeDifficulty": recipe.difficulty,
    "cookingMethod": "stovetop", // You can make this dynamic based on recipe type
    "additionalProperty": recipe.dietaryCategories ? recipe.dietaryCategories.map(category => ({
      "@type": "PropertyValue",
      "name": "dietary_category",
      "value": category
    })) : []
  }

  // Add rating if available
  if (recipe.rating && recipe.reviewCount) {
    structuredData.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": recipe.rating,
      "reviewCount": recipe.reviewCount,
      "bestRating": 5,
      "worstRating": 1
    }
  }

  return structuredData
}

export function generateBreadcrumbStructuredData(recipe: Recipe) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://functionalfoods.dk"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Opskrifter",
        "item": "https://functionalfoods.dk/opskriftsoversigt"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": recipe.mainCategory || "Opskrifter",
        "item": `https://functionalfoods.dk/opskriftsoversigt?kategori=${(recipe.mainCategory || "opskrifter").toLowerCase()}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": recipe.title,
        "item": `https://functionalfoods.dk/opskrift/${recipe.slug}`
      }
    ]
  }
}

export function generateRecipeCollectionStructuredData(category: string, recipes: Recipe[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${category} opskrifter`,
    "description": `Alle ${category.toLowerCase()} opskrifter fra Functional Foods`,
    "url": `https://functionalfoods.dk/opskrifter/${category.toLowerCase()}`,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": recipes.length,
      "itemListElement": recipes.map((recipe, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Recipe",
          "name": recipe.title,
          "url": `https://functionalfoods.dk/opskrift/${recipe.slug}`,
          "image": recipe.imageUrl,
          "description": recipe.shortDescription,
          "recipeCategory": recipe.mainCategory,
          "recipeCuisine": "Danish",
          "suitableForDiet": (recipe.dietaryCategories && Array.isArray(recipe.dietaryCategories)) ? recipe.dietaryCategories.map(cat => {
            const dietMap: { [key: string]: string } = {
              'Keto': 'https://schema.org/LowCarbDiet',
              'GLP-1 kost': 'https://schema.org/LowCarbDiet',
              'GLP-1': 'https://schema.org/LowCarbDiet',
              'Vegetarian': 'https://schema.org/VegetarianDiet',
              'Vegan': 'https://schema.org/VeganDiet',
              'Gluten-Free': 'https://schema.org/GlutenFreeDiet',
              'SENSE': 'https://schema.org/GlutenFreeDiet'
            }
            return dietMap[cat] || 'https://schema.org/GlutenFreeDiet'
          }) : []
        }
      }))
    },
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "dietary_category",
        "value": category
      },
      {
        "@type": "PropertyValue",
        "name": "recipe_count",
        "value": recipes.length
      }
    ]
  }
}

export function generateWebsiteStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Functional Foods",
    "description": "Sunde opskrifter til vægttab og en sund livsstil. Keto, GLP-1 kost og sunde opskrifter til hverdagen.",
    "url": "https://functionalfoods.dk",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://functionalfoods.dk/opskriftsoversigt?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Functional Foods",
      "url": "https://functionalfoods.dk",
      "logo": {
        "@type": "ImageObject",
        "url": "https://functionalfoods.dk/logo.png"
      }
    }
  }
} 