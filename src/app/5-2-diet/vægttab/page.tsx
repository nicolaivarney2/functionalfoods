import Link from 'next/link'
import { ArrowLeft, Scale, Lightbulb } from 'lucide-react'

export default function FiveTwoDietWeightLossTheoryPage() {
  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-amber-50/30 to-orange-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5"></div>
        </div>
        <div className="container relative text-center">
          <Link href="/5-2-diet" className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til 5:2 Diæt
          </Link>
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            5:2 Diæt & Vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            5:2 Diæt for <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">vægttab</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Lær hvordan 5:2 diæt hjælper dig med at tabe dig gennem intermittent fasting og kaloriebegrænsning.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 text-gray-900 text-center">
            Sådan virker 5:2 diæt for vægttab
          </h2>
          <div className="space-y-8 text-lg text-gray-700 leading-relaxed">
            <p>
              5:2 diæt er en form for intermittent fasting hvor du spiser normalt 5 dage og begrænser kalorier 2 dage. Denne tilgang giver dig fleksibilitet samtidig med at du opnår et kalorieunderskud gennem faste.
            </p>
            <p>
              <strong>Nøgleprincipper:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li><strong>5 normale dage:</strong> Spis normalt 5 dage om ugen uden begrænsninger på kalorier eller madtyper.</li>
              <li><strong>2 faste dage:</strong> Begræns kalorier til 500-600 kalorier 2 dage om ugen (ikke sammenhængende).</li>
              <li><strong>Fleksibilitet:</strong> Vælg selv hvilke 2 dage du vil faste - perfekt til travle livsstile.</li>
              <li><strong>Metabolisme:</strong> Faste kan forbedre insulinfølsomhed og fremme fedtforbrænding.</li>
            </ul>
            <p>
              5:2 diæt handler om at finde en balance mellem normal spisning og faste. Det er en bæredygtig tilgang til vægttab, der kan opretholdes på lang sigt.
            </p>
            <div className="bg-amber-50 p-6 rounded-xl flex items-start gap-4">
              <Lightbulb className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <p className="text-amber-800 font-medium">
                <strong>Tip:</strong> Start med at faste 1 dag om ugen og byg gradvist op til 2 dage for at lade kroppen tilpasse sig.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA to 5:2 Diet Recipes */}
      <section className="py-20 bg-gradient-to-r from-amber-600 to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
            Find dine næste <span className="text-amber-200">5:2 diæt opskrifter</span>
          </h2>
          <p className="text-xl text-amber-100 mb-12 max-w-3xl mx-auto">
            Udforsk vores store samling af lækre og nemme 5:2 diæt opskrifter, der understøtter dit vægttab.
          </p>
          <Link
            href="/5-2-diet/opskrifter"
            className="group bg-white text-amber-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 justify-center mx-auto max-w-fit"
          >
            Se 5:2 diæt opskrifter
            <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
          </Link>
        </div>
      </section>
    </main>
  )
}
