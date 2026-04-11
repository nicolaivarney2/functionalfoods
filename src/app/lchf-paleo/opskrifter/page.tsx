'use client'

import NicheDietRecipesClient from '@/components/NicheDietRecipesClient'

export default function LchfPaleoRecipesPage() {
  return (
    <NicheDietRecipesClient
      dietQueryParam="lchf"
      backHref="/lchf-paleo"
      backLabel="Tilbage til LCHF/Paleo"
      badgeLabel="LCHF/Paleo opskrifter"
      heroTitle="LCHF/Paleo opskrifter –"
      heroDescription="Lavkulhydrat og paleo-venlige retter – alle beregnet på næring og gode fedtstoffer."
      heroFootnote="Alle beregnet på næring • LCHF/Paleo"
      searchPlaceholder="Søg i LCHF/Paleo opskrifter..."
      loadingMessage="Indlæser LCHF/Paleo opskrifter..."
      emptyEmoji="🥩"
      emptyTitleNoFilters="Ingen LCHF/Paleo opskrifter endnu"
      emptyBodyNoFilters="Vi arbejder på at tilføje flere opskrifter. Kom snart tilbage!"
      theme="orangeGreen"
      ctaTitleLine1="Vil du lære mere om LCHF og Paleo?"
      ctaTitleLine2="Læs mere på landingssiden"
      ctaBody="Se forskelle, principper og hvordan du kan bruge opskrifterne i praksis."
      ctaPrimaryHref="/lchf-paleo"
      ctaPrimaryLabel="Til LCHF/Paleo"
    />
  )
}
