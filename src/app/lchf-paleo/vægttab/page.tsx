import Link from 'next/link'
import { ArrowLeft, Scale, Lightbulb } from 'lucide-react'

export default function LchfPaleoWeightLossTheoryPage() {
  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-orange-50/30 to-green-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-green-500/5"></div>
        </div>
        <div className="container relative text-center">
          <Link href="/lchf-paleo" className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Tilbage til LCHF/Paleo
          </Link>
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium mb-6 ml-4">
            <Scale className="w-4 h-4" />
            LCHF/Paleo & Vægttab
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
            LCHF/Paleo for <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-green-600">vægttab</span>
          </h1>
          <p className="text-xl md:text-2xl mb-12 text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Lær hvordan LCHF og Paleo hjælper dig med at tabe dig gennem naturlige fødevarer og reducerede kulhydrater.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20 bg-white">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 text-gray-900 text-center">
            Sådan virker LCHF/Paleo for vægttab
          </h2>
          <div className="space-y-8 text-lg text-gray-700 leading-relaxed">
            <p>
              LCHF (Lav-Kulhydrat, Høj-Fedt) og Paleo er kraftfulde strategier for vægttab, der fokuserer på naturlige fødevarer og reducerede kulhydrater. Ved at ændre kroppens metabolisme opnår du effektivt vægttab.
            </p>
            <p>
              <strong>Nøgleprincipper:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 mb-6">
              <li><strong>Reduceret kulhydrater:</strong> Mindre kulhydrater tvinger kroppen til at forbrænde fedt for energi.</li>
              <li><strong>Øget fedtindtag:</strong> Sunde fedtstoffer giver mæthed og stabil energi.</li>
              <li><strong>Naturlige fødevarer:</strong> Fokus på uforarbejdede fødevarer som kød, fisk, æg og grøntsager.</li>
              <li><strong>Stabiliseret blodsukker:</strong> Mindre udsving i blodsukkeret fører til mere stabil energi.</li>
            </ul>
            <p>
              LCHF/Paleo handler om at spise som vores forfædre - naturlige fødevarer uden forarbejdede produkter. Det er en bæredygtig tilgang til vægttab, der kan opretholdes på lang sigt.
            </p>
            <div className="bg-orange-50 p-6 rounded-xl flex items-start gap-4">
              <Lightbulb className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <p className="text-orange-800 font-medium">
                <strong>Tip:</strong> Start med at reducere kulhydrater gradvist og fokusér på sunde fedtstoffer som olivenolie, nødder og avokado.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA to LCHF/Paleo Recipes */}
      <section className="py-20 bg-gradient-to-r from-orange-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
            Find dine næste <span className="text-orange-200">LCHF/Paleo opskrifter</span>
          </h2>
          <p className="text-xl text-orange-100 mb-12 max-w-3xl mx-auto">
            Udforsk vores store samling af lækre og nemme LCHF/Paleo-opskrifter, der understøtter dit vægttab.
          </p>
          <Link
            href="/lchf-paleo/opskrifter"
            className="group bg-white text-orange-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 justify-center mx-auto max-w-fit"
          >
            Se LCHF/Paleo opskrifter
            <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
          </Link>
        </div>
      </section>
    </main>
  )
}
