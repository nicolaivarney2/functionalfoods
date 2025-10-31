import Link from 'next/link'
import { ArrowLeft, Scale, Lightbulb } from 'lucide-react'

export default function SenseWeightLossTheoryPage() {
  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-green-50/30 to-teal-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-teal-500/5"></div>
        </div>
        <div className="container relative text-center">
          <Link href="/sense" className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til Sense
          </Link>
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            Sense & Vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Sense for <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-600">vægttab</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Lær hvordan Sense-principperne hjælper dig med at tabe dig gennem enkel portionskontrol og sunde vaner.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 text-gray-900 text-center">
            Sådan virker Sense for vægttab
          </h2>
          <div className="space-y-8 text-lg text-gray-700 leading-relaxed">
            <p>
              Sense-kostprincipperne er en enkel og effektiv måde at tabe sig på, der ikke kræver kalorieoptælling eller komplekse regler. Ved at bruge håndfulde som målestok skaber du naturligt et kalorieunderskud.
            </p>
            <p>
              <strong>Nøgleprincipper:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li><strong>Håndfuldsmodellen:</strong> En håndfuld protein, en håndfuld kulhydrat, to håndfulde grøntsager og en spiseskefuld fedtstof.</li>
              <li><strong>Naturlig portionskontrol:</strong> Hånden er den perfekte målestok for din krops størrelse.</li>
              <li><strong>Øget mæthed:</strong> Fokus på grøntsager og protein holder dig mæt længere.</li>
              <li><strong>Fleksibilitet:</strong> Nemt at følge i hverdagen uden at føle dig begrænset.</li>
            </ul>
            <p>
              Sense handler om at lære at lytte til kroppens signaler og spise med omtanke. Det er en bæredygtig tilgang til vægttab, der kan opretholdes på lang sigt.
            </p>
            <div className="bg-green-50 p-6 rounded-xl flex items-start gap-4">
              <Lightbulb className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <p className="text-green-800 font-medium">
                <strong>Tip:</strong> Start med at fokusere på at fylde halvdelen af tallerkenen med grøntsager. Dette sikrer automatisk en god balance og øget mæthed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA to Sense Recipes */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-teal-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
            Find dine næste <span className="text-green-200">Sense opskrifter</span>
          </h2>
          <p className="text-xl text-green-100 mb-12 max-w-3xl mx-auto">
            Udforsk vores store samling af lækre og nemme Sense-opskrifter, der understøtter dit vægttab.
          </p>
          <Link
            href="/sense/opskrifter"
            className="group bg-white text-green-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 justify-center mx-auto max-w-fit"
          >
            Se Sense opskrifter
            <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
          </Link>
        </div>
      </section>
    </main>
  )
}
