'use client'

import Image from 'next/image'
import { Users, BookOpen, Target } from 'lucide-react'

export default function AboutFunctionalFoods() {
  return (
    <section className="py-12 bg-green-50">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Image Section */}
          <div className="relative">
            <div className="aspect-square rounded-lg overflow-hidden">
              <Image
                src="/images/recipes/kyllingesalat-med-et-pift-af-vandmlon-5e10163b.jpeg"
                alt="Functional Foods Team"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>

          {/* Content Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Om Functional Foods</h2>
            
            <p className="text-gray-700 leading-relaxed">
              Vi er et team af madentusiaster og sundhedseksperter, der brænder for at hjælpe dig med at leve en sundere livsstil gennem funktionelle fødevarer. Vores mission er at gøre det nemt og lækkert at følge en keto-venlig diæt.
            </p>
            
            <p className="text-gray-700 leading-relaxed">
              Alle vores opskrifter er testet i vores eget køkken og tilpasset til at understøtte din sundhed og velvære. Vi fokuserer på kvalitetsråvarer og smagfulde kombinationer, der holder dig mæt og tilfreds.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="flex items-center space-x-3">
                <Users size={20} className="text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Testet</div>
                  <div className="text-sm text-gray-600">Alle opskrifter</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Target size={20} className="text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Keto-venlig</div>
                  <div className="text-sm text-gray-600">Lav kulhydrat</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <BookOpen size={20} className="text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Edukativ</div>
                  <div className="text-sm text-gray-600">Lær om sundhed</div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <button className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors">
                Læs mere om Functional Foods
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 