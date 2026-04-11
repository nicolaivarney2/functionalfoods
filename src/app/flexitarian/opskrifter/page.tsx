'use client'

import NicheDietRecipesClient from '@/components/NicheDietRecipesClient'

export default function FlexitarianRecipesPage() {
  return (
    <NicheDietRecipesClient
      dietQueryParam="fleksitarisk"
      backHref="/flexitarian"
      backLabel="Tilbage til Fleksitarisk"
      badgeLabel="Fleksitariske opskrifter"
      heroTitle="Fleksitariske opskrifter –"
      heroDescription="Plantefokus med plads til kød i ny og næ – alle beregnet på næring og hverdagsvenlige."
      heroFootnote="Alle beregnet på næring • Plantefokus"
      searchPlaceholder="Søg i fleksitariske opskrifter..."
      loadingMessage="Indlæser fleksitariske opskrifter..."
      emptyEmoji="🥬"
      emptyTitleNoFilters="Ingen fleksitariske opskrifter endnu"
      emptyBodyNoFilters="Vi arbejder på at tilføje flere opskrifter. Kom snart tilbage!"
      theme="tealGreen"
      ctaTitleLine1="Vil du lære mere om fleksitarisk kost?"
      ctaTitleLine2="Læs mere på landingssiden"
      ctaBody="Se hvordan du kan spise mere plantebaseret uden at give afkald på smag og variation."
      ctaPrimaryHref="/flexitarian"
      ctaPrimaryLabel="Til Fleksitarisk"
    />
  )
}
