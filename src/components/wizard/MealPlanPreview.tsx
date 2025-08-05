'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, ShoppingBagIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { dietaryFactory } from '@/lib/dietary-system';

interface MealPlanPreviewProps {
  mealPlan: any;
  onClose: () => void;
}

const MealPlanPreview: React.FC<MealPlanPreviewProps> = ({ mealPlan, onClose }) => {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showShoppingList, setShowShoppingList] = useState(false);

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-4 lg:p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg lg:text-2xl font-bold">Your 6-Week Meal Plan</h2>
              <p className="text-blue-100 text-sm lg:text-base">
                {dietaryFactory.getDiet(mealPlan.dietaryApproach.id)?.name} • {Math.round(mealPlan.energyNeeds.targetCalories)} calories/day
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors"
            >
              <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-gray-50 p-3 lg:p-4 border-b">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedWeek(Math.max(0, selectedWeek - 1))}
              disabled={selectedWeek === 0}
              className="flex items-center space-x-1 lg:space-x-2 px-2 lg:px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs lg:text-sm"
            >
              <ChevronLeftIcon className="w-3 h-3 lg:w-4 lg:h-4" />
              <span className="hidden sm:inline">Previous Week</span>
              <span className="sm:hidden">Prev</span>
            </button>
            
            <div className="flex items-center space-x-2 lg:space-x-4">
              <CalendarIcon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
              <span className="font-semibold text-gray-900 text-sm lg:text-base">
                Week {selectedWeek + 1} of {mealPlan.weeks.length}
              </span>
            </div>
            
            <button
              onClick={() => setSelectedWeek(Math.min(mealPlan.weeks.length - 1, selectedWeek + 1))}
              disabled={selectedWeek === mealPlan.weeks.length - 1}
              className="flex items-center space-x-1 lg:space-x-2 px-2 lg:px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs lg:text-sm"
            >
              <span className="hidden sm:inline">Next Week</span>
              <span className="sm:hidden">Next</span>
              <ChevronRightIcon className="w-3 h-3 lg:w-4 lg:h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col h-[70vh]">
          {/* Meal Plan - Full Width */}
          <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg lg:text-xl font-bold text-gray-900">Weekly Meal Plan</h3>
              
              {/* Shopping List Toggle */}
              <button
                onClick={() => setShowShoppingList(!showShoppingList)}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-xs lg:text-sm"
              >
                <ShoppingBagIcon className="w-4 h-4" />
                <span>{showShoppingList ? 'Hide' : 'Show'} Shopping List</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {currentWeek.days.map((day: any, dayIndex: number) => {
                const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                return (
                  <div key={dayIndex} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {dayNames[dayIndex]}
                      </h4>
                      <div className="text-xs lg:text-sm text-gray-600">
                        {Math.round(day.totalCalories)} cal • P: {Math.round(day.totalProtein)}g • C: {Math.round(day.totalCarbs)}g • F: {Math.round(day.totalFat)}g
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {day.meals.map((meal: any, mealIndex: number) => (
                        <div key={mealIndex} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          {/* Recipe Image */}
                          <div className="w-16 h-16 flex-shrink-0">
                            {meal.recipe.images && meal.recipe.images.length > 0 ? (
                              <img 
                                src={meal.recipe.images[0]} 
                                alt={meal.recipe.title}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-xs text-gray-600 font-medium">🍽️</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="w-12 text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                              {meal.mealType}
                            </div>
                            <h5 className="font-medium text-gray-900 text-sm lg:text-base">{meal.recipe.title}</h5>
                            <p className="text-xs lg:text-sm text-gray-600 mt-1">{meal.recipe.description}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                              <span>Servings: {meal.servings}</span>
                              <span>Prep: {meal.recipe.prepTime}min</span>
                              <span>Cook: {meal.recipe.cookTime}min</span>
                            </div>
                          </div>
                          
                          <div className="text-right text-xs text-gray-600 flex-shrink-0">
                            <div>{Math.round(meal.adjustedCalories)} cal</div>
                            <div>P: {Math.round(meal.adjustedProtein)}g</div>
                            <div>C: {Math.round(meal.adjustedCarbs)}g</div>
                            <div>F: {Math.round(meal.adjustedFat)}g</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collapsible Shopping List */}
          {showShoppingList && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t bg-gray-50"
            >
            <div className="flex items-center space-x-2 mb-4">
              <ShoppingBagIcon className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Shopping List</h3>
            </div>
            
              <div className="p-4 lg:p-6">
                <div className="space-y-3">
                  {currentWeek.shoppingList.categories.map((category: any, categoryIndex: number) => (
                    <div key={categoryIndex} className="bg-white rounded-lg p-3 lg:p-4 shadow-sm">
                      <h4 className="font-medium text-gray-900 mb-2 lg:mb-3 text-sm lg:text-base">{category.name}</h4>
                      <div className="space-y-1 lg:space-y-2">
                        {category.items.map((item: any, itemIndex: number) => (
                          <div key={itemIndex} className="flex justify-between items-center text-xs lg:text-sm">
                            <span className="text-gray-700 truncate pr-2">{item.name}</span>
                            <span className="text-gray-600 font-medium flex-shrink-0">
                              {item.amount} {item.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Nutrition Summary */}
                <div className="mt-4 lg:mt-6 bg-white rounded-lg p-3 lg:p-4 shadow-sm">
                  <div className="flex items-center space-x-2 mb-2 lg:mb-3">
                    <ChartBarIcon className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900 text-sm lg:text-base">Weekly Nutrition</h3>
                  </div>
                  
                  <div className="space-y-1 lg:space-y-2 text-xs lg:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Daily Calories:</span>
                      <span className="font-medium">{Math.round(currentWeek.weeklyNutrition.averageDailyCalories)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Daily Protein:</span>
                      <span className="font-medium">{Math.round(currentWeek.weeklyNutrition.averageDailyProtein)}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Daily Carbs:</span>
                      <span className="font-medium">{Math.round(currentWeek.weeklyNutrition.averageDailyCarbs)}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Daily Fat:</span>
                      <span className="font-medium">{Math.round(currentWeek.weeklyNutrition.averageDailyFat)}g</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-3 lg:p-4 border-t">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-3 lg:space-y-0">
            <div className="text-xs lg:text-sm text-gray-600 text-center lg:text-left">
              Generated for {mealPlan.userProfile.gender}, {mealPlan.userProfile.age} years old, {mealPlan.userProfile.weight}kg
            </div>
            <div className="flex space-x-2 lg:space-x-3">
              <button
                onClick={onClose}
                className="px-4 lg:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 text-xs lg:text-sm"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  console.log('Download meal plan:', mealPlan);
                  alert('This would download the meal plan as PDF!');
                }}
                className="px-4 lg:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-xs lg:text-sm"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MealPlanPreview; 