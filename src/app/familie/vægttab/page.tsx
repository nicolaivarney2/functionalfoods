import Link from 'next/link'
import { ArrowLeft, Scale, Lightbulb } from 'lucide-react'

export default function FamilieWeightLossTheoryPage() {
  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-blue-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-green-500/5"></div>
        </div>
        <div className="container relative text-center">
          <Link href="/familie" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til Familiemad
          </Link>
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            Familiemad & Vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Familiemad for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">vægttab</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Lær hvordan familiemad kan hjælpe dig med at tabe dig gennem sunde, balancerede måltider til hele familien.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 text-gray-900 text-center">
            Sådan virker familiemad for vægttab
          </h2>
          <div className="space-y-8 text-lg text-gray-700 leading-relaxed">
            <p>
              Familiemad fokuserer på sunde, balancerede opskrifter der passer til hele familien. Ved at spise samme sunde mad som børnene kan du opnå vægttab uden at føle dig begrænset eller isoleret.
            </p>
            <p>
              <strong>Nøgleprincipper:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li><strong>Familievenlig:</strong> Opskrifter der passer både børn og voksne med fokus på smag og næring.</li>
              <li><strong>Balanceret:</strong> Rigtige mængder af protein, kulhydrater og fedt for optimal sundhed.</li>
              <li><strong>Nem hverdagsmad:</strong> Opskrifter der er nemme at lave og perfekte til travle familier.</li>
              <li><strong>Bæredygtigt:</strong> En tilgang der kan opretholdes på lang sigt for hele familien.</li>
            </ul>
            <p>
              Familiemad handler om at skabe sunde vaner for hele familien. Det er en bæredygtig tilgang til vægttab, der kan opretholdes på lang sigt.
            </p>
            <div className="bg-blue-50 p-6 rounded-xl flex items-start gap-4">
              <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <p className="text-blue-800 font-medium">
                <strong>Tip:</strong> Fokusér på at lave sunde versioner af familiens yndlingsretter i stedet for at fjerne dem helt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA to Familie Recipes */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
            Find dine næste <span className="text-blue-200">familiemad opskrifter</span>
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
            Udforsk vores store samling af lækre og nemme familiemad opskrifter, der understøtter dit vægttab.
          </p>
          <Link
            href="/familie/opskrifter"
            className="group bg-white text-blue-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 justify-center mx-auto max-w-fit"
          >
            Se familiemad opskrifter
            <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
          </Link>
        </div>
      </section>
    </main>
  )
}
