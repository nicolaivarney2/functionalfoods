import Link from 'next/link'
import { ArrowLeft, Scale, Lightbulb } from 'lucide-react'

export default function FlexitarianWeightLossTheoryPage() {
  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-teal-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-green-500/5"></div>
        </div>
        <div className="container relative text-center">
          <Link href="/flexitarian" className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til Fleksitarisk
          </Link>
          <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            Fleksitarisk & Vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Fleksitarisk for <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-green-600">vægttab</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Lær hvordan fleksitarisk kost hjælper dig med at tabe dig gennem plantebaseret mad og fleksibilitet.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 text-gray-900 text-center">
            Sådan virker fleksitarisk kost for vægttab
          </h2>
          <div className="space-y-8 text-lg text-gray-700 leading-relaxed">
            <p>
              Fleksitarisk kost fokuserer på planter med mulighed for lidt kød. Denne tilgang giver dig de sundhedsmæssige fordele ved plantebaseret kost, samtidig med at du beholder fleksibiliteten til at spise kød når du har lyst.
            </p>
            <p>
              <strong>Nøgleprincipper:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li><strong>Plantebaseret fokus:</strong> 80% planter og 20% kød for optimal sundhed og bæredygtighed.</li>
              <li><strong>Fleksibilitet:</strong> Mulighed for at spise kød når du har lyst, uden at føle dig begrænset.</li>
              <li><strong>Bæredygtighed:</strong> Mindre kødforbrug er bedre for miljøet og din sundhed.</li>
              <li><strong>Næringsrige planter:</strong> Fokus på grøntsager, bælgfrugter, nødder og frø.</li>
            </ul>
            <p>
              Fleksitarisk kost handler om at finde den perfekte balance mellem sundhed og fleksibilitet. Det er en bæredygtig tilgang til vægttab, der kan opretholdes på lang sigt.
            </p>
            <div className="bg-teal-50 p-6 rounded-xl flex items-start gap-4">
              <Lightbulb className="w-6 h-6 text-teal-600 flex-shrink-0 mt-1" />
              <p className="text-teal-800 font-medium">
                <strong>Tip:</strong> Start med at spise plantebaseret 5 dage om ugen og kød 2 dage om ugen for at finde din balance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA to Flexitarian Recipes */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
            Find dine næste <span className="text-teal-200">fleksitariske opskrifter</span>
          </h2>
          <p className="text-xl text-teal-100 mb-12 max-w-3xl mx-auto">
            Udforsk vores store samling af lækre og nemme fleksitariske opskrifter, der understøtter dit vægttab.
          </p>
          <Link
            href="/flexitarian/opskrifter"
            className="group bg-white text-teal-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 justify-center mx-auto max-w-fit"
          >
            Se fleksitariske opskrifter
            <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
          </Link>
        </div>
      </section>
    </main>
  )
}
