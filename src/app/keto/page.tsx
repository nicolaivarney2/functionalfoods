'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Users, Leaf, Brain, Zap, Sparkles, ChevronRight, Check, X } from 'lucide-react'
import Image from 'next/image'

export default function KetoPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-purple-50/30 to-green-50/20 py-20 lg:py-28">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-green-500/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-gray-900 leading-tight">
              Hvad er Keto?
            </h1>
            
            <p className="text-lg sm:text-xl mb-8 text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Keto er en lav-kulhydrat, høj-fedt diæt der hjælper kroppen med at forbrænde fedt i stedet for kulhydrater. Det kan hjælpe med vægttab, stabilisere blodsukkeret og give dig bedre kontrol over din appetit.
            </p>
            
            <p className="text-base text-gray-700 max-w-3xl mx-auto leading-relaxed mb-8">
              På denne side kan du finde alt hvad du skal bruge, for at komme i gang med Keto i dag. Vi guider dig gennem grundprincipperne, hvad du skal spise, og hjælper dig med at finde ud af, om Keto er noget for dig.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation Cards - Keto vægttab og opskrifter */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`text-center mb-16 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Udforsk keto
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Lær om keto vægttab og find opskrifter der passer til din ketogene livsstil.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Link
              href="/keto/vægttab"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-green-500 rounded-2xl flex items-center justify-center">
                  <TrendingDown className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                    Keto vægttab
                  </h3>
                  <p className="text-gray-500">Teori og praksis</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Lær hvordan ketogen diæt hjælper med vægttab, hvordan du kommer i ketose, og hvad du skal spise for at opretholde ketosen.
              </p>
              <div className="flex items-center text-purple-600 group-hover:text-purple-700 font-medium">
                Læs mere om keto vægttab
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/keto/opskrifter"
              className="group bg-white border-2 border-gray-100 rounded-3xl p-8 hover:border-green-200 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-500 transform hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                    Keto opskrifter
                  </h3>
                  <p className="text-gray-500">712 opskrifter</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Udforsk vores samling af ketogene opskrifter – alle beregnet på næring og perfekte til at holde dig i ketose.
              </p>
              <div className="flex items-center text-green-600 group-hover:text-green-700 font-medium">
                Se alle keto opskrifter
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* What is Keto - Detailed Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-purple-50/30">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className={`mb-12 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                Hvad er ketogen diæt?
              </h2>
              
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6 mb-8">
                <p>
                  Ketogen diæt er en lav-kulhydrat, høj-fedt diæt der hjælper kroppen med at forbrænde fedt i stedet for kulhydrater. Det virker ved at lade kroppen skifte til en stofskiftetilstand, der kaldes ketose.
                </p>

                <p>
                  Når du er i ketose, begynder kroppen at bruge glykogen først, derefter nedbryder den fedt til molekyler, der kaldes ketoner. Kort sagt, ketose forbrænder fedt som primær energikilde i stedet for kulhydrater. Resultatet er ofte vægttab, balanceret blodsukker og bedre kontrol over kroniske tilstande.
                </p>

                <p>
                  For de fleste på Keto svarer det til omkring 25-50 gram kulhydrater om dagen. Kulhydrater som brød, pasta, kartofler, sukkersodavand og endda frugt nedbrydes til sukker og har stor indvirkning på dit blodsukkerniveau. Selvom protein og fedt også kan påvirke blodsukkerniveauet, har de meget mindre indvirkning end dit kulhydratindtag.
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <div className="bg-purple-100 border border-purple-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-purple-800 mb-3 text-lg">Ketose</h4>
                  <p className="text-purple-700 leading-relaxed">Når kroppen ikke har nok kulhydrater, begynder den at forbrænde fedt og producerer ketoner som energikilde.</p>
                </div>
                
                <div className="bg-green-100 border border-green-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-green-800 mb-3 text-lg">Vægttab</h4>
                  <p className="text-green-700 leading-relaxed">Keto kan hjælpe med hurtigt vægttab, især i starten, da kroppen tømmer glykogenlagerne.</p>
                </div>
                
                <div className="bg-blue-100 border border-blue-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-blue-800 mb-3 text-lg">Stabil energi</h4>
                  <p className="text-blue-700 leading-relaxed">Mange oplever mere stabil energi og færre sultfølelser på keto.</p>
                </div>
              </div>
            </div>

            {/* Macros Card */}
            <div className={`transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-purple-500/10 border border-purple-100 max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-green-500 rounded-2xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Keto makronæringsstoffer</h3>
                </div>
                
                <p className="text-gray-600 mb-6 text-sm">
                  Generelt sigter de fleste på Keto efter denne makrofordeling – ideelt til vægttab:
                </p>
                
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700 font-medium">Fedt</span>
                      <span className="text-sm font-semibold text-gray-900">65-70%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: '67.5%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700 font-medium">Protein</span>
                      <span className="text-sm font-semibold text-gray-900">25-30%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '27.5%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-700 font-medium">Kulhydrater</span>
                      <span className="text-sm font-semibold text-gray-900">5-10%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '7.5%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Dette svarer typisk til <strong>20-50 gram kulhydrater om dagen</strong>, afhængigt af dit kalorieindtag og mål.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Keto for Weight Loss */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className={`mb-12 transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900">
                Hvorfor Keto til vægttab?
              </h2>
              
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
                <p>
                  Mange prøver Keto, fordi de vil tabe sig eller kæmper med fedme. Keto hjælper med vægttab ved at hjælpe kroppen med at skifte til ketose, hvor den forbrænder fedt til energi i stedet for kulhydrater. Dette reducerer dit insulinniveau og øger nedbrydningen af fedt.
                </p>

                <p>
                  Den lav-kulhydrat, høj-fedt tilgang er også god for mæthed. Fedt og protein er meget mættende, og mange rapporterer, at deres appetit er bedre kontrolleret på Keto end når de spiser kulhydratrige fødevarer. Det kan føre til lavere kalorieindtag og mere holdbart vægttab.
                </p>

                <p className="bg-green-50 rounded-xl p-6 border-l-4 border-green-600">
                  <strong>Vægttab på Keto betyder ikke muskelmasse-tab.</strong> Ketose hjælper med at bevare din stofskiftehastighed, så du stadig forbrænder samme mængde kalorier, mens din vægt falder.
                </p>

                <p>
                  Hvor meget vægt du kan tabe på Keto, afhænger af dit kalorieunderskud og andre vaner. Periodisk faste kan hjælpe med at gøre dit vægttab mere bæredygtigt og hjælpe dig med at holde dig i ketose. Styrketræning kan hjælpe dig med at bygge muskelmasse, som forbrænder flere kalorier i hvile.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What to Eat - Infographic Placeholders */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <div className={`mb-12 transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 text-center">
                Hvad spiser man på Keto?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto text-center mb-12">
                Det er umuligt at liste alt, du kan spise på Keto, men her er nogle brede forslag til meget kulhydratfattige muligheder:
              </p>
            </div>

            {/* Placeholder for "What to Eat" infographic */}
            <div className={`mb-12 transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-white rounded-2xl p-8 border-2 border-dashed border-gray-300 text-center">
                <p className="text-gray-500 text-sm mb-4">Illustration: Infographic "What to Eat on a Keto Diet"</p>
                <p className="text-gray-400 text-xs">Kategorier: Meats & proteins, Fruits, Dairy products, Vegetables, Dairy alternatives, Nuts & seeds, Fats & oils, Other</p>
              </div>
            </div>

            {/* Food Categories - Text Version */}
            <div className={`grid md:grid-cols-2 gap-8 mb-12 transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Check className="w-6 h-6 text-green-600" />
                  Kød og fisk
                </h3>
                <p className="text-gray-700 mb-3">
                  Oksekød, kylling, kalkun, fisk, skaldyr, svinekød, æg, sojabønner og sojaproteiner.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Check className="w-6 h-6 text-green-600" />
                  Grøntsager
                </h3>
                <p className="text-gray-700 mb-3">
                  Broccoli, zucchini, blomkål, bladgrøntsager, gul squash, hvidløg, peberfrugter, radiser, agurker, okra, champignoner, grønne bønner, gulerødder, selleri.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Check className="w-6 h-6 text-green-600" />
                  Mælkeprodukter
                </h3>
                <p className="text-gray-700 mb-3">
                  Sur fløde, flødeost, fløde, ost. Eller usødtede plantemælker (soja, mandel, kokos).
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Check className="w-6 h-6 text-green-600" />
                  Fedtstoffer og olier
                </h3>
                <p className="text-gray-700 mb-3">
                  Smør, madolier, kokosolie, dyrefedt. Olivenolie, avocado, nødder og kerner er også gode valg.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Check className="w-6 h-6 text-green-600" />
                  Frugt (begrænset)
                </h3>
                <p className="text-gray-700 mb-3">
                  Hindbær, jordbær, kokos, avocadoer, citroner, lime. De fleste frugter er for høje i kulhydrater.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Check className="w-6 h-6 text-green-600" />
                  Nødder og kerner
                </h3>
                <p className="text-gray-700 mb-3">
                  Chiafrø, hørfrø, sesamfrø, mandler, valnødder, pekan, jordnødder, hasselnødder, macadamianødder.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What to Avoid - Infographic Placeholder */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <div className={`mb-12 transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 text-center">
                Hvad skal man undgå på Keto?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto text-center mb-12">
                Fødevarer med højt kulhydratindhold bør undgås på Keto. Her er en liste over, hvad du bør begrænse eller springe over:
              </p>
            </div>

            {/* Placeholder for "Foods to Avoid" infographic */}
            <div className={`mb-12 transition-all duration-1000 delay-1200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-white rounded-2xl p-8 border-2 border-dashed border-gray-300 text-center">
                <p className="text-gray-500 text-sm mb-4">Illustration: Infographic "Foods to Avoid on Keto"</p>
                <p className="text-gray-400 text-xs">Kategorier: Meats & proteins (breaded/battered), Vegetables (potatoes, corn), Fruits (most), Grains, Sugary foods, Dairy (milk, yogurt), Other</p>
              </div>
            </div>

            {/* Avoid Categories - Text Version */}
            <div className={`grid md:grid-cols-2 gap-8 mb-12 transition-all duration-1000 delay-1300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <X className="w-6 h-6 text-red-600" />
                  Korn og stivelse
                </h3>
                <p className="text-gray-700 mb-3">
                  Brød, ris, pasta, havre, mel, majs, quinoa, tortillas, fladbrød, kiks, kager. Alle disse er meget høje i kulhydrater.
                </p>
              </div>

              <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <X className="w-6 h-6 text-red-600" />
                  Sukkerrige fødevarer
                </h3>
                <p className="text-gray-700 mb-3">
                  Sukkersodavand, frugtjuice, sødede drikke, slik, cookies, kager, is, siraper, gele, honning.
                </p>
              </div>

              <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <X className="w-6 h-6 text-red-600" />
                  Visse grøntsager
                </h3>
                <p className="text-gray-700 mb-3">
                  Kartofler, søde kartofler, majs, vintersquash, ærter. Disse er for høje i kulhydrater.
                </p>
              </div>

              <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <X className="w-6 h-6 text-red-600" />
                  De fleste frugter
                </h3>
                <p className="text-gray-700 mb-3">
                  Æbler, bananer, mangos, kirsebær, druer, pærer, papaya. De fleste frugter er for høje i kulhydrater.
                </p>
              </div>

              <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <X className="w-6 h-6 text-red-600" />
                  Bestemte mælkeprodukter
                </h3>
                <p className="text-gray-700 mb-3">
                  Almindelig mælk og yoghurt er for høje i kulhydrater. Kig efter fuldfedt alternativer.
                </p>
              </div>

              <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <X className="w-6 h-6 text-red-600" />
                  Andre
                </h3>
                <p className="text-gray-700 mb-3">
                  Sødede kaffeflødeprodukter, balsamicoeddike, ketchup. Tjek altid ingredienslisten på pakkede fødevarer.
                </p>
              </div>
            </div>

            <div className={`bg-blue-50 rounded-2xl p-6 border-l-4 border-blue-600 transition-all duration-1000 delay-1400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <p className="text-gray-700 leading-relaxed">
                <strong>Vigtigt:</strong> Tjek altid næringsetiketter på pakkede fødevarer for at sikre, at de er virkelig keto-venlige. Der er mange fødevarer, der indeholder flere kulhydrater end du forventer, især grøntsager, der ville blive betragtet som fine på en anden type diæt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Is Keto for You? */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-purple-50/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className={`mb-12 transition-all duration-1000 delay-1500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
                Er Keto noget for dig?
              </h2>
              
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
                <p>
                  Keto kan være en fantastisk måde at tabe sig på, forbedre dit stofskifte og få bedre kontrol over din appetit. Men det er vigtigt at forstå, at det kræver en omstilling og at du skal være klar til at ændre din måde at spise på.
                </p>

                <div className="bg-white rounded-2xl p-8 border-2 border-purple-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Keto kan være godt for dig, hvis du:</h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Vil tabe dig uden at føle dig konstant sulten</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Har brug for at stabilisere dit blodsukker</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Kan lide at spise kød, fisk, æg og grøntsager</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Er klar til at reducere kulhydrater markant</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Har brug for struktur og klarhed i din kost</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-50 rounded-2xl p-8 border-2 border-yellow-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Tal med din læge først, hvis du:</h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span>Har en diagnosticeret medicinsk tilstand (type 2 diabetes, højt blodtryk, epilepsi)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span>Har en historie med nyresten</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span>Er gravid eller ammer</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span>Tager receptpligtig medicin</span>
                    </li>
                  </ul>
                </div>

                <p className="text-center text-lg font-medium text-gray-900 bg-purple-50 rounded-xl p-6 border-l-4 border-purple-600">
                  Når du er i tvivl, tal med din læge først. Keto kan være en game-changer for dit helbred, men det er vigtigt, at du starter en ny diæt ansvarligt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 delay-1600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
              Klar til at komme i gang?
            </h2>
            
            <p className="text-xl text-purple-100 mb-12 max-w-3xl mx-auto">
              Udforsk vores dybdegående guide til vægttab med Keto, eller find opskrifter der passer til din ketogene livsstil.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/keto/vægttab" 
                className="group bg-white text-purple-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Lær om keto vægttab
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="/keto/opskrifter" 
                className="group bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Se keto opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
