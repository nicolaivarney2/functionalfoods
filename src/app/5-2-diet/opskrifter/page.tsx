'use client'

import NicheDietRecipesClient from '@/components/NicheDietRecipesClient'

export default function FiveTwoDietRecipesPage() {
  return (
    <NicheDietRecipesClient
      dietQueryParam="5:2"
      backHref="/5-2-diet"
      backLabel="Tilbage til 5:2 Diæt"
      badgeLabel="5:2 opskrifter"
      heroTitle="5:2 diæt opskrifter –"
      heroDescription="Opskrifter med fokus på 5:2 og intermittent faste – alle beregnet på næring."
      heroFootnote="Alle beregnet på næring • 5:2 og faste"
      searchPlaceholder="Søg i 5:2 opskrifter..."
      loadingMessage="Indlæser 5:2 opskrifter..."
      emptyEmoji="⏰"
      emptyTitleNoFilters="Ingen 5:2 opskrifter endnu"
      emptyBodyNoFilters="Vi arbejder på at tilføje flere opskrifter. Kom snart tilbage!"
      theme="amberOrange"
      ctaTitleLine1="Vil du lære mere om 5:2?"
      ctaTitleLine2="Læs mere på landingssiden"
      ctaBody="Se hvordan 5:2 kan strukturere din uge og hvordan opskrifterne passer ind."
      ctaPrimaryHref="/5-2-diet"
      ctaPrimaryLabel="Til 5:2 Diæt"
    />
  )
}
