'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, Target, TrendingDown, Users, Leaf, Brain, Zap, Sparkles } from 'lucide-react'

export default function WeightLossPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <main className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-white via-green-50/30 to-blue-50/20 py-24 lg:py-32">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse">
              <TrendingDown className="w-4 h-4" />
              Vægttab gennem intelligent mad
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-8 text-gray-900 leading-tight">
              Tab dig sundt –<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                ikke bare hurtigt
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-gray-600 max-w-4xl mx-auto leading-relaxed">
              Vægttab starter med <strong>næring – ikke afsavn</strong>.<br />
              Vælg din mad-ideologi og lad kroppen naturligt finde sin balance.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Baseret på videnskab • Bæredygtigt • Gratis
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Appeal Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`text-center mb-16 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Vælg din vej til vægttab
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
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
              { name: 'Meal Prep', icon: '📦', href: '/meal-prep', description: 'Planlagt mad' }
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
      </section>

      {/* General Weight Loss Info Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-green-50/30">
        <div className="container">
          <div className={`text-center mb-16 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Sådan taber du dig
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Vægttab handler om kalorieunderskud, men også om at spise rigtigt.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-green-500/10 border border-green-100">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Kalorieunderskud</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Kalorier ind</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-16 h-2 bg-red-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">1.800</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Kalorier ud</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-20 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">2.200</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Underskud</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div className="w-12 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">400</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`transition-all duration-1000 delay-900 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 leading-tight">
                Vægttab handler om 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                  kalorieunderskud
                </span>
              </h2>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Men det handler også om at spise rigtigt – så kroppen får de næringsstoffer den har brug for.
              </p>
              
              <div className="space-y-6">
                <div className="bg-green-100 border border-green-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-green-800 mb-2">Kalorieunderskud</h4>
                  <p className="text-green-700">Spis færre kalorier end du forbrænder. 500 kalorier underskud dagligt = 0,5 kg vægttab om ugen.</p>
                </div>
                
                <div className="bg-blue-100 border border-blue-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-blue-800 mb-2">Næringsrig mad</h4>
                  <p className="text-blue-700">Vælg mad der giver dig vitaminer, mineraler og protein – ikke bare tomme kalorier.</p>
                </div>
                
                <div className="bg-purple-100 border border-purple-200 rounded-2xl p-6">
                  <h4 className="font-semibold text-purple-800 mb-2">Bæredygtig tilgang</h4>
                  <p className="text-purple-700">Find en mad-ideologi du kan følge resten af livet – ikke bare en hurtig kur.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Science Section */}
      <section className="py-20 bg-white">
        <div className="container">
          <div className={`text-center mb-16 transition-all duration-1000 delay-1100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Videnskaben bag vægttab
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Vægttab er ikke kompliceret – men det kræver forståelse for hvordan kroppen fungerer.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Brain className="w-8 h-8" />,
                title: "Metabolismen",
                description: "Din krop forbrænder kalorier hele tiden – også når du sover. Styrk din muskelmasse for at øge dit daglige kalorieforbrug.",
                color: "bg-blue-500"
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Insulin",
                description: "Insulin styrer fedtlagring. Lav-kulhydrat diæter som keto kan hjælpe med at stabilisere blodsukkeret og reducere fedtlagring.",
                color: "bg-green-500"
              },
              {
                icon: <Leaf className="w-8 h-8" />,
                title: "Inflammation",
                description: "Kronisk inflammation kan gøre vægttab sværere. Anti-inflammatorisk kost kan hjælpe kroppen med at fungere optimalt.",
                color: "bg-emerald-500"
              }
            ].map((item, index) => (
              <div
                key={item.title}
                className="bg-white border-2 border-gray-100 rounded-2xl p-8 hover:border-green-200 hover:shadow-xl hover:shadow-green-500/10 transition-all duration-500 transform hover:-translate-y-2"
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center text-white mb-6`}>
                  {item.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5"></div>
        </div>
        
        <div className="container relative">
          <div className={`text-center transition-all duration-1000 delay-1300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white leading-tight">
              Start din vægttabsrejse i dag –<br />
              <span className="text-green-200">helt gratis</span>
            </h2>
            
            <p className="text-xl text-green-100 mb-12 max-w-3xl mx-auto">
              Vælg din mad-ideologi og få adgang til opskrifter, der hjælper dig med at tabe dig sundt og bæredygtigt.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/opskriftsoversigt" 
                className="group bg-white text-green-600 px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2"
              >
                Udforsk alle opskrifter
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <div className="text-green-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span>Alle beregnet på næring</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
