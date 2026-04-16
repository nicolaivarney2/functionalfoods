'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, Sparkles, Store } from 'lucide-react'

export default function AboutFunctionalFoods() {
  return (
    <section className="py-12 bg-green-50">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="relative">
            <div className="aspect-square relative rounded-lg overflow-hidden border border-emerald-100 shadow-sm bg-white">
              <Image
                src="/billeder/andet/nicolai-om-os-founder.png"
                alt="Stifter af Functional Foods"
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Om Functional Foods</h2>

            <p className="text-gray-700 leading-relaxed">
              Vi bygger værktøjer der tager udgangspunkt i danske butikker, rigtige priser og den hverdag du faktisk lever i – ikke i perfekte slides. Functional Foods er vokset fra keto-fokus til en bredere platform med madplaner, madbudget og opskrifter på tværs af flere kostretninger.
            </p>

            <p className="text-gray-700 leading-relaxed">
              Målet er at fjerne friktionen mellem dig og de valg du alligevel vil træffe: færre regneark, mere mad der kan laves med det udvalg og de tilbud du møder i butikken.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="flex items-center space-x-3">
                <Store size={20} className="text-green-600 shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">Tæt på butikken</div>
                  <div className="text-sm text-gray-600">Planer der taler med tilbud</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Sparkles size={20} className="text-green-600 shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">Madbudget &amp; plan</div>
                  <div className="text-sm text-gray-600">Struktur uden støj</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <BookOpen size={20} className="text-green-600 shrink-0" />
                <div>
                  <div className="font-medium text-gray-900">Opskrifter &amp; viden</div>
                  <div className="text-sm text-gray-600">Indhold du kan bruge</div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/bag-om-ff"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Læs mere om Functional Foods
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
