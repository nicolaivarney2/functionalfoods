'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ShoppingBagIcon, ChartBarIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { dietaryFactory } from '@/lib/dietary-system';
import { pdfGenerator } from '@/lib/pdf-system';

interface MealPlanPreviewProps {
  mealPlan: any;
  onClose: () => void;
}

const MealPlanPreview: React.FC<MealPlanPreviewProps> = ({ mealPlan, onClose }) => {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfGenerationError, setPdfGenerationError] = useState<string | null>(null);

  if (!mealPlan) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-red-600 text-2xl">❌</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Meal Plan Available</h3>
            <p className="text-gray-600 mb-4">Please generate a meal plan first.</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentWeek = mealPlan.weeks[selectedWeek];
  const userProfile = mealPlan.userProfile;
  const dietaryApproachName = dietaryFactory.getDiet(mealPlan.dietaryApproach.id)?.name;
  const shoppingList = currentWeek.shoppingList;

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    setPdfGenerationError(null);
    
    try {
      // Mock user profile - in real app this would come from wizard state
      const userProfile = {
        name: 'John Doe',
        age: 35,
        gender: 'male',
        currentWeight: 80,
        targetWeight: 70,
        height: 175,
        activityLevel: 'moderate',
        dietaryApproach: mealPlan.dietaryApproach?.id || 'keto'
      };

      const result = await pdfGenerator.generateMealPlanPDF(
        'user-123',
        'meal-plan-456',
        mealPlan,
        userProfile,
        {
          quality: 'premium',
          format: 'a4',
          includeSections: ['cover', 'user-profile', 'meal-plan', 'shopping-list', 'nutrition-guide', 'progress-tracking', 'educational-content']
        }
      );

      if (result.success) {
        // In a real app, you would trigger download or show success message
        alert('PDF generated successfully! This would download your personalized meal plan book.');
      } else {
        setPdfGenerationError(result.error || 'Failed to generate PDF');
      }
    } catch (error) {
      setPdfGenerationError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FEFDF8] via-[#FEFDF8] to-[#87A96B]/5">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Plan Highlights */}
        <motion.div 
          className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Din personlige 6-ugers vægttabsplan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-[#1B365D]/10 to-[#87A96B]/10 rounded-lg">
              <div className="text-2xl mb-2">⚖️</div>
              <h3 className="font-semibold text-gray-900 mb-1">Designet til vægttab</h3>
              <p className="text-sm text-gray-600">Forventet vægttab: {Math.round((userProfile.weight || 80) * 0.06)} kg over 6 uger</p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-[#87A96B]/10 to-[#D4AF37]/10 rounded-lg">
              <div className="text-2xl mb-2">🥗</div>
              <h3 className="font-semibold text-gray-900 mb-1">Ernæringsmæssigt optimal</h3>
              <p className="text-sm text-gray-600">Højt indhold af omega-3, protein og antioxidanter denne uge</p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-[#D4AF37]/10 to-[#1B365D]/10 rounded-lg">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-semibold text-gray-900 mb-1">Baseret på {dietaryApproachName}</h3>
              <p className="text-sm text-gray-600">Tilpasset til dine præferencer og mål</p>
            </div>
          </div>
        </motion.div>

        {/* Meal Plan Section */}
        <motion.div 
          className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Din ugeplan</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowShoppingList(!showShoppingList)}
                className="flex items-center space-x-2 px-4 py-2 bg-[#1B365D] text-white rounded-lg hover:bg-[#1B365D]/90 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
                <span>{showShoppingList ? 'Skjul indkøbsliste' : 'Vis indkøbsliste'}</span>
              </button>
              
              <button
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#87A96B] to-[#D4AF37] text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Genererer PDF...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {mealPlan.weeks[0].days.map((day: any, dayIndex: number) => (
              <motion.div
                key={dayIndex}
                className="bg-gray-50 rounded-lg p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIndex * 0.1, duration: 0.4 }}
              >
                <h4 className="font-semibold text-gray-900 mb-3 text-center">
                  {['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'][dayIndex]}
                </h4>
                
                <div className="space-y-3">
                  {day.meals.map((meal: any, mealIndex: number) => (
                    <div key={mealIndex} className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="flex items-center space-x-3 mb-2">
                        {meal.recipe.images && meal.recipe.images.length > 0 ? (
                          <img 
                            src={meal.recipe.images[0]} 
                            alt={meal.recipe.title}
                            className="w-8 h-8 rounded object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-sm">
                            🍽️
                          </div>
                        )}
                        <span className="text-xs text-gray-500 font-medium">
                          {['Morgenmad', 'Frokost', 'Aftensmad'][mealIndex]}
                        </span>
                      </div>
                      <h5 className="text-sm font-medium text-gray-900 mb-1">
                        {meal.recipe.title}
                      </h5>
                      <p className="text-xs text-gray-600">
                        {meal.recipe.calories} kalorier • {meal.recipe.protein}g protein
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Shopping List Section - Blurred */}
        <motion.div 
          className={`relative ${showShoppingList ? 'block' : 'hidden'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Indkøbsliste for uge 1</h3>
              <div className="text-sm text-gray-500">
                {shoppingList.items.length} varer
              </div>
            </div>
            
            {/* Blur overlay */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
              <div className="text-center">
                <div className="text-4xl mb-4">🔒</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Indkøbsliste tilgængelig efter betaling
                </h4>
                <p className="text-gray-600 mb-4">
                  Få adgang til den komplette indkøbsliste med priser og tilbud
                </p>
                <button className="px-6 py-3 bg-gradient-to-r from-[#87A96B] to-[#D4AF37] text-white rounded-lg hover:shadow-lg transition-all duration-200 font-semibold">
                  Få adgang nu
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-30">
              {shoppingList.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <span className="text-sm text-gray-500">{item.amount}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div 
          className="text-center mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <div className="bg-gradient-to-r from-[#1B365D] to-[#87A96B] rounded-xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Klar til at starte din vægttabsrejse?</h3>
            <p className="text-lg mb-6 opacity-90">
              Få din personlige 6-ugers plan printet og sendt direkte til din dør
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="px-8 py-4 bg-white text-[#1B365D] rounded-lg hover:bg-gray-100 transition-all duration-200 font-semibold">
                Se hele planen
              </button>
              <button className="px-8 py-4 bg-[#D4AF37] text-white rounded-lg hover:bg-[#D4AF37]/90 transition-all duration-200 font-semibold">
                Få min plan nu - 1195 DKK
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MealPlanPreview; 