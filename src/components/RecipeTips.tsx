'use client'

import { Lightbulb } from 'lucide-react'

interface RecipeTipsProps {
  tips: string[]
  dietaryCategory: string
}

export default function RecipeTips({ tips, dietaryCategory }: RecipeTipsProps) {
  const defaultTips = [
    `Denne ${dietaryCategory} opskrift er perfekt til at holde dig mæt og tilfreds.`,
    'Du kan nemt tilpasse opskriften ved at ændre mængden af krydderier efter din smag.',
    'Gem rester i køleskabet i op til 3 dage for en hurtig frokost eller aftensmad.',
    'Frys rester ned i portioner for en hurtig måltid senere på ugen.',
    'Server med friske grøntsager for at øge næringsværdien yderligere.'
  ]

  const displayTips = tips.length > 0 ? tips : defaultTips

  return (
    <div className="bg-green-50 rounded-lg p-6 space-y-4">
      <div className="flex items-center space-x-2">
        <Lightbulb size={20} className="text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">Mine tips til opskriften</h3>
      </div>
      
      <div className="space-y-3">
        {displayTips.map((tip, index) => (
          <div key={index} className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-gray-700 leading-relaxed">{tip}</p>
          </div>
        ))}
      </div>

      {/* SEO Content */}
      <div className="mt-6 pt-4 border-t border-green-200">
        <h4 className="font-medium text-gray-900 mb-2">Hvorfor vælge denne {dietaryCategory} opskrift?</h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          {dietaryCategory} diæten fokuserer på at reducere kulhydrater og øge indtaget af sunde fedtstoffer. 
          Dette hjælper kroppen med at brænde fedt i stedet for kulhydrater som primær energikilde. 
          Denne opskrift er designet til at understøtte din {dietaryCategory} livsstil og hjælpe dig med at nå dine sundhedsmål.
        </p>
      </div>
    </div>
  )
} 