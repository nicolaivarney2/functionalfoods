'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Users, Leaf, Brain, Zap, Sparkles, ChevronLeft, Check, X, AlertCircle, Scale, Flame, Heart, Moon, Activity, ShoppingCart, BookOpen, HelpCircle, Droplet, Clock } from 'lucide-react'

export default function KetoWeightLossPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero / Intro */}
      <section className="relative bg-gradient-to-br from-gray-50 via-purple-50/30 to-green-50/20 py-20 lg:py-28">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(34,197,94,0.1),transparent_50%)]"></div>
        </div>
        
        <div className="container relative">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link 
              href="/keto"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-6 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Tilbage til keto
            </Link>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 text-gray-900 leading-tight">
              Tab kiloerne med Keto
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-6">
              Meget af det, som Keto virkelig kan bidrage med, er vægttab, men uden at man skal kæmpe så meget for at tabe kiloerne, som man ser at man skal, med andre kost- og vægttabsmetoder.
            </p>

            <p className="text-base text-gray-700 max-w-3xl mx-auto leading-relaxed mb-8">
              Det er en livsændring, at skille sig af med nogle eller endda mange kg, og der er uden tvivl nogle dæmoner du skal arbejde med, hvis du har mange kilo at tabe. I den her guide viser vi dig, hvordan du kan få det meste ud af Keto, hvilke ting du skal arbejde med, og hvilke ting du faktisk kan lade komme af sig selv, i takt med, at du vender dig til Keto livsstilen.
            </p>

            <p className="text-sm text-gray-600 max-w-2xl mx-auto italic mb-8">
              Artiklen er et redskab, der giver dig et overblik over, hvordan du bærer denne opgave ad, men også hvor du skal lægge din energi, både i starten og senere, så du kan fokusere dér, hvor det giver de fleste resultater, rent fysisk og mentalt.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="#grundessencen"
                className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Kom i gang
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Grundessencen for Keto og vægttab */}
      <section id="grundessencen" className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">
                Grundessencen for Keto og vægttab
              </h2>
              
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
                <p>
                  Vægttab er en stor katalysator for livsændring, og uanset, om du søger et lille vægttab, en lidt sundere livsstil, eller om du har et håb om et stort vægttab, starter det hele med maden.
                </p>

                <p>
                  Vi ser hos mange en ret stor motivationsfaktor i, at de flytter sig på vægten, og når først resultaterne begynder at komme, er det som en snebolde-effekt, der kun bliver større og større, jo bedre det går. Det svære er nok egentligt at komme i gang, og det skal vi hjælpe dig med.
                </p>

                <p>
                  Keto kan udefra virke som en stor livsændring, og så sandt som det er sagt, kræver livsstilen nogle drastiske ændringer i nogle ting, men som du uden tvivl vil opleve i løbet af de næste par uger, er Keto faktisk en af de mindst restriktive måder at spise på.
                </p>

                <p className="text-lg font-medium text-gray-900 bg-purple-50 rounded-xl p-6 border-l-4 border-purple-600">
                  Du kan faktisk fortsætte med at spise god, lækker og mættende mad, og samtidigt taber du dig. Lad os vise dig hvordan, og sætte tingene op på en måde, så det er til at forstå, og til at gå i krig med.
                </p>
              </div>

              {/* Illustration placeholder */}
              <div className="mt-12 bg-gray-50 rounded-2xl p-8 border-2 border-dashed border-gray-300 text-center">
                <p className="text-gray-500 text-sm mb-2">Illustration: Venn-diagram der viser overlap mellem "mættende mad", "god smag" og "vægttab" – Keto er i midten</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Principperne bag Keto og vægttab */}
      <section className="py-20 bg-gradient-to-br from-purple-50/50 via-white to-green-50/50">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">
                Principperne bag et vægttab med Keto
              </h2>
              
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6 mb-8">
                <p>
                  Din krop på Keto, kan sammenlignes med en bil, der skal ombygges fra en dieselbil, til at blive en elbil, der kører på solenergi. Bilen kræver en lille ombygning og en lille tur på værksted, hvorfor den derfor er nødt til at holde stille i nogle dage, imens den ombygges, men derefter, bliver den selvkørende og effektiv.
                </p>

                <p>
                  Når bilen er ombygget, skal den genstartes stille og roligt, og i takt med, at der går nogle dage og uger, bliver din topfart kun hurtigere og hurtigere, men den er nødt til at vende sig til den nye måde at køre på, og det tager lidt tid.
                </p>

                <p>
                  Det er derfor vigtigt at indstille sig mentalt på, at der er en omstillingsperiode, hvor du skal lære nye ting om din bil – Og der skal også være plads til en fejlmargen, for det er ikke sikkert, at du får den rigtigt i første huk.
                </p>
              </div>

              {/* Illustration placeholder */}
              <div className="mb-12 bg-gray-50 rounded-2xl p-8 border-2 border-dashed border-gray-300 text-center">
                <p className="text-gray-500 text-sm mb-2">Illustration: Infografik der viser transformationen fra dieselbil til elbil – analogi for kroppens omstilling fra kulhydrat- til fedtforbrænding</p>
              </div>

              <div className="bg-white rounded-2xl p-8 border-2 border-purple-200 mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Sådan kommer vi i gang</h3>
                <div className="space-y-4 text-gray-700">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">☀️</div>
                    <div>
                      <p className="font-semibold mb-1">Først skal vi sælge dig idéen om, at en soldreven elbil er smart.</p>
                      <p className="text-sm text-gray-600">Du er nået hertil, så du har nok en idé om, at det kan noget.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">🚘</div>
                    <div>
                      <p className="font-semibold mb-1">Så skal vi give dig et overblik over, hvad ombygningen kræver</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">💨</div>
                    <div>
                      <p className="font-semibold mb-1">Så skal vi lære dig det nye styretøj</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">🔥</div>
                    <div>
                      <p className="font-semibold mb-1">Og så skal vi vise dig, hvordan du kan køre roligt og stabilt</p>
                      <p className="text-sm text-gray-600">Men på en måde, der er behagelig for dig og dine medpassagerer.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">🌧</div>
                    <div>
                      <p className="font-semibold mb-1">Til slut skal du vide, hvordan du tænder for vinduesviskerne, når der kommer regn</p>
                      <p className="text-sm text-gray-600">For der kommer regn på et tidspunkt!</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-4">
                <p>
                  Du har nok fanget analogien, så lad os fortælle dig, hvorfor Keto virker så godt på vægttab.
                </p>

                <p className="bg-green-50 rounded-xl p-6 border-l-4 border-green-600">
                  På keto øger du din forbrænding, fordi fedt er sværere at nedbryde end kulhydrater. En lav mængde kulhydrater undertrykker kroppens sulthormon, så du ikke føler sig lige så sulten som du plejer, og derfor kan spise mindre, og derudover, er Keto mad i det hele taget meget mættende, da det indeholder mere grønt og meget protein.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 faser til vægttab med Keto */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">
                4 faser til vægttab med Keto
              </h2>
              
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Keto giver vægttab, fordi det indeholder den helt rette kombination af motivationsfaktorer og sultundertrykkende metoder, og samtidigt er maden lækker og jordnær, så mange oplever, at det er den kosttype, hvor de "mister mindst", og samtidigt taber sig.
              </p>

              <div className="space-y-8">
                {/* Fase 1 */}
                <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-8 border border-purple-200">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-purple-600 text-white rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Kend til Keto (starten)</h3>
                    </div>
                  </div>
                  
                  <div className="prose max-w-none text-gray-700 leading-relaxed space-y-4">
                    <p>
                      Når man starter på Keto, sker der nogle fysiologiske ændringer i kroppen. Du spiser, som bekendt, ganske få kulhydrater, og det gør, at din krop udskiller en del væske i starten, fordi den opbruger kroppens sukkerdepoter. Kald hvad du vil, men det er en stor motivationsfaktor for hjernen, at blive belønnet så hurtigt, og det er med til, at styrke forholdet til Keto.
                    </p>

                    <p>
                      Hastigheden af vægttabet som man ser i starten, er for de fleste ikke noget der fortsætter. Mange kan godt ligge omkring 0,5 kg om ugen, men der fortsætter, men det giver os tid, til at fange idéen bag Keto, og lære maden at kende.
                    </p>
                  </div>

                  {/* Illustration placeholder */}
                  <div className="mt-6 bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300 text-center">
                    <p className="text-gray-500 text-sm">Illustration: Graf der viser vægttab over tid – hurtigt fald i første uge (væske), derefter jævnere kurve</p>
                  </div>
                </div>

                {/* Fase 2 */}
                <div className="bg-gradient-to-br from-yellow-50 to-white rounded-2xl p-8 border border-yellow-200">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-yellow-600 text-white rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Overgangssymptomerne (midten)</h3>
                    </div>
                  </div>
                  
                  <div className="prose max-w-none text-gray-700 leading-relaxed space-y-4">
                    <p>
                      Du oplever overgangssymptomer på vej i ketose. Ketose er der hvor din fedtforbrænding er størst, din sultundertrykkelse er højest, og hvor du derfor, får nemmest ved at tabe dig. Overgangssymptomerne varierer fra person til person, og du kan læse meget mere om dem i vores begynderguide.
                    </p>

                    <p className="bg-yellow-50 rounded-xl p-4 border-l-4 border-yellow-600">
                      Det tager ca. 1-3 uger, at være helt igennem overgangssymptomerne. Dermed ikke sagt, at du ikke vil opnå resultater undervejs, for det vil du uden tvivl, men det vil være på bekostning af blandt andet din energi og dit overskud. <strong>Bare husk, at det går over igen (meget vigtig detalje!)</strong>
                    </p>

                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">Sådan håndterer du overgangssymptomerne:</h4>
                      <ul className="space-y-3 text-gray-700">
                        <li className="flex items-start gap-3">
                          <Droplet className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Drik masser af væske</strong> – specielt i starten af Keto. Vi anbefaler 2-3 liter dagligt.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Scale className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Giv din krop mineralerne tilbage</strong> – ved at spise grøntsager og tilføje ekstra salt til din mad. Helst himalayasalt, da denne indeholder 80 forskellige mineraler, hvoraf almindelig bordsalt indeholder 2.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Moon className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                          <span><strong>Søvn og let bevægelse hjælper</strong> – din krop har brug for ro til at tilpasse sig.</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Illustration placeholder */}
                  <div className="mt-6 bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300 text-center">
                    <p className="text-gray-500 text-sm">Illustration: Tidslinje der viser overgangssymptomer over 1-3 uger – med tips til hver fase</p>
                  </div>
                </div>

                {/* Fase 3 */}
                <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-8 border border-green-200">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-green-600 text-white rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Find ro i det du laver (ny begyndelse)</h3>
                    </div>
                  </div>
                  
                  <div className="prose max-w-none text-gray-700 leading-relaxed space-y-4">
                    <p>
                      Efter overgangssymptomerne er ved at være forsvundet, står du et godt sted. Det er nu du skal spørge dig selv, hvad det egentligt er, du søger? Og hvorfor. Søger du at tabe 300 gram om ugen? 500 gram? Og hvornår er du egentligt tilfreds?
                    </p>

                    <p>
                      Vægttab kan være en langsigtet proces, og det er sjældent, at den er lineær. Et vægttab svinger lidt, og du kan forvente, at du nogle gange vil tage et par hundrede gram på. Det er derfor vigtigt, at du ikke bliver for detaljeorienteret, og går på vægten hvert eneste dag.
                    </p>

                    <div className="bg-green-50 rounded-xl p-6 border-l-4 border-green-600">
                      <h4 className="font-semibold text-gray-900 mb-3">Spis Keto mad, og gå efter det mad, du kan lide</h4>
                      <p className="text-gray-700 mb-4">
                        Find ud af, hvilken mad du kan lide, inden for de rammer, som Keto giver. For mange er opskriften, at spise meget salat, tilføje kød, og dertil noget fedt, i form af en olie, lidt nødder/oliven, en ost eller anden mælkeprodukt.
                      </p>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Er du til madplaner, så brug madplaner der er optimeret efter vægttab og kulhydratfattig Keto mad</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Hvis du er mere til at spise på slum, så hent en Keto indkøbsliste, hvor du finder de varer, du som udgangspunkt kan spise rigeligt af på Keto</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Gentag yndlingsopskrifter – du behøver ikke opfinde den dybe tallerken hver dag</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Illustration placeholder */}
                  <div className="mt-6 bg-gray-50 rounded-xl p-6 border-2 border-dashed border-gray-300 text-center">
                    <p className="text-gray-500 text-sm">Illustration: Tallerkenmodellen – 50% grøntsager, 40% protein, 10% fedt med eksempler på hver kategori</p>
                  </div>
                </div>

                {/* Fase 4 */}
                <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-8 border border-emerald-200">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0">
                      4
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">Optimer hvor du kan (ny energi)</h3>
                    </div>
                  </div>
                  
                  <div className="prose max-w-none text-gray-700 leading-relaxed space-y-4">
                    <p>
                      Når du har stabilitet over din mad og dit vægttab, uanset om du stadig taber dig eller ej, er det tid til, at optimere hvor du kan. Faktisk har vi en helt klar og simpel måde at optimere på, og det har virket for rigtig, rigtig mange.
                    </p>

                    <p className="bg-gray-50 rounded-xl p-4 border-l-4 border-gray-600">
                      Vi anbefaler stadig ikke, at du tæller kalorier ved at måle og veje din mad, men at du bruger kalorietælling som et fejlfindingsredskab, hvis alt andet håb er ude. Der er vi bare, slet, slet ikke endnu.
                    </p>

                    <p className="font-semibold text-gray-900">
                      Så i stedet, kan du optimere med følgende i en prioriteret rækkefølge:
                    </p>

                    <p className="text-sm text-gray-600 italic">
                      Efter hvert "punkt" undersøger du, om du opnår den ønskede effekt. Oplever du, at du taber dig det du ønsker, ved kun at indføre motion i din dagligdag, så har du fundet en god og nem løsning:
                    </p>

                    <div className="space-y-4">
                      <div className="bg-white rounded-xl p-6 border-2 border-emerald-200">
                        <div className="flex items-start gap-4 mb-3">
                          <div className="text-2xl">🏃‍♀️</div>
                          <div>
                            <h4 className="font-bold text-lg text-gray-900 mb-2">1. Dyrk motion</h4>
                            <p className="text-gray-700">
                              Det er ligegyldigt, hvad det er. Det vigtigste er, at du får det gjort. 2-4 gange om ugen er nok.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 border-2 border-blue-200">
                        <div className="flex items-start gap-4 mb-3">
                          <Clock className="w-6 h-6 text-blue-600 mt-1" />
                          <div>
                            <h4 className="font-bold text-lg text-gray-900 mb-2">2. Dyrk periodisk faste</h4>
                            <p className="text-gray-700 mb-2">
                              Det kan du gøre, ved fx. at stoppe med at spise efter aftensmaden kl 19, og skubbe morgenmaden et par timer til kl 10-11. Således har du fastet i 15-16 timer.
                            </p>
                            <Link href="/blog/keto" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                              Læs meget mere om faste her →
                            </Link>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 border-2 border-purple-200">
                        <div className="flex items-start gap-4 mb-3">
                          <div className="text-2xl">🥗</div>
                          <div>
                            <h4 className="font-bold text-lg text-gray-900 mb-2">3. Spis kun 2 måltider</h4>
                            <p className="text-gray-700">
                              Oplever du stadig ikke det ønskede resultat, kan du fjerne et måltid. I stedet for, at du spiser 3 måltider om dagen, spiser du nu kun 2. Du spiser en kombineret brunch/frokost + aftensmad om aftenen.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-6 border-2 border-orange-200">
                        <div className="flex items-start gap-4 mb-3">
                          <div className="text-2xl">🥗</div>
                          <div>
                            <h4 className="font-bold text-lg text-gray-900 mb-2">4. Spis kun 1 måltid</h4>
                            <p className="text-gray-700">
                              Du burde opleve resultater inden du når hertil, men gør du stadig ikke det, kan du overveje at fjerne et måltid mere. Således spiser du OMAD (One meal a day), og du kommer derfor i et stort kalorieunderskud.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 mt-4">
                      <p className="font-semibold text-gray-900 mb-2">Andre ting du kan skrue op:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                        <li>Mere motion</li>
                        <li>Mindre snacking</li>
                        <li>Spis lidt mindre portionsstørrelser</li>
                        <li>Periodisk faste i 24-72 timer</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hvis du ikke oplever ketose-fordele */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-white rounded-2xl p-8 border-2 border-purple-300 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Et lille mente</h3>
              <p className="text-gray-700 leading-relaxed text-lg">
                Oplever du ikke fordelene ved at være i ketose, fx. at du bliver mindre sulten, eller udskiller væsken i kroppen, så er det formentligt fordi, du ikke er i ketose. I så fald, skal du spise færre kulhydrater <strong>(og nej, ikke mere fedt)</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tag det én dag ad gangen */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-purple-50/30">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-gray-900">Tag det én dag ad gangen</h2>
              
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-6 mb-8">
                <p>
                  Det kan hurtigt blive uoverskueligt, hvis du kigger for langt frem, eller hvis du tænker for meget over, hvor mange ting, du nu skal forholde dig til. I virkeligheden skal du kun fokusere på, hvad du skal spise næste gang.
                </p>

                <p>
                  Det er rart, at være økonomisk klog, og det er rart at have planlagt alle måltider på en hel uge. Men det er ikke altid, at man skal bide over så meget af gangen. Så det kan være en god idé, at du erkender, at du ikke kan klare det hele lige nu, og at Keto kræver en lille omstilling. Så giv dig plads til at lære og afprøve.
                </p>

                <div className="bg-purple-50 rounded-xl p-6 border-l-4 border-purple-600">
                  <h3 className="font-bold text-gray-900 mb-4">💡 Tænk positivt</h3>
                  <p className="text-gray-700 mb-4">
                    Du er måske utålmodig anlagt, eller du har brug for at se, at der sker noget på vægten. For mange oplever vi dog, at der skal et mentalitetsskifte til. Med det mener vi, at du skal tænke over, at ting tager tid, og at det bedste du kan gøre for dig selv er, at lære at kunne lide processen i det. Hvis du tænker alt for meget over, hvor langt du skal nå, og hvor langsomt det går, så bliver du demotiveret.
                  </p>
                  <p className="text-gray-700">
                    I stedet kan du se det som en læringsprocess, hvor du skal lære at kunne lide den nye mad, og du skal give dig tid til at eksperimentere med en variation af Keto maden, som du kan lide. Fedtet går ingen steder lige nu, og hvis du skal af med det, er det bedste du kan gøre, at tænke langsigtet, og give dig tid til at blive glad for maden.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { 
                    icon: '🍽', 
                    title: 'Tænk ét måltid af gangen', 
                    desc: 'Hold fokus tæt på – det gør det nemt at vinde dagen.' 
                  },
                  { 
                    icon: '😋', 
                    title: 'Leg med maden, og find opskrifter, du kan lide', 
                    desc: 'Eksperimenter og find din favoritmad.' 
                  },
                  { 
                    icon: '👀', 
                    title: 'Lad nogle opskrifter gå igen', 
                    desc: 'Undgå beslutningstræthed ved at have faste go-to måltider, så du ikke skal opfinde den dybe tallerken hver dag.' 
                  },
                  { 
                    icon: '🗓', 
                    title: 'Overvej madplaner eller struktur', 
                    desc: 'Hvis du har brug for stærk struktur, kan madplaner hjælpe. Ellers brug en simpel indkøbsliste.' 
                  },
                  { 
                    icon: '💦', 
                    title: 'Hvis du utilsigtet falder i sukkermonsteret', 
                    desc: 'Tænk, at du kan gøre det bedre, men kom op på hesten med det samme igen.' 
                  }
                ].map((card, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:border-purple-200 transition-colors">
                    <div className="text-4xl mb-4">{card.icon}</div>
                    <h3 className="font-semibold text-gray-900 mb-2">{card.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Resume */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-gradient-to-br from-purple-50 to-green-50 rounded-2xl p-8 border-2 border-purple-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Resume</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>Keto mad er mere mættende mad end normalt,</strong> og dertil undertrykker den lave mængde af kulhydrater kroppens sulthormon. Dertil kommer du i ketose, hvor din fedtforbrænding er høj.
                </p>
                <p>
                  <strong>Der er 4 faser til vægttab med Keto,</strong> for at få succes med det. 1. Kend Keto, 2. Overgangssymptomer, 3. Find ro i det du laver, 4. Optimer hvor du kan.
                </p>
                <p>
                  <strong>Oplever du ikke vægttab med Keto,</strong> kan du optimere ved at 1. dyrke mere motion, 2. dyrke periodisk faste, 3. reducere til 2 måltider om dagen, 4. reducere til 1 måltid om dagen (OMAD).
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="container">
          <div className={`max-w-3xl mx-auto transition-all duration-1000 delay-1200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <HelpCircle className="w-6 h-6 text-purple-600" />
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                  Ofte stillede spørgsmål
                </h2>
              </div>
              <p className="text-lg text-gray-600">
                Svar på de spørgsmål, du måske har
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "Skal jeg tælle kalorier på Keto?",
                  a: "Ikke nødvendigvis. Brug kalorier som et fejlfindingsværktøj, ikke som førstevalg. Keto gør det ofte muligt at spise mindre uden at tælle, fordi du er mere mæt. Vi anbefaler kun kalorietælling, hvis alt andet håb er ude."
                },
                {
                  q: "Hvordan kommer jeg hurtigere i ketose?",
                  a: "Skær kulhydraterne mere ned (hold dig til 20-30 gram om dagen), prioriter protein, tilfør salt/elektrolytter og gå ture. Søvn hjælper også. Husk at kroppen skal bruge sine sukkerdepoter først, før den begynder at forbrænde fedt."
                },
                {
                  q: "Hvad hvis vægten står stille?",
                  a: "Optimer i rækkefølge: 1) bevægelse (2-4 gange om ugen), 2) periodisk faste (15-16 timer), 3) 2 daglige måltider, 4) OMAD midlertidigt. Evaluer efter hvert skridt – virker det, behøver du ikke mere."
                },
                {
                  q: "Er Keto farligt?",
                  a: "For raske personer er keto ikke farligt, men kræver forståelse og plan. Sørg for elektrolytter, vand (2-3 liter dagligt) og næring. Tal med din læge ved sygdom eller hvis du tager medicin."
                },
                {
                  q: "Hvad hvis jeg ikke oplever mindre sult?",
                  a: "Det betyder sandsynligvis, at du ikke er i ketose endnu. Løsningen er næsten altid færre kulhydrater – ikke mere fedt. Tjek om du holder dig til 20-30 gram kulhydrater om dagen."
                },
                {
                  q: "Hvor længe tager det at komme i ketose?",
                  a: "Det tager typisk 1-3 uger at komme helt i ketose og være igennem overgangssymptomerne. I starten bruger kroppen sine sukkerdepoter, derefter begynder den at forbrænde fedt og producere ketoner."
                }
              ].map((faq, idx) => (
                <details key={idx} className="bg-white rounded-xl p-6 border border-gray-200 group hover:border-purple-300 transition-colors">
                  <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between gap-4">
                    <span>{faq.q}</span>
                    <ArrowRight className="w-5 h-5 text-purple-600 transition-transform group-open:rotate-90 flex-shrink-0" />
                  </summary>
                  <p className="mt-4 text-gray-700 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-green-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"></div>
        </div>
        
        <div className="container relative">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 delay-1400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
              Klar til at komme i gang?
            </h2>
            
            <p className="text-xl text-purple-100 mb-12 max-w-2xl mx-auto leading-relaxed">
              Husk, at vi altid er klar til at hjælpe dig. Du kan bruge vores opskrifter, madplaner og guides til at komme i gang med Keto på en måde, der passer til dit liv.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link 
                href="/keto/opskrifter" 
                className="group bg-white text-purple-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Se keto opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <Link 
                href="/blog/keto" 
                className="group bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Læs keto guides
                <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
