'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Users, Leaf, Brain, Zap, Sparkles, ChevronLeft, Check, X, AlertCircle, Scale, Flame, Heart, Moon, Activity, ShoppingCart, BookOpen, HelpCircle, Search, ChevronDown, ChevronRight } from 'lucide-react'

export default function WeightLossPage() {
  const [isVisible, setIsVisible] = useState(false)
  const [openNiche, setOpenNiche] = useState<string | null>(null)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Content */}
      <section className="relative bg-gradient-to-br from-gray-50 via-green-50/30 to-blue-50/20 py-20 lg:py-28">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(34,197,94,0.1),transparent_50%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_50%)]"></div>
        </div>
        
        <div className="container relative">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 text-gray-900 leading-tight">
              Vægttab uden forvirring –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                find din vej til sund balance
              </span>
            </h2>
            
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
      <section className="py-20 bg-gray-50">
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
                  myth: "Du kan tabe dig uden at TÆNKE på kalorier",
                  truth: "Kalorier betyder stadig noget – uanset hvilken kostretning du følger. Men næringsrig mad gør dig mere mæt, så du naturligt spiser mindre.",
                  icon: Scale
                },
                {
                  myth: "Du kan ikke snyde kroppen med quick fixes",
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
      <section className="py-20 bg-white">
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
      <section className="py-20 bg-gray-50">
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
      <section id="find-din-madstil" className="py-20 bg-gray-50">
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
      <section className="py-20 bg-white">
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
      <section className="py-20 bg-gray-50">
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
      <section className="py-20 bg-white">
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

            {/* CTA: Mentalt / adfærd og vaner */}
            <div className="mt-10">
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6 sm:p-8 border border-green-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div className="max-w-2xl">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      Vægttab starter i hovedet – ikke kun på tallerkenen
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      Har du brug for at lære mere om adfærd, vægttab og hvordan vores mentalitet og vaner spiller med (eller imod) vores mål om vægttab?
                      Så gå til <span className="font-semibold">Adfærd og vaner</span>.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Link
                      href="/blog/mentalt"
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors w-full sm:w-auto"
                    >
                      Adfærd og vaner
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Find din madideologi - Detaljeret */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 delay-1300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
                Find din madideologi
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Hver mad-ideologi har sin egen tilgang til vægttab. Her får du en dybdegående vejledning til de forskellige måder at tabe sig på. Find den der passer til dit liv.
              </p>
            </div>

            <div className="space-y-12">
              {/* Keto */}
              <div className="bg-gradient-to-br from-green-50/50 to-white rounded-2xl p-8 md:p-10 border-2 border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-5xl flex-shrink-0">🥑</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Keto – lav kulhydrat, høj fedt (og protein!)</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      En kost, der minimerer kulhydrater og i stedet bruger fedt som primær energikilde. Kroppen går i "ketose", hvor den forbrænder fedt mere effektivt. Effektiv til vægttab og stabilt blodsukker – men kræver struktur og tilpasning.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-6">
                      Keto er nogle gange radikal, idet nogen ville argumentere, at den er svær at tilpasse i et travlt dansk liv. Vi oplever, at Keto er effektivt til vægttab, særligt hvis det praktisere periodisk og ikke bliver overkompliceret. Hvis du vil prøve Keto, så start i vores keto-sektion.
                    </p>
                    <Link
                      href="/keto"
                      className="inline-flex items-center gap-2 text-green-600 font-semibold hover:text-green-700 transition-colors group"
                    >
                      Er du interesseret i mere, så læs om Keto
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Sense */}
              <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-2xl p-8 md:p-10 border-2 border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-5xl flex-shrink-0">🧠</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Sense – dansk spiseforståelse</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      Udviklet af Suzy Wengel og baseret på håndflademodellen. Sense handler ikke om forbud, men om balance og portionsstørrelser, der giver mæthed og frihed. Nem at følge i hverdagen og passer til almindelig mad.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-6">
                      Sense har sine egne spilleregler, du skal sætte dig ind i, for at kunne leve på Sense i en periode. Her er et godt community vigtigt (se vores reddit eller find Suzy's på Facebook). Er Sense noget for dig, så har vi en hel Sense sektion, du er velkommen til at bladre i.
                    </p>
                    <Link
                      href="/sense"
                      className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors group"
                    >
                      Er du interesseret i mere, så læs om Sense
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* LCHF & Paleo */}
              <div className="bg-gradient-to-br from-orange-50/50 to-white rounded-2xl p-8 md:p-10 border-2 border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-5xl flex-shrink-0">🥩</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">LCHF & Paleo – naturlig kost</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      Begge fokuserer på at spise ren og uforarbejdet mad. LCHF reducerer kulhydrater og øger fedt, mens Paleo tager udgangspunkt i mad som før landbruget – kød, grønt, nødder og rene råvarer. Ideelt for dem, der ønsker "ægte mad" uden tilsætninger, hvor vægttab kommer som en bivirkning af sund kost.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-6">
                      LCHF og Paleo er effektivt til vægttab, men har, ligesom Keto, nogle faldgrupper, da rigtig mad ofte også har mange kalorier. Maden har en høj densitet (mæthedsfornemmelse), og med den rette vejledning, kan det føre til stort vægttab og en sund og stærk krop.
                    </p>
                    <Link
                      href="/lchf-paleo"
                      className="inline-flex items-center gap-2 text-orange-600 font-semibold hover:text-orange-700 transition-colors group"
                    >
                      Er du interesseret i mere, så læs om LCHF & Paleo
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Anti-inflammatorisk */}
              <div className="bg-gradient-to-br from-emerald-50/50 to-white rounded-2xl p-8 md:p-10 border-2 border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-5xl flex-shrink-0">🌿</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Anti-inflammatorisk kost – ro i kroppen</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      Fokuserer på fødevarer, der dæmper inflammation i kroppen – fx grøntsager, fisk, bær, olivenolie og fuldkorn. Kan understøtte energi, restitution og generel sundhed. Handler mere om velvære end vægttab, men bidrager ofte positivt til begge dele.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-6">
                      At leve anti-inflammatorisk er et opgør med nogle af nutidens mad-vaner, der er blevet formet af globale fødevaregiganter. En anti-inflammatorisk kost giver som regel vægttab som et afkast, fordi man undgår madvarer der påvirker kroppen negativt. Det giver mere overskud og langt mere velvære, som gør vægttab nemmere.
                    </p>
                    <Link
                      href="/anti-inflammatory"
                      className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors group"
                    >
                      Er du interesseret i mere, så læs om anti-inflammatorisk kost
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Fleksitarisk */}
              <div className="bg-gradient-to-br from-green-50/50 to-white rounded-2xl p-8 md:p-10 border-2 border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-5xl flex-shrink-0">🥬</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Fleksitarisk – primært plantebaseret</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      Overvejende vegetarisk, men med plads til fisk og kød i mindre mængder. God for både klima og sundhed – og let at tilpasse til forskellige livsstile. Her er fokus på variation, fibre og grøn mæthed.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-6">
                      Fleksitarisk mad kan derfor både være med kød og uden kød. Vi har opskrifter med begge, men da vi (hos functionalfoods) ser kød som en naturligvis del af en sund kost, har vi fokus på periodisk kød i kosten. Der er plads til alle holdninger hos os, og med vores fleksitariske opskrifter har du mulighed for at leve sundt, billigt og grønt.
                    </p>
                    <Link
                      href="/flexitarian"
                      className="inline-flex items-center gap-2 text-green-600 font-semibold hover:text-green-700 transition-colors group"
                    >
                      Er du interesseret i mere, så læs om fleksitarisk kost
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* 5:2 Diæt */}
              <div className="bg-gradient-to-br from-purple-50/50 to-white rounded-2xl p-8 md:p-10 border-2 border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-5xl flex-shrink-0">⏰</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">5:2 Diæt – spis i rytme</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      En form for intermittent fasting, hvor du spiser normalt fem dage om ugen og reducerer kalorieindtaget markant to dage. 5:2 kuren kan hjælpe med kalorieunderskud og bedre appetitkontrol. Det kræver lidt planlægning, men er fleksibel og enkel i praksis.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-6">
                      5:2 som koncept er en kur, men er også en metode til bedre vægttab og fasteperioder der styrker sundhed og vægttab generelt. Vi er stor fan af 5:2 som redskab, og for mange, er det også en konkret og simpel måde at smide et par overflødige kilo. Vores madbudget funktion tilbyder madplaner (med indkøbsliste) der er målrettet 5:2.
                    </p>
                    <Link
                      href="/5-2-diet"
                      className="inline-flex items-center gap-2 text-purple-600 font-semibold hover:text-purple-700 transition-colors group"
                    >
                      Er du interesseret i mere, så læs om 5:2 Diæt
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Meal Prep */}
              <div className="bg-gradient-to-br from-gray-50/50 to-white rounded-2xl p-8 md:p-10 border-2 border-gray-100 hover:shadow-xl transition-shadow">
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-5xl flex-shrink-0">📦</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Meal Prep – planlagt mad, mindre stress</h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      Kernen er forberedelse: Lav maden én gang, spis flere gange. Generelt sparer du tid, penge og beslutninger i hverdagen – og gør det lettere at holde kursen. Den er velegnet til alle kosttyper og mål, og bruges mest som metode.
                    </p>
                    <p className="text-gray-700 leading-relaxed mb-6">
                      Gennem vores koncept, fokuserer vi på at mindske stress og generelt madlavningen, som kan give tid til træning og andre ting. Vores meal prep funktion fokuserer på familiemad-kategorien, hvorfor der ikke er det samme fokus på vægttab som ved de andre madvaner.
                    </p>
                    <Link
                      href="/opskrifter/meal-prep"
                      className="inline-flex items-center gap-2 text-gray-700 font-semibold hover:text-gray-900 transition-colors group"
                    >
                      Er du interesseret i mere, så læs om Meal Prep
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
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
