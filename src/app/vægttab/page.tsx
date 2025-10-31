'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Users, Leaf, Brain, Zap, Sparkles, ChevronLeft, Check, X, AlertCircle, Scale, Flame, Heart, Moon, Activity, ShoppingCart, BookOpen, HelpCircle } from 'lucide-react'

export default function WeightLossPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero / Intro */}
      <section className="relative bg-gradient-to-br from-gray-50 via-green-50/30 to-blue-50/20 py-20 lg:py-28">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(34,197,94,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        </div>
        
        <div className="container relative">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 text-gray-900 leading-tight">
              Vægttab uden forvirring –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                find din vej til sund balance
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              Der findes mange veje til vægttab. Keto, Sense, LCHF eller noget helt fjerde – men grundprincipperne er altid de samme: 
              <strong className="text-gray-900"> Kalorier tæller, og kroppen har brug for næring, ikke bare færre kalorier.</strong>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="#find-din-madstil"
                className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Find din madstil
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/madbudget"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors border-2 border-gray-200"
              >
                Se næste uges madplaner
                <BookOpen className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sandheder om vægttab - Myteknuser */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                Hvorfor er vægttab så forvirrende?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Fordi alle siger noget forskelligt. Men i virkeligheden handler vægttab ikke om religion – det handler om forståelse.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  myth: "Du kan tabe dig uden at tænke på kalorier",
                  truth: "Kalorier betyder stadig noget – uanset hvilken kostretning du følger. Men næringsrig mad gør dig mere mæt, så du naturligt spiser mindre.",
                  icon: Scale
                },
                {
                  myth: "Du kan snyde kroppen med quick fixes",
                  truth: "Du kan ikke snyde kroppen – men du kan forstå den. Mæthedshormoner, stofskifte og vaner styrer alt.",
                  icon: Brain
                },
                {
                  myth: "Mindre mad = automatisk vægttab",
                  truth: "Det handler ikke om at spise mindre – men smartere. 500 kcal fra grøntsager fylder anderledes end 500 kcal fra hvidt brød.",
                  icon: Leaf
                },
                {
                  myth: "Den bedste kost er den, der virker for alle",
                  truth: "Den bedste kost er den, du faktisk kan leve med. Konsistens slår perfektion hver gang.",
                  icon: Heart
                }
              ].map((item, idx) => (
                <div key={idx} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <X className="w-6 h-6 text-red-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{item.myth}</h3>
                      <div className="flex items-start gap-3 mt-3 pt-3 border-t border-gray-200">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-gray-700 leading-relaxed">{item.truth}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* De grundlæggende principper */}
      <section className="py-20 bg-gradient-to-br from-green-50/50 via-white to-blue-50/50">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                De grundlæggende principper
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Der findes tusind veje, men de bygger alle på de samme mekanismer
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "Kalorier betyder noget",
                  description: "Kroppen taber sig, når du indtager mindre energi, end du forbruger. Det er fysik, ikke magi.",
                  icon: Scale,
                  color: "green"
                },
                {
                  title: "Madkvalitet betyder også noget",
                  description: "Jo mere næringsrig mad, jo nemmere er det at holde kroppen stærk, mæt og stabil.",
                  icon: Leaf,
                  color: "green"
                },
                {
                  title: "Madens densitet tæller",
                  description: "500 kcal fra grøntsager og fisk fylder anderledes end 500 kcal fra hvidt brød og olie.",
                  icon: Target,
                  color: "blue"
                },
                {
                  title: "Vaner styrer alt",
                  description: "Det er ikke de enkelte måltider, men mønstrene over tid, der bestemmer resultatet.",
                  icon: Zap,
                  color: "orange"
                }
              ].map((principle, idx) => {
                const colorClasses = {
                  green: "bg-green-100 text-green-600 border-green-200",
                  blue: "bg-blue-100 text-blue-600 border-blue-200",
                  orange: "bg-orange-100 text-orange-600 border-orange-200"
                }
                return (
                  <div key={idx} className="bg-white rounded-2xl p-6 border-2 hover:shadow-lg transition-all">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 border-2 ${colorClasses[principle.color as keyof typeof colorClasses]}`}>
                      <principle.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">{principle.title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{principle.description}</p>
                  </div>
                )
              })}
            </div>

            {/* Placeholder for illustration */}
            <div className="mt-12 bg-white rounded-2xl p-8 border-2 border-dashed border-gray-300 text-center">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-gray-500 text-sm">Illustration: Infografik der viser energiindtag vs. energiforbrug, med "madens kvalitet" som balancepunkt</p>
            </div>
          </div>
        </div>
      </section>

      {/* Hvordan mad påvirker vægten */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                Hvordan mad påvirker vægten
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Når du spiser, sender kroppen signaler gennem hormoner, der styrer mæthed, energi og lyst
              </p>
                </div>
                
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Øger mæthed</h3>
                </div>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Protein</strong> sender stærke mæthedssignaler og bruger energi til at forbrænde</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Fiber</strong> fylder maven og sænker blodsukkeret langsomt</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Fedt</strong> holder dig mæt længe og stabiliserer energi</span>
                  </li>
                </ul>
                </div>
                
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-8 border border-red-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                    <X className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Reducerer mæthed</h3>
                </div>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Sukker</strong> skaber blodsukkertoppe og -daler, der giver sult</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Ultraforarbejdet mad</strong> er designet til at spise mere af</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Emotionel spising</strong> ignorerer kroppens mæthedssignaler</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Placeholder for søvn/stress/motion illustration */}
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { icon: Moon, title: "Søvn", desc: "Påvirker appetit og forbrænding" },
                { icon: Heart, title: "Mad", desc: "Styrer hormoner og mæthed" },
                { icon: AlertCircle, title: "Stress", desc: "Øger kortisol og appetit" },
                { icon: Activity, title: "Bevægelse", desc: "Øger forbrænding og humør" }
              ].map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-6 text-center border border-gray-200">
                    <item.icon className="w-8 h-8 mx-auto mb-3 text-green-600" />
                  <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
                    </div>
                  </div>
      </section>

      {/* Find din madniche */}
      <section id="find-din-madstil" className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                Find den madstil, der passer til dit liv
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Alle kostretninger kan virke – men kun, hvis du kan leve med dem
              </p>
                    </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  name: "Keto",
                  icon: "🥑",
                  short: "Lav-kulhydrat, høj-fedt",
                  href: "/keto"
                },
                {
                  name: "Sense",
                  icon: "🧠",
                  short: "Danske kostråd",
                  href: "/sense"
                },
                {
                  name: "LCHF/Paleo",
                  icon: "🥩",
                  short: "Naturlig kost",
                  href: "/lchf-paleo"
                },
                {
                  name: "Anti-inflammatorisk",
                  icon: "🌿",
                  short: "Mod inflammation",
                  href: "/anti-inflammatory"
                },
                {
                  name: "Fleksitarisk",
                  icon: "🥬",
                  short: "Plantebaseret",
                  href: "/flexitarian"
                },
                {
                  name: "5:2 Diæt",
                  icon: "⏰",
                  short: "Intermittent fasting",
                  href: "/5-2-diet"
                },
                {
                  name: "Familiemad",
                  icon: "👨‍👩‍👧‍👦",
                  short: "Hele familien",
                  href: "/familie"
                },
                {
                  name: "Meal Prep",
                  icon: "📦",
                  short: "Planlagt mad",
                  href: "/opskrifter/meal-prep"
                }
              ].map((niche, idx) => (
                <Link
                  key={idx}
                  href={niche.href}
                  className="block bg-white rounded-2xl p-6 border-2 border-gray-100 text-center hover:border-green-200 hover:shadow-xl transition-all group"
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{niche.icon}</div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors mb-2">{niche.name}</h3>
                  <p className="text-sm text-gray-500 group-hover:text-green-500 transition-colors">{niche.short}</p>
                </Link>
              ))}
            </div>
                    </div>
        </div>
      </section>

      {/* Sådan taber du dig - Kalorietracker */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                Sådan taber du dig
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Vægttab handler om kalorieunderskud, men også om at spise rigtigt
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start">
              {/* Left: Calorie Tracker */}
              <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Kalorieunderskud</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Kalorier ind</span>
                      <span className="text-lg font-bold text-red-600">1.800</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full" style={{ width: '82%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Kalorier ud</span>
                      <span className="text-lg font-bold text-green-600">2.200</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Underskud</span>
                      <span className="text-lg font-bold text-blue-600">400</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: '18%' }}></div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <strong className="text-gray-900">500 kalorier underskud dagligt = 0,5 kg vægttab om ugen</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Explanations */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Vægttab handler om <span className="text-green-600">kalorieunderskud</span>
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-6">
                    Men det handler også om at spise rigtigt – så kroppen får de næringsstoffer den har brug for.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-green-50 border-2 border-green-100 rounded-xl p-6">
                    <h4 className="font-semibold text-green-800 mb-2">Kalorieunderskud</h4>
                    <p className="text-green-700 text-sm leading-relaxed">
                      Spis færre kalorier end du forbrænder. 500 kalorier underskud dagligt = 0,5 kg vægttab om ugen.
                    </p>
                  </div>
                  <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-6">
                    <h4 className="font-semibold text-blue-800 mb-2">Næringsrig mad</h4>
                    <p className="text-blue-700 text-sm leading-relaxed">
                      Vælg mad der giver dig vitaminer, mineraler og protein – ikke bare tomme kalorier.
                    </p>
                  </div>
                  <div className="bg-purple-50 border-2 border-purple-100 rounded-xl p-6">
                    <h4 className="font-semibold text-purple-800 mb-2">Bæredygtig tilgang</h4>
                    <p className="text-purple-700 text-sm leading-relaxed">
                      Find en mad-ideologi du kan følge resten af livet – ikke bare en hurtig kur.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FunctionalFoods positioning */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                Vil du bruge værktøjer, der gør det nemmere?
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Når du forstår principperne, handler det bare om at gøre dem mulige i praksis
              </p>
                  </div>
                  
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-3xl p-8 md:p-12 border-2 border-green-200 mb-8">
              <div className="grid md:grid-cols-4 gap-6 mb-8">
                {[
                  { icon: Target, label: "Planlægning" },
                  { icon: BookOpen, label: "Overblik" },
                  { icon: ShoppingCart, label: "Opskrifter" },
                  { icon: Zap, label: "Indkøb" }
                ].map((item, idx) => (
                  <div key={idx} className="text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
                      <item.icon className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <p className="text-lg text-gray-800 mb-6 leading-relaxed">
                  <strong>FunctionalFoods</strong> samler opskrifter, tilbud og madplaner fra mange kostretninger og gør det let at spise sundt uden at bruge mere tid eller penge.
                </p>
                <p className="text-gray-600 text-sm mb-8">
                  Men du kan sagtens bruge alt, du har lært her – helt uden os.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/madbudget"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                  >
                    Se madbudget system
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/opskriftsoversigt"
                    className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors border-2 border-gray-200"
                  >
                    Se alle opskrifter
                    <BookOpen className="w-5 h-5" />
                  </Link>
                </div>
              </div>

              {/* Placeholder for madplan mockup */}
              <div className="mt-8 bg-white rounded-xl p-6 border-2 border-dashed border-gray-300 text-center">
                <p className="text-gray-500 text-sm">Neutralt screenshot/mockup af en madplan – ikke reklame, men kontekst</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vægttab handler om mere end mad */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="container">
          <div className={`max-w-4xl mx-auto transition-all duration-1000 delay-1200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                Vægttab handler om mere end mad
            </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                En holistisk tilgang til sund balance
            </p>
          </div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "Søvn og stress",
                  description: "Påvirker vægten. Dårlig søvn øger kortisol, der øger appetit og fedtlagring. Stress gør det samme.",
                  icon: Moon
                },
                {
                  title: "Bevægelse",
                  description: "Øger forbrænding og humør. Du behøver ikke træne hårdt – bare blive i bevægelse regelmæssigt.",
                  icon: Activity
                },
                {
                  title: "Vaner",
                  description: "Gør resultaterne holdbare. Det er ikke en diæt, det er en livsstil. Små, konsekvente ændringer slår store, uholdbare.",
                  icon: Zap
                },
                {
                  title: "Realistiske mål",
                  description: "Det er en rejse, ikke et quick fix. Vægttab tager tid. Accepter det, så bliver det nemmere.",
                  icon: Target
                }
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 border-2 border-gray-100 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
              </div>
          </div>
        </div>
      </section>

      {/* Vælg din vej til vægttab - All Niches */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-1300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                Vælg din vej til vægttab
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Hver mad-ideologi har sin egen tilgang til vægttab. Find den der passer til dig.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { name: 'Keto', icon: '🥑', href: '/keto', description: 'Lav-kulhydrat, høj-fedt' },
                { name: 'Sense', icon: '🧠', href: '/sense', description: 'Danske kostråd' },
                { name: 'LCHF/Paleo', icon: '🥩', href: '/lchf-paleo', description: 'Naturlig kost' },
                { name: 'Anti-inflammatorisk', icon: '🌿', href: '/anti-inflammatory', description: 'Mod inflammation' },
                { name: 'Fleksitarisk', icon: '🥬', href: '/flexitarian', description: 'Plantebaseret' },
                { name: '5:2 Diæt', icon: '⏰', href: '/5-2-diet', description: 'Intermittent fasting' },
                { name: 'Familiemad', icon: '👨‍👩‍👧‍👦', href: '/familie', description: 'Hele familien' },
                { name: 'Meal Prep', icon: '📦', href: '/opskrifter/meal-prep', description: 'Planlagt mad' }
              ].map((category, index) => (
                <Link
                  key={category.name}
                  href={category.href}
                  className="group bg-white border-2 border-gray-100 rounded-2xl p-6 text-center hover:border-green-200 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-500 transform hover:-translate-y-2"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {category.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors mb-2">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-500 group-hover:text-green-500 transition-colors">
                    {category.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="container">
          <div className={`max-w-3xl mx-auto transition-all duration-1000 delay-1400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <HelpCircle className="w-6 h-6 text-green-600" />
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
                  q: "Skal jeg tælle kalorier for at tabe mig?",
                  a: "Nej – men du skal forstå dem. Det er forskellen. Nogle kan tabe sig uden at tælle, andre har brug for præcision. Find din vej."
                },
                {
                  q: "Hvilken kostretning er bedst?",
                  a: "Den, der passer til dit liv. Keto, Sense, LCHF – alle kan virke, hvis du kan leve med dem. Det handler om konsistens, ikke perfektion."
                },
                {
                  q: "Hvordan holder jeg vægten bagefter?",
                  a: "Ved at lære dine vaner at kende og finde en rytme, du kan leve med. Det er ikke en diæt, det er en livsstil."
                },
                {
                  q: "Hvad hvis jeg ikke kan lide at træne?",
                  a: "Bevægelse hjælper, men mad er vigtigst. Start med at gå en tur hver dag. Det behøver ikke være hårdt for at virke."
                },
                {
                  q: "Hvordan kombinerer jeg vægttab og familieliv?",
                  a: "Find en kost, der passer til hele familien. Meal prep, planlægning og at gøre det praktisk er nøglen. Det er ikke perfektion, det er konsistens."
                }
              ].map((faq, idx) => (
                <details key={idx} className="bg-gray-50 rounded-xl p-6 border border-gray-200 group">
                  <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between gap-4">
                    <span>{faq.q}</span>
                    <ArrowRight className="w-5 h-5 text-green-600 transition-transform group-open:rotate-90 flex-shrink-0" />
                  </summary>
                  <p className="mt-4 text-gray-700 leading-relaxed">{faq.a}</p>
                </details>
              ))}
              </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]"></div>
        </div>
        
        <div className="container relative">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 delay-1600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white leading-tight">
              Start din rejse mod sundt vægttab i dag
            </h2>
            
            <p className="text-xl text-green-100 mb-12 max-w-2xl mx-auto leading-relaxed">
              Find den kost, der passer til dit liv, og gør vægttab praktisk og realistisk.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link 
                href="/madbudget" 
                className="group bg-white text-green-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Byg din madplan
                <ShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </Link>
              
              <Link 
                href="/opskriftsoversigt" 
                className="group bg-white/20 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/30 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Se alle opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
              {[
                { label: "Opskrifter", href: "/opskriftsoversigt" },
                { label: "Dagligvarer", href: "/dagligvarer" },
                { label: "Madbudget", href: "/madbudget" },
                { label: "Guides & Blogs", href: "/opskriftsoversigt" }
              ].map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl p-4 text-white font-medium transition-all text-sm"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
