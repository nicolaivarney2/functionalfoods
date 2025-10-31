import Link from 'next/link'
import { ArrowLeft, Scale, Lightbulb } from 'lucide-react'

export default function AntiInflammatoryWeightLossTheoryPage() {
  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-emerald-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5"></div>
        </div>
        <div className="container relative text-center">
          <Link href="/anti-inflammatory" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til Anti-inflammatorisk
          </Link>
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            Anti-inflammatorisk & Vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            Anti-inflammatorisk for <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-600">vægttab</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Lær hvordan anti-inflammatorisk kost hjælper dig med at tabe dig gennem fødevarer der reducerer inflammation.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 text-gray-900 text-center">
            Sådan virker anti-inflammatorisk kost for vægttab
          </h2>
          <div className="space-y-8 text-lg text-gray-700 leading-relaxed">
            <p>
              Anti-inflammatorisk kost fokuserer på fødevarer der reducerer inflammation i kroppen. Inflammation kan forhindre vægttab og skabe modstand mod vægttab, så ved at reducere inflammation kan du opnå bedre resultater.
            </p>
            <p>
              <strong>Nøgleprincipper:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li><strong>Omega-3 fedtsyrer:</strong> Fisk, nødder og frø der reducerer inflammation og fremmer hjerte-sundhed.</li>
              <li><strong>Antioxidanter:</strong> Bær, grønne grøntsager og krydderier der bekæmper frie radikaler.</li>
              <li><strong>Fiberrige fødevarer:</strong> Fuldkorn, bælgfrugter og grøntsager der støtter tarm-sundhed.</li>
              <li><strong>Undgå forarbejdede fødevarer:</strong> Mindsker inflammation og forbedrer generel sundhed.</li>
            </ul>
            <p>
              Anti-inflammatorisk kost handler om at spise fødevarer der støtter kroppens naturlige helbredelsesprocesser. Det er en bæredygtig tilgang til vægttab, der kan opretholdes på lang sigt.
            </p>
            <div className="bg-emerald-50 p-6 rounded-xl flex items-start gap-4">
              <Lightbulb className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
              <p className="text-emerald-800 font-medium">
                <strong>Tip:</strong> Fokusér på at spise regnbuefarvet grøntsager og bær for at få en bred vifte af antioxidanter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA to Anti-inflammatory Recipes */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
            Find dine næste <span className="text-emerald-200">anti-inflammatoriske opskrifter</span>
          </h2>
          <p className="text-xl text-emerald-100 mb-12 max-w-3xl mx-auto">
            Udforsk vores store samling af lækre og nemme anti-inflammatoriske opskrifter, der understøtter dit vægttab.
          </p>
          <Link
            href="/anti-inflammatory/opskrifter"
            className="group bg-white text-emerald-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 justify-center mx-auto max-w-fit"
          >
            Se anti-inflammatoriske opskrifter
            <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
          </Link>
        </div>
      </section>
    </main>
  )
}
