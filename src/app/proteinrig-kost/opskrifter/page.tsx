'use client'

import NicheDietRecipesClient from '@/components/NicheDietRecipesClient'

export default function ProteinrigKostRecipesPage() {
  return (
    <NicheDietRecipesClient
      dietQueryParam="proteinrig"
      backHref="/proteinrig-kost"
      backLabel="Tilbage til Proteinrig kost"
      badgeLabel="Proteinrig kost opskrifter"
      heroTitle="Proteinrige opskrifter –"
      heroDescription="Udforsk opskrifter med højt proteinindhold – alle beregnet på næring og gode til mæthed og muskler."
      heroFootnote="Alle beregnet på næring • Fokus på protein"
      searchPlaceholder="Søg i proteinrige opskrifter..."
      loadingMessage="Indlæser proteinrige opskrifter..."
      emptyEmoji="💪"
      emptyTitleNoFilters="Ingen proteinrige opskrifter endnu"
      emptyBodyNoFilters="Vi arbejder på at tilføje flere opskrifter. Kom snart tilbage!"
      theme="purpleGreen"
      ctaTitleLine1="Vil du lære mere om proteinrig kost?"
      ctaTitleLine2="Læs mere på landingssiden"
      ctaBody="Se principper, tips og hvordan du kan få mere protein i hverdagen uden at det bliver kompliceret."
      ctaPrimaryHref="/proteinrig-kost"
      ctaPrimaryLabel="Til Proteinrig kost"
    />
  )
}
