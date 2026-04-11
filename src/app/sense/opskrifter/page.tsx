'use client'

import NicheDietRecipesClient from '@/components/NicheDietRecipesClient'

export default function SenseRecipesPage() {
  return (
    <NicheDietRecipesClient
      dietQueryParam="sense"
      backHref="/sense"
      backLabel="Tilbage til Sense"
      badgeLabel="Sense opskrifter"
      heroTitle="Sense opskrifter –"
      heroDescription="Sunde retter i tråd med danske kostråd – alle beregnet på næring og hverdagsvenlige."
      heroFootnote="Alle beregnet på næring • Sense-principper"
      searchPlaceholder="Søg i Sense opskrifter..."
      loadingMessage="Indlæser Sense opskrifter..."
      emptyEmoji="✋"
      emptyTitleNoFilters="Ingen Sense opskrifter endnu"
      emptyBodyNoFilters="Vi arbejder på at tilføje flere opskrifter. Kom snart tilbage!"
      theme="greenTeal"
      ctaTitleLine1="Vil du lære mere om Sense?"
      ctaTitleLine2="Læs mere på landingssiden"
      ctaBody="Se hvordan Sense kan hjælpe dig med balanceret kost og gode vaner i hverdagen."
      ctaPrimaryHref="/sense"
      ctaPrimaryLabel="Til Sense"
    />
  )
}
