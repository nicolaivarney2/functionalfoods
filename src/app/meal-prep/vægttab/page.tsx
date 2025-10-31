import Link from 'next/link'
import { ArrowLeft, Scale, Lightbulb } from 'lucide-react'

export default function MealPrepWeightLossTheoryPage() {
  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-purple-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-green-500/5"></div>
        </div>
        <div className="container relative text-center">
          <Link href="/meal-prep" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til Meal Prep
          </Link>
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            Meal Prep & Vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Meal Prep for <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-green-600">vægttab</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Lær hvordan meal prep kan hjælpe dig med at tabe dig gennem planlagt madlavning og portionskontrol.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 text-gray-900 text-center">
            Sådan virker meal prep for vægttab
          </h2>
          <div className="space-y-8 text-lg text-gray-700 leading-relaxed">
            <p>
              Meal prep handler om at forberede måltider på forhånd for at sikre sunde valg og portionskontrol. Ved at planlægge og forberede måltider på forhånd kan du opnå vægttab uden at føle dig begrænset.
            </p>
            <p>
              <strong>Nøgleprincipper:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li><strong>Planlægning:</strong> Planlæg måltider på forhånd for at sikre sunde valg og portionskontrol.</li>
              <li><strong>Forberedelse:</strong> Forbered måltider på forhånd for at spare tid og sikre sunde valg.</li>
              <li><strong>Portionskontrol:</strong> Forbered portioner på forhånd for at undgå overspisning.</li>
              <li><strong>Fleksibilitet:</strong> Tilpas meal prep til din livsstil og præferencer.</li>
            </ul>
            <p>
              Meal prep handler om at skabe sunde vaner gennem planlægning og forberedelse. Det er en bæredygtig tilgang til vægttab, der kan opretholdes på lang sigt.
            </p>
            <div className="bg-purple-50 p-6 rounded-xl flex items-start gap-4">
              <Lightbulb className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
              <p className="text-purple-800 font-medium">
                <strong>Tip:</strong> Start med at forberede 2-3 måltider på forhånd og byg gradvist op til en hel uge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA to Meal Prep Recipes */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
            Find dine næste <span className="text-purple-200">meal prep opskrifter</span>
          </h2>
          <p className="text-xl text-purple-100 mb-12 max-w-3xl mx-auto">
            Udforsk vores store samling af lækre og nemme meal prep opskrifter, der understøtter dit vægttab.
          </p>
          <Link
            href="/meal-prep/opskrifter"
            className="group bg-white text-purple-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 justify-center mx-auto max-w-fit"
          >
            Se meal prep opskrifter
            <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
          </Link>
        </div>
      </section>
    </main>
  )
}
