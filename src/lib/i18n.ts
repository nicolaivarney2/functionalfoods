export const supportedLocales = {
  da: {
    name: 'Dansk',
    flag: '🇩🇰',
    default: true
  },
  en: {
    name: 'English',
    flag: '🇺🇸'
  },
  de: {
    name: 'Deutsch',
    flag: '🇩🇪'
  },
  se: {
    name: 'Svenska',
    flag: '🇸🇪'
  }
}

export const translations = {
  da: {
    recipes: 'opskrifter',
    keto: 'keto',
    sense: 'sense',
    weightLoss: 'vægttab',
    healthyLifestyle: 'sund livsstil'
  },
  en: {
    recipes: 'recipes',
    keto: 'keto',
    sense: 'sense',
    weightLoss: 'weight loss',
    healthyLifestyle: 'healthy lifestyle'
  },
  de: {
    recipes: 'rezepte',
    keto: 'keto',
    sense: 'sense',
    weightLoss: 'gewichtsverlust',
    healthyLifestyle: 'gesunder lebensstil'
  },
  se: {
    recipes: 'recept',
    keto: 'keto',
    sense: 'sense',
    weightLoss: 'viktminskning',
    healthyLifestyle: 'hälsosam livsstil'
  }
}

export function getTranslation(locale: string, key: string): string {
  return translations[locale as keyof typeof translations]?.[key as keyof typeof translations.da] || key
}

export function getLocalizedPath(locale: string, path: string): string {
  if (locale === 'da') return path
  return `/${locale}${path}`
} 