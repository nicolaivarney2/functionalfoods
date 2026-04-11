'use client'

import NicheDietRecipesClient from '@/components/NicheDietRecipesClient'

export default function AntiInflammatoryRecipesPage() {
  return (
    <NicheDietRecipesClient
      dietQueryParam="antiinflammatorisk"
      backHref="/anti-inflammatory"
      backLabel="Tilbage til Antiinflammatorisk"
      badgeLabel="Antiinflammatoriske opskrifter"
      heroTitle="Antiinflammatoriske opskrifter –"
      heroDescription="Opskrifter med fokus på antiinflammatoriske ingredienser – alle beregnet på næring."
      heroFootnote="Alle beregnet på næring • Antiinflammatorisk fokus"
      searchPlaceholder="Søg i antiinflammatoriske opskrifter..."
      loadingMessage="Indlæser antiinflammatoriske opskrifter..."
      emptyEmoji="🌿"
      emptyTitleNoFilters="Ingen antiinflammatoriske opskrifter endnu"
      emptyBodyNoFilters="Vi arbejder på at tilføje flere opskrifter. Kom snart tilbage!"
      theme="emeraldGreen"
      ctaTitleLine1="Vil du lære mere om antiinflammatorisk kost?"
      ctaTitleLine2="Læs mere på landingssiden"
      ctaBody="Se hvordan kost kan understøtte kroppen med næringsrige, skånsomme valg."
      ctaPrimaryHref="/anti-inflammatory"
      ctaPrimaryLabel="Til Antiinflammatorisk"
    />
  )
}
