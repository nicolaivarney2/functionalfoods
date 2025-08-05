'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ShoppingBagIcon, ChartBarIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { dietaryFactory } from '@/lib/dietary-system';
import { pdfGenerator } from '@/lib/pdf-system';

interface MealPlanPreviewProps {
  userProfile: any;
  selectedDietaryApproach: string;
  excludedIngredients: string[];
  excludedCategories: string[];
  allergies: string[];
  intolerances: string[];
  dietaryRestrictions: string[];
  nutritionalAssessment: any;
}

const MealPlanPreview: React.FC<MealPlanPreviewProps> = ({ 
  userProfile, 
  selectedDietaryApproach, 
  excludedIngredients, 
  excludedCategories, 
  allergies, 
  intolerances, 
  dietaryRestrictions, 
  nutritionalAssessment 
}) => {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfGenerationError, setPdfGenerationError] = useState<string | null>(null);

  // Create meal plan data from props
  const mealPlan = {
    userProfile,
    dietaryApproach: { id: selectedDietaryApproach },
    weeks: [
      {
        weekNumber: 1,
        days: [
          {
            day: 'Mandag',
            meals: [
              {
                recipe: {
                  title: 'Keto morgenmad',
                  type: 'breakfast',
                  calories: 450,
                  protein: 25,
                  carbs: 8,
                  fat: 35,
                  ingredients: ['æg', 'bacon', 'avocado'],
                  instructions: 'Steg æg og bacon, server med avocado',
                  images: ['/images/recipes/keto-breakfast.jpg']
                }
              },
              {
                recipe: {
                  title: 'Keto frokost',
                  type: 'lunch',
                  calories: 550,
                  protein: 30,
                  carbs: 10,
                  fat: 40,
                  ingredients: ['kylling', 'salat', 'olivenolie'],
                  instructions: 'Grill kylling, server med salat og olivenolie',
                  images: ['/images/recipes/keto-lunch.jpg']
                }
              },
              {
                recipe: {
                  title: 'Keto aftensmad',
                  type: 'dinner',
                  calories: 600,
                  protein: 35,
                  carbs: 12,
                  fat: 45,
                  ingredients: ['laks', 'broccoli', 'smør'],
                  instructions: 'Steg laks, server med broccoli og smør',
                  images: ['/images/recipes/keto-dinner.jpg']
                }
              }
            ]
          },
          {
            day: 'Tirsdag',
            meals: [
              {
                recipe: {
                  title: 'Protein morgenmad',
                  type: 'breakfast',
                  calories: 480,
                  protein: 28,
                  carbs: 6,
                  fat: 38,
                  ingredients: ['æg', 'ost', 'spinat'],
                  instructions: 'Lav omelet med ost og spinat',
                  images: ['/images/recipes/protein-breakfast.jpg']
                }
              },
              {
                recipe: {
                  title: 'Salat frokost',
                  type: 'lunch',
                  calories: 520,
                  protein: 32,
                  carbs: 8,
                  fat: 42,
                  ingredients: ['tun', 'salat', 'oliven'],
                  instructions: 'Tun salat med oliven og dressing',
                  images: ['/images/recipes/tuna-salad.jpg']
                }
              },
              {
                recipe: {
                  title: 'Kylling aftensmad',
                  type: 'dinner',
                  calories: 580,
                  protein: 38,
                  carbs: 10,
                  fat: 48,
                  ingredients: ['kylling', 'grøntsager', 'olivenolie'],
                  instructions: 'Grill kylling med grøntsager',
                  images: ['/images/recipes/chicken-dinner.jpg']
                }
              }
            ]
          },
          {
            day: 'Onsdag',
            meals: [
              {
                recipe: {
                  title: 'Avocado morgenmad',
                  type: 'breakfast',
                  calories: 460,
                  protein: 26,
                  carbs: 7,
                  fat: 36,
                  ingredients: ['avocado', 'æg', 'bacon'],
                  instructions: 'Avocado toast med æg og bacon',
                  images: ['/images/recipes/avocado-breakfast.jpg']
                }
              },
              {
                recipe: {
                  title: 'Kylling salat',
                  type: 'lunch',
                  calories: 540,
                  protein: 34,
                  carbs: 9,
                  fat: 44,
                  ingredients: ['kylling', 'salat', 'tomat'],
                  instructions: 'Kylling salat med friske grøntsager',
                  images: ['/images/recipes/chicken-salad.jpg']
                }
              },
              {
                recipe: {
                  title: 'Laks aftensmad',
                  type: 'dinner',
                  calories: 620,
                  protein: 40,
                  carbs: 11,
                  fat: 50,
                  ingredients: ['laks', 'asparges', 'citron'],
                  instructions: 'Steg laks med asparges og citron',
                  images: ['/images/recipes/salmon-dinner.jpg']
                }
              }
            ]
          },
          {
            day: 'Torsdag',
            meals: [
              {
                recipe: {
                  title: 'Protein shake morgenmad',
                  type: 'breakfast',
                  calories: 440,
                  protein: 30,
                  carbs: 5,
                  fat: 34,
                  ingredients: ['protein pulver', 'mandel mælk', 'bær'],
                  instructions: 'Protein shake med bær og mandel mælk',
                  images: ['/images/recipes/protein-shake.jpg']
                }
              },
              {
                recipe: {
                  title: 'Tun salat',
                  type: 'lunch',
                  calories: 560,
                  protein: 36,
                  carbs: 8,
                  fat: 46,
                  ingredients: ['tun', 'salat', 'agurk'],
                  instructions: 'Tun salat med agurk og dressing',
                  images: ['/images/recipes/tuna-lunch.jpg']
                }
              },
              {
                recipe: {
                  title: 'Bøf aftensmad',
                  type: 'dinner',
                  calories: 640,
                  protein: 44,
                  carbs: 12,
                  fat: 52,
                  ingredients: ['bøf', 'broccoli', 'smør'],
                  instructions: 'Steg bøf med broccoli og smør',
                  images: ['/images/recipes/steak-dinner.jpg']
                }
              }
            ]
          },
          {
            day: 'Fredag',
            meals: [
              {
                recipe: {
                  title: 'Omelet morgenmad',
                  type: 'breakfast',
                  calories: 470,
                  protein: 27,
                  carbs: 6,
                  fat: 37,
                  ingredients: ['æg', 'ost', 'skinke'],
                  instructions: 'Omelet med ost og skinke',
                  images: ['/images/recipes/omelet-breakfast.jpg']
                }
              },
              {
                recipe: {
                  title: 'Kylling wrap',
                  type: 'lunch',
                  calories: 530,
                  protein: 33,
                  carbs: 7,
                  fat: 43,
                  ingredients: ['kylling', 'salat', 'tortilla'],
                  instructions: 'Kylling wrap med salat',
                  images: ['/images/recipes/chicken-wrap.jpg']
                }
              },
              {
                recipe: {
                  title: 'Fisk aftensmad',
                  type: 'dinner',
                  calories: 590,
                  protein: 39,
                  carbs: 9,
                  fat: 49,
                  ingredients: ['torsk', 'grøntsager', 'citron'],
                  instructions: 'Steg torsk med grøntsager og citron',
                  images: ['/images/recipes/fish-dinner.jpg']
                }
              }
            ]
          },
          {
            day: 'Lørdag',
            meals: [
              {
                recipe: {
                  title: 'Pancakes morgenmad',
                  type: 'breakfast',
                  calories: 490,
                  protein: 29,
                  carbs: 8,
                  fat: 39,
                  ingredients: ['æg', 'mel', 'bær'],
                  instructions: 'Protein pancakes med bær',
                  images: ['/images/recipes/pancakes-breakfast.jpg']
                }
              },
              {
                recipe: {
                  title: 'Burger frokost',
                  type: 'lunch',
                  calories: 570,
                  protein: 35,
                  carbs: 10,
                  fat: 45,
                  ingredients: ['bøf', 'salat', 'ost'],
                  instructions: 'Protein burger med salat og ost',
                  images: ['/images/recipes/burger-lunch.jpg']
                }
              },
              {
                recipe: {
                  title: 'Pizza aftensmad',
                  type: 'dinner',
                  calories: 610,
                  protein: 41,
                  carbs: 13,
                  fat: 51,
                  ingredients: ['kylling', 'ost', 'grøntsager'],
                  instructions: 'Protein pizza med kylling og grøntsager',
                  images: ['/images/recipes/pizza-dinner.jpg']
                }
              }
            ]
          },
          {
            day: 'Søndag',
            meals: [
              {
                recipe: {
                  title: 'Yoghurt morgenmad',
                  type: 'breakfast',
                  calories: 460,
                  protein: 26,
                  carbs: 7,
                  fat: 36,
                  ingredients: ['yoghurt', 'nødder', 'bær'],
                  instructions: 'Protein yoghurt med nødder og bær',
                  images: ['/images/recipes/yoghurt-breakfast.jpg']
                }
              },
              {
                recipe: {
                  title: 'Salat frokost',
                  type: 'lunch',
                  calories: 540,
                  protein: 34,
                  carbs: 9,
                  fat: 44,
                  ingredients: ['kylling', 'salat', 'avocado'],
                  instructions: 'Kylling salat med avocado',
                  images: ['/images/recipes/salad-lunch.jpg']
                }
              },
              {
                recipe: {
                  title: 'Laks aftensmad',
                  type: 'dinner',
                  calories: 600,
                  protein: 38,
                  carbs: 11,
                  fat: 48,
                  ingredients: ['laks', 'ris', 'grøntsager'],
                  instructions: 'Steg laks med ris og grøntsager',
                  images: ['/images/recipes/salmon-dinner.jpg']
                }
              }
            ]
          }
        ],
        shoppingList: {
          items: [
            { name: 'æg', amount: '24 stk' },
            { name: 'bacon', amount: '400g' },
            { name: 'avocado', amount: '4 stk' },
            { name: 'kylling', amount: '1kg' },
            { name: 'salat', amount: '3 stk' },
            { name: 'olivenolie', amount: '200ml' },
            { name: 'laks', amount: '800g' },
            { name: 'broccoli', amount: '1kg' },
            { name: 'smør', amount: '200g' }
          ]
        }
      }
    ],
    expectedWeightLoss: Math.round((userProfile.weight || 80) * 0.06),
    dailyCalories: userProfile.targetCalories || 1800
  };

  if (!userProfile || !selectedDietaryApproach) {
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
              onClick={() => window.close()}
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
  const mealPlanUserProfile = mealPlan.userProfile;
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
              <p className="text-sm text-gray-600">Forventet vægttab: {Math.round((mealPlanUserProfile.weight || 80) * 0.06)} kg over 6 uger</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <h3 className="text-xl font-semibold text-gray-900">Din ugeplan</h3>
              
              {/* Week Navigation - Mobile Friendly */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}
                  disabled={selectedWeek === 0}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    selectedWeek === 0 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-[#1B365D] hover:bg-[#1B365D]/10'
                  }`}
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                
                {/* Mobile: Scrollable week buttons */}
                <div className="flex items-center space-x-1 overflow-x-auto scrollbar-hide">
                  {mealPlan.weeks.map((week: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => setSelectedWeek(index)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        selectedWeek === index
                          ? 'bg-[#1B365D] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Uge {week.weekNumber}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setSelectedWeek(Math.min(mealPlan.weeks.length - 1, selectedWeek + 1))}
                  disabled={selectedWeek === mealPlan.weeks.length - 1}
                  className={`p-2 rounded-lg transition-all duration-200 relative group ${
                    selectedWeek === mealPlan.weeks.length - 1 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-[#1B365D] hover:bg-[#1B365D]/10'
                  }`}
                  title={selectedWeek === mealPlan.weeks.length - 1 ? "De andre uger er skjult" : ""}
                >
                  <ChevronRightIcon className="w-5 h-5" />
                  {selectedWeek === mealPlan.weeks.length - 1 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      De andre uger er skjult
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </button>
              </div>
            </div>
            
            {/* Action Buttons - Mobile Friendly */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={() => setShowShoppingList(!showShoppingList)}
                className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-[#1B365D] text-white rounded-lg hover:bg-[#1B365D]/90 transition-colors text-sm relative group"
                title="Indkøbsliste er begrænset i forhåndsvisning"
              >
                <ShoppingBagIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{showShoppingList ? 'Skjul indkøbsliste' : 'Vis indkøbsliste'}</span>
                <span className="sm:hidden">{showShoppingList ? 'Skjul' : 'Liste'}</span>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                  Indkøbsliste er begrænset i forhåndsvisning
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </button>
              
              <button
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF}
                className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-[#87A96B] to-[#D4AF37] text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 text-sm relative group"
                title="PDF download er begrænset i forhåndsvisning"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span className="hidden sm:inline">Genererer PDF...</span>
                    <span className="sm:hidden">Genererer...</span>
                  </>
                ) : (
                  <>
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Download PDF</span>
                    <span className="sm:hidden">PDF</span>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                      PDF download er begrænset i forhåndsvisning
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {mealPlan.weeks[selectedWeek].days.map((day: any, dayIndex: number) => (
              <motion.div
                key={dayIndex}
                className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 lg:p-6 border border-gray-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + dayIndex * 0.1, duration: 0.5 }}
              >
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CalendarIcon className="w-5 h-5 mr-2 text-[#1B365D]" />
                  {['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'][dayIndex]}
                </h4>
                
                <div className="space-y-3">
                  {day.meals.map((meal: any, mealIndex: number) => (
                    <motion.div 
                      key={mealIndex} 
                      className="bg-white rounded-lg p-3 lg:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-start space-x-3 lg:space-x-4">
                        <div className="flex-shrink-0">
                          {meal.recipe.images && meal.recipe.images.length > 0 ? (
                            <img 
                              src={meal.recipe.images[0]} 
                              alt={meal.recipe.title}
                              className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg bg-gradient-to-br from-[#1B365D]/20 to-[#87A96B]/20 flex items-center justify-center">
                              <span className="text-lg lg:text-2xl">🍽️</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs lg:text-sm font-medium text-[#1B365D] bg-[#1B365D]/10 px-2 py-1 rounded-full">
                              {['Morgenmad', 'Frokost', 'Aftensmad'][mealIndex]}
                            </span>
                            <span className="text-xs lg:text-sm text-gray-500">
                              {meal.recipe.calories} kalorier
                            </span>
                          </div>
                          
                          <h5 className="text-sm lg:text-lg font-semibold text-gray-900 mb-2">
                            {meal.recipe.title}
                          </h5>
                          
                          <div className="grid grid-cols-3 gap-2 lg:gap-4 mb-3">
                            <div className="text-center">
                              <div className="text-xs lg:text-sm font-medium text-gray-900">{meal.recipe.protein}g</div>
                              <div className="text-xs text-gray-500">Protein</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs lg:text-sm font-medium text-gray-900">{meal.recipe.carbs}g</div>
                              <div className="text-xs text-gray-500">Kulhydrater</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs lg:text-sm font-medium text-gray-900">{meal.recipe.fat}g</div>
                              <div className="text-xs text-gray-500">Fedt</div>
                            </div>
                          </div>
                          
                          <div className="text-xs lg:text-sm text-gray-600">
                            <strong>Ingredienser:</strong> {meal.recipe.ingredients.join(', ')}
                          </div>
                        </div>
                      </div>
                    </motion.div>
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