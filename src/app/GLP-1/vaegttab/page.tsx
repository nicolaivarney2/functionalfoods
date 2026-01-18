'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowLeft, Brain, CheckCircle2, XCircle, Clock, UtensilsCrossed, Target, Heart, Shield } from 'lucide-react'

export default function GLP1WeightLossPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero / Intro */}
      <section className="relative bg-gradient-to-br from-gray-50 via-blue-50/30 to-green-50/20 py-20 lg:py-28">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.1),transparent_50%)]"></div>
        </div>
        
        <div className="container relative">
          <div className={`max-w-5xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link 
              href="/GLP-1"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Tilbage til GLP-1 kost
            </Link>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 text-gray-900 leading-tight">
              Hvad taber du dig <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">af med GLP-1 kost?</span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed mb-6 font-medium">
              Vægttab sker ikke gennem kalorietælling eller viljestyrke. Det sker gennem <strong className="text-blue-600">mæthed</strong> – og mæthed skabes af madens sammensætning og kroppens egne hormoner.
            </p>

            <p className="text-lg text-gray-600 max-w-4xl mx-auto leading-relaxed mb-8">
              GLP-1 kosten bruger kroppens egen biologi til at skabe den samme mæthedsfølelse, som Wegovy og Ozempic skaber kunstigt. Forskellen? Her arbejder du <strong>sammen med</strong> din krop – ikke imod den.
            </p>
          </div>
        </div>
      </section>

      {/* The Core Truth About Weight Loss */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-12 text-gray-900 text-center">
              Sandheden om vægttab: Du taber dig af <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">mæthed</span>
            </h2>
            
            <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-3xl p-8 md:p-12 mb-8 border-2 border-blue-200">
              <p className="text-2xl text-gray-800 mb-8 leading-relaxed font-medium">
                Vægttab handler ikke om at spise mindre gennem viljestyrke. Det handler om at <strong className="text-blue-700">føle sig mæt</strong> – og derfor automatisk spise mindre.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 border-2 border-red-200">
                  <div className="flex items-center gap-3 mb-4">
                    <XCircle className="w-8 h-8 text-red-600" />
                    <h3 className="text-xl font-bold text-gray-900">Traditionel tilgang</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    Du tæller kalorier, kæmper mod sult, og overspiser alligevel fordi kroppen signalerer mangel. Det er en kamp mod din egen biologi.
                  </p>
                </div>
                
                <div className="bg-white rounded-2xl p-6 border-2 border-green-200">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <h3 className="text-xl font-bold text-gray-900">GLP-1 tilgang</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed">
                    Du spiser mad, der biologisk skaber mæthed. Kroppen signalerer "nok", og du spiser automatisk mindre – uden kamp, uden sult.
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-8 border-l-4 border-blue-500">
                <p className="text-lg text-gray-800 leading-relaxed mb-4">
                  <strong>Det er præcis det samme, som sker med Wegovy og Ozempic:</strong> Medicinen forstærker kroppens GLP-1 signaler, så du føler dig mæt. GLP-1 kosten gør det samme – men gennem madens sammensætning i stedet for medicin.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  <strong>Resultatet er det samme:</strong> Du føler dig mæt, spiser automatisk færre kalorier, og taber dig – uden at skulle kæmpe mod din egen biologi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How Food Composition Creates Satiety */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
              Hvordan skaber madens sammensætning mæthed?
            </h2>
            
            <p className="text-xl text-gray-700 mb-12 text-center max-w-3xl mx-auto leading-relaxed">
              Når du spiser mad med den rigtige sammensætning, sker der noget specifikt i din krop:
            </p>
            
            <div className="space-y-8 mb-8">
              <div className="bg-white rounded-3xl p-8 border-2 border-blue-200 shadow-lg">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Protein aktiverer GLP-1</h3>
                    <p className="text-lg text-gray-700 leading-relaxed mb-4">
                      Når du spiser protein (æg, kylling, fisk, bælgfrugter), registrerer tarmen dette og frigiver GLP-1. Dette sker <strong>før</strong> kalorierne er optaget – kroppen reagerer på madens sammensætning, ikke kun dens energiindhold.
                    </p>
                    <p className="text-gray-600 italic">
                      Det er derfor, at et proteinrigt måltid giver længere mæthed end et kulhydratrigt måltid med samme kalorier.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-3xl p-8 border-2 border-green-200 shadow-lg">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Brain className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">2. GLP-1 når hjernen</h3>
                    <p className="text-lg text-gray-700 leading-relaxed mb-4">
                      GLP-1 rejser gennem blodet til hjernen, hvor det aktiverer mæthedscentre. Dette sker uafhængigt af, hvor mange kalorier du har spist. Hjernen modtager signalet: <strong>"Du er mæt"</strong> – ikke "Du har fået nok kalorier".
                    </p>
                    <p className="text-gray-600 italic">
                      Det er her, følelsen af ro omkring mad opstår. Du stopper med at tænke på mad, fordi kroppen signalerer, at den har fået nok.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-3xl p-8 border-2 border-emerald-200 shadow-lg">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Maven tømmes langsommere</h3>
                    <p className="text-lg text-gray-700 leading-relaxed mb-4">
                      GLP-1 sænker hastigheden, hvormed maden forlader maven. Dette forlænger mæthedsfølelsen fysisk – du har bogstaveligt talt mad i maven længere, hvilket forstærker signalet om mæthed.
                    </p>
                    <p className="text-gray-600 italic">
                      Fiberrige fødevarer (grøntsager, bælgfrugter, fuldkorn) forstærker denne effekt yderligere.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-3xl p-8 border-2 border-teal-200 shadow-lg">
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 bg-teal-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Target className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">4. Blodsukkeret stabiliseres</h3>
                    <p className="text-lg text-gray-700 leading-relaxed mb-4">
                      GLP-1 regulerer insulinudskillelsen, så blodsukkeret stiger langsomt og jævnt. Dette reducerer cravings og lysten til at snacke – fordi kroppen ikke signalerer "mangel" gennem blodsukkerfald.
                    </p>
                    <p className="text-gray-600 italic">
                      Det er derfor, at sunde fedtstoffer og protein sammen med fibre skaber langvarig mæthed – de stabiliserer blodsukkeret over flere timer.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-600 to-green-600 rounded-3xl p-8 text-white text-center">
              <p className="text-xl leading-relaxed font-medium">
                <strong>Resultatet:</strong> Du føler dig mæt, spiser automatisk færre kalorier, og taber dig – ikke gennem viljestyrke, men gennem kroppens egen biologi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Medicine vs. Food: Same Goal, Different Methods */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
              Wegovy/Ozempic vs. GLP-1 kost: <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">Samme mål, forskellige metoder</span>
            </h2>
            
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl p-8 md:p-12 mb-8 border-2 border-gray-200">
              <p className="text-xl text-gray-800 mb-12 leading-relaxed text-center">
                Både medicin og kost opnår det samme: <strong>Øget mæthed gennem GLP-1 aktivering.</strong> Men hvordan de gør det, er fundamentalt forskelligt:
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-2xl p-8 border-2 border-blue-300 shadow-lg">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Wegovy/Ozempic</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Hvordan virker det?</p>
                      <p className="text-gray-700 leading-relaxed">
                        Medicinen forstærker kunstigt kroppens GLP-1 signaler. Den "tvinger" kroppen til at føle sig mæt, uanset hvad du spiser.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Fordele:</p>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>Kraftig effekt – virker uanset kost</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span>Hurtigt resultat</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Ulemper:</p>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <span>Kunsteret intervention – kroppen "tvinges"</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <span>Bivirkninger (kvalme, opkast)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <span>Vægten kommer ofte tilbage, når medicinen stoppes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <span>Dyrt og kræver recept</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-8 border-2 border-green-300 shadow-lg">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center">
                      <Heart className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">GLP-1 kost</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Hvordan virker det?</p>
                      <p className="text-gray-700 leading-relaxed">
                        Madens sammensætning aktiverer kroppens egen GLP-1 produktion naturligt. Du arbejder <strong>sammen med</strong> kroppen, ikke imod den.
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Fordele:</p>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Naturlig – bruger kroppens egne mekanismer</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Ingen bivirkninger</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Bæredygtigt – kan opretholdes livslangt</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Gratis og tilgængeligt for alle</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Lærer dig at spise rigtigt permanent</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 mb-2">Ulemper:</p>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                          <XCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>Kræver bevidsthed om madvalg</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <XCircle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>Resultatet kommer gradvist (men varigt)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-2xl p-8 border-l-4 border-blue-500">
                <p className="text-lg text-gray-800 leading-relaxed mb-4">
                  <strong>Vigtig pointe:</strong> GLP-1 kosten kan også bruges <strong>sammen med</strong> medicin. Når du spiser rigtigt, forstærker du medicinens effekt, og når du en dag stopper med medicinen, har du allerede lært at spise på en måde, der opretholder vægttabet.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  Det er derfor, at mange læger anbefaler kostændringer sammen med GLP-1 medicin – for at sikre, at resultaterne varer ved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Mental Shift: Working WITH Your Body */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
              Det mentale skift: Arbejd <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">sammen med</span> din krop
            </h2>
            
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border-2 border-blue-200 mb-8">
              <p className="text-xl text-gray-800 mb-8 leading-relaxed">
                Vægttab handler ikke kun om mad. Det handler om <strong>mindsætning</strong> – og om at forstå, at du ikke kæmper mod din krop, men arbejder sammen med den.
              </p>
              
              <div className="space-y-8">
                <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-600" />
                    Gammel mindsætning: Kamp mod kroppen
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    "Jeg skal tælle kalorier, kæmpe mod sult, og tvinge mig selv til at spise mindre." Dette skaber stress, frustration og ofte mislykket vægttab, fordi du kæmper mod din egen biologi.
                  </p>
                </div>
                
                <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    Ny mindsætning: Samarbejde med kroppen
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    "Jeg spiser mad, der biologisk skaber mæthed, så kroppen automatisk signalerer 'nok'. Jeg arbejder sammen med min krop, ikke imod den."
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Dette skaber ro, selvtillid og varigt vægttab, fordi du ikke kæmper – du samarbejder.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-600 to-green-600 rounded-3xl p-8 md:p-12 text-white shadow-xl">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 text-center">
                GLP-1 kosten er en periode, ikke en straf
              </h3>
              
              <div className="space-y-6 text-lg text-blue-50 leading-relaxed">
                <p>
                  <strong>Du gør det her sammen med din krop i en given periode</strong> – ikke fordi du skal "straffe" dig selv eller "tvinge" dig til vægttab.
                </p>
                <p>
                  I stedet for at se det som en kamp, ser du det som et samarbejde: Du giver kroppen den rigtige mad, og kroppen giver dig mæthed og vægttab tilbage.
                </p>
                <p>
                  <strong>Når du har opnået dit vægttabsmål,</strong> har du ikke bare tabt dig – du har lært at spise på en måde, der opretholder resultaterne. Du har bygget en relation til mad, der er baseret på samarbejde, ikke kamp.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why This Works: The Science */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
              Hvorfor virker dette? Videnskaben bag
            </h2>
            
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border-2 border-gray-200 mb-8">
              <p className="text-xl text-gray-800 mb-8 leading-relaxed">
                GLP-1 kosten virker, fordi den bygger på kroppens egen biologi – ikke på modstand mod den:
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">1. Hormonelle signaler vs. kalorier</h4>
                  <p className="text-gray-700 leading-relaxed">
                    Kroppen reagerer på madens <strong>sammensætning</strong> (protein, fibre, fedt) før den reagerer på kalorier. Det er derfor, at 500 kalorier protein og grøntsager giver mere mæthed end 500 kalorier slik.
                  </p>
                </div>
                
                <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-200">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">2. Mæthed før overspisning</h4>
                  <p className="text-gray-700 leading-relaxed">
                    Når GLP-1 aktiveres, signalerer kroppen mæthed <strong>før</strong> du når til punktet, hvor du overspiser. Du stopper naturligt, fordi kroppen siger "nok".
                  </p>
                </div>
                
                <div className="bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-200">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">3. Automatisk kaloriebegrænsning</h4>
                  <p className="text-gray-700 leading-relaxed">
                    Du spiser færre kalorier <strong>automatisk</strong> – ikke fordi du tæller dem, men fordi du føler dig mæt. Dette skaber et kalorieunderskud uden kamp.
                  </p>
                </div>
                
                <div className="bg-teal-50 rounded-2xl p-6 border-2 border-teal-200">
                  <h4 className="font-bold text-gray-900 mb-3 text-lg">4. Varigt resultat</h4>
                  <p className="text-gray-700 leading-relaxed">
                    Fordi du lærer at spise rigtigt, opretholder du vægttabet permanent. Du har ikke bare tabt dig – du har ændret din relation til mad.
                  </p>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-2xl p-8 border-l-4 border-blue-500">
                <p className="text-lg text-gray-800 leading-relaxed mb-4">
                  <strong>Det er præcis det samme, som sker med Wegovy og Ozempic:</strong> Medicinen forstærker GLP-1 signaler, så du føler dig mæt og spiser automatisk mindre. GLP-1 kosten gør det samme – men gennem madens sammensætning.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  <strong>Forskellen er:</strong> Med medicin "tvinges" kroppen. Med kost <strong>arbejder</strong> du sammen med kroppen. Resultatet er det samme – men metoden er fundamentalt anderledes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Practical Implementation */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-1200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
              Sådan implementerer du GLP-1 kosten til vægttab
            </h2>
            
            <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border-2 border-gray-200 mb-8">
              <p className="text-xl text-gray-800 mb-8 leading-relaxed">
                GLP-1 kosten handler ikke om at tælle kalorier eller følge strikte regler. Den handler om at spise mad, der biologisk skaber mæthed:
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-6 p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                  <div className="text-4xl">🥚</div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-3">Protein i hvert måltid</h4>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      Protein er den stærkeste aktiverer af GLP-1. Start hvert måltid med protein (æg, kylling, fisk, bælgfrugter, græsk yoghurt). Dette aktiverer GLP-1 produktionen <strong>før</strong> du har spist mange kalorier.
                    </p>
                    <p className="text-sm text-gray-600 italic">
                      Målet: 20-30g protein pr. måltid for optimal GLP-1 aktivering.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-6 p-6 bg-green-50 rounded-2xl border-2 border-green-200">
                  <div className="text-4xl">🥬</div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-3">Fiberrige grøntsager og bælgfrugter</h4>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      Fiber forstærker GLP-1 responsen og forlænger mæthedsfølelsen. Grøntsager, bælgfrugter (linser, bønner), havre og fuldkorn skaber den langsomme, jævne mæthed, der holder i flere timer.
                    </p>
                    <p className="text-sm text-gray-600 italic">
                      Målet: Fyld halvdelen af din tallerken med grøntsager eller bælgfrugter.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-6 p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-200">
                  <div className="text-4xl">🥑</div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-3">Sunde fedtstoffer</h4>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      Fedt forlænger mæthedsfølelsen og stabiliserer blodsukkeret. Avocado, olivenolie, nødder og fed fisk (laks, makrel) skaber den langvarige mæthed, der reducerer cravings mellem måltider.
                    </p>
                    <p className="text-sm text-gray-600 italic">
                      Målet: Inkluder sunde fedtstoffer i hvert måltid for optimal mæthed.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-6 p-6 bg-red-50 rounded-2xl border-2 border-red-200">
                  <XCircle className="w-10 h-10 text-red-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-3">Undgå flydende kalorier og snacks</h4>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      Flydende kalorier (sodavand, juice, alkohol) og snacks underminerer GLP-1 effekten, fordi de ikke aktiverer mæthedssignaler på samme måde som solide måltider. De skaber også blodsukkerudsving, der trigger cravings.
                    </p>
                    <p className="text-sm text-gray-600 italic">
                      Målet: Fokus på 2-3 solide, mættende måltider om dagen frem for konstant snacking.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-6 p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                  <Clock className="w-10 h-10 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 mb-3">2-3 mættende måltider frem for snacking</h4>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      Strukturen styrker GLP-1 responsen. Når du spiser 2-3 store, mættende måltider med protein, fibre og fedt, aktiverer du GLP-1 optimalt og opretholder mæthed mellem måltiderne.
                    </p>
                    <p className="text-sm text-gray-600 italic">
                      Målet: Spis når du er sulten, stop når du er mæt – ikke når du har spist et bestemt antal kalorier.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Bottom Line */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-1400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-gradient-to-br from-blue-600 to-green-600 rounded-3xl p-8 md:p-12 shadow-2xl text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
                Bundlinjen: Du taber dig af mæthed, ikke viljestyrke
              </h2>
              
              <div className="space-y-6 text-lg text-blue-50 leading-relaxed">
                <p>
                  <strong>Vægttab sker ikke gennem kalorietælling eller kamp mod sult.</strong> Det sker gennem mæthed – og mæthed skabes af madens sammensætning og kroppens egne hormoner.
                </p>
                <p>
                  GLP-1 kosten bruger kroppens egen biologi til at skabe den samme mæthedsfølelse, som Wegovy og Ozempic skaber kunstigt. Forskellen? Her arbejder du <strong>sammen med</strong> din krop – ikke imod den.
                </p>
                <p>
                  <strong>Du gør det her sammen med din krop i en given periode,</strong> og når du har opnået dit vægttabsmål, har du ikke bare tabt dig – du har lært at spise på en måde, der opretholder resultaterne permanent.
                </p>
                <p className="text-xl font-semibold text-white pt-4">
                  Det er præcis det samme endgoal som medicin – men opnået gennem samarbejde, ikke tvang.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        <div className="container relative text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
            Find dine næste <span className="text-blue-200">GLP-1 opskrifter</span>
          </h2>
          <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
            Udforsk vores store samling af lækre og nemme GLP-1-optimeret opskrifter, der alle er designet til at booste din naturlige GLP-1 respons og skabe maksimal mæthed.
          </p>
          <Link
            href="/GLP-1/opskrifter"
            className="group bg-white text-blue-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 justify-center mx-auto max-w-fit"
          >
            Se GLP-1 opskrifter
            <ArrowLeft className="w-5 h-5 group-hover:translate-x-1 transition-transform rotate-180" />
          </Link>
        </div>
      </section>
    </main>
  )
}
