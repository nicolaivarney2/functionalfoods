'use client'

import NicheDietRecipesClient from '@/components/NicheDietRecipesClient'

export default function KetoRecipesPage() {
  return (
    <NicheDietRecipesClient
      dietQueryParam="keto"
      backHref="/keto"
      backLabel="Tilbage til keto"
      badgeLabel="Keto opskrifter"
      badgeIcon="target"
      heroTitle="Keto opskrifter –"
      heroDescription="Udforsk vores samling af ketogene opskrifter – alle beregnet på næring og perfekte til at holde dig i ketose."
      heroFootnote="Alle beregnet på næring • Under 20g kulhydrater"
      searchPlaceholder="Søg i keto opskrifter..."
      loadingMessage="Indlæser keto opskrifter..."
      emptyEmoji="🥑"
      emptyTitleNoFilters="Ingen keto opskrifter endnu"
      emptyBodyNoFilters="Vi arbejder på at tilføje flere keto opskrifter. Kom snart tilbage!"
      theme="purpleGreen"
      ctaTitleLine1="Vil du lære mere om keto?"
      ctaTitleLine2="Læs teorien her"
      ctaBody="Lær hvordan ketogen diæt hjælper med vægttab og hvordan du kommer i ketose."
      ctaPrimaryHref="/keto/vaegttab"
      ctaPrimaryLabel="Lær om keto vægttab"
    />
  )
}
