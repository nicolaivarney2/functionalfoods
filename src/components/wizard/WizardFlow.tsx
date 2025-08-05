'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline';

// Import our systems
import { dietaryFactory, DietaryCalculator, UserProfile, ActivityLevel, WeightGoal } from '@/lib/dietary-system';
import { ingredientService } from '@/lib/ingredient-system';
import { mealPlanGenerator } from '@/lib/meal-plan-system';
import MealPlanPreview from './MealPlanPreview';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isCompleted: boolean;
}

interface WizardState {
  currentStep: number;
  userProfile: Partial<UserProfile>;
  selectedDietaryApproach: string;
  excludedIngredients: string[];
  excludedCategories: string[];
  allergies: string[];
  intolerances: string[];
  dietaryRestrictions: string[];
  nutritionalAssessment: any;
  isComplete: boolean;
}

const WizardFlow: React.FC = () => {
  const [state, setState] = useState<WizardState>({
    currentStep: 0,
    userProfile: {},
    selectedDietaryApproach: '',
    excludedIngredients: [],
    excludedCategories: [],
    allergies: [],
    intolerances: [],
    dietaryRestrictions: [],
    nutritionalAssessment: {},
    isComplete: false
  });

  const [isLoading, setIsLoading] = useState(false);

  // Define wizard steps
  const steps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Your Personalized 6-Week Plan',
      description: 'Let\'s create your perfect nutrition journey',
      component: WelcomeStep,
      isCompleted: false
    },
    {
      id: 'profile',
      title: 'Your Profile',
      description: 'Tell us about yourself',
      component: ProfileStep,
      isCompleted: false
    },
    {
      id: 'goals',
      title: 'Your Goals',
      description: 'What do you want to achieve?',
      component: GoalsStep,
      isCompleted: false
    },
    {
      id: 'energy',
      title: 'Energy Calculation',
      description: 'Your personalized calorie needs',
      component: EnergyStep,
      isCompleted: false
    },
    {
      id: 'dietary-approach',
      title: 'Choose Your Approach',
      description: 'Select your preferred dietary style',
      component: DietaryApproachStep,
      isCompleted: false
    },
    {
      id: 'preferences',
      title: 'Food Preferences',
      description: 'What foods do you want to avoid?',
      component: PreferencesStep,
      isCompleted: false
    },
    {
      id: 'nutritional-assessment',
      title: 'Nutritional Health',
      description: 'Quick assessment for optimal results',
      component: NutritionalAssessmentStep,
      isCompleted: false
    },
    {
      id: 'review',
      title: 'Review Your Plan',
      description: 'Finalize your personalized plan',
      component: ReviewStep,
      isCompleted: false
    },
    {
      id: 'generating',
      title: 'Generating Your Plan',
      description: 'Creating your personalized 6-week meal plan',
      component: GeneratingStep,
      isCompleted: false
    }
  ];

  const updateState = (updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (state.currentStep < steps.length - 1) {
      setState(prev => ({ 
        ...prev, 
        currentStep: prev.currentStep + 1 
      }));
    }
  };

  const prevStep = () => {
    if (state.currentStep > 0) {
      setState(prev => ({ 
        ...prev, 
        currentStep: prev.currentStep - 1 
      }));
    }
  };

  const goToStep = (stepIndex: number) => {
    setState(prev => ({ ...prev, currentStep: stepIndex }));
  };

  const completeStep = (stepId: string) => {
    const stepIndex = steps.findIndex(step => step.id === stepId);
    if (stepIndex !== -1) {
      steps[stepIndex].isCompleted = true;
    }
  };

  const currentStep = steps[state.currentStep];
  const CurrentStepComponent = currentStep.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Your 6-Week Nutrition Plan
              </h1>
              <p className="text-gray-600 mt-1">
                Personalized for your goals and preferences
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">
                  {state.currentStep + 1}/{steps.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => goToStep(index)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                    index <= state.currentStep
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  } ${
                    index < state.currentStep ? 'ring-2 ring-blue-200' : ''
                  }`}
                >
                  {index < state.currentStep ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-0.5 mx-2 ${
                      index < state.currentStep ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          
          {/* Step Labels */}
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`text-xs text-center transition-colors duration-200 ${
                  index <= state.currentStep ? 'text-blue-600' : 'text-gray-400'
                }`}
                style={{ width: `${100 / steps.length}%` }}
              >
                {step.title}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-2xl shadow-xl p-8">
              {/* Step Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {currentStep.title}
                </h2>
                <p className="text-gray-600 text-lg">
                  {currentStep.description}
                </p>
              </div>

              {/* Step Content */}
              <div className="min-h-[400px]">
                <CurrentStepComponent
                  state={state}
                  updateState={updateState}
                  nextStep={nextStep}
                  prevStep={prevStep}
                  completeStep={completeStep}
                />
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <button
                  onClick={prevStep}
                  disabled={state.currentStep === 0}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg border transition-all duration-200 ${
                    state.currentStep === 0
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-4">
                  {state.currentStep < steps.length - 1 ? (
                    <button
                      onClick={nextStep}
                      disabled={isLoading}
                      className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50"
                    >
                      <span>Next</span>
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={nextStep}
                      disabled={isLoading}
                      className="flex items-center space-x-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50"
                    >
                      <span>Create My Plan</span>
                      <CheckIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Placeholder components for each step
const WelcomeStep: React.FC<any> = ({ nextStep }) => (
  <div className="text-center">
    <div className="mb-8">
      <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mx-auto mb-6 flex items-center justify-center">
        <span className="text-white text-3xl">🎯</span>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-4">
        Ready to Transform Your Health?
      </h3>
      <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
        In just a few minutes, we'll create your personalized 6-week nutrition plan. 
        Get ready for a journey that will change how you think about food and health.
      </p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="text-center p-6 bg-blue-50 rounded-xl">
        <div className="w-12 h-12 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-white text-xl">⚡</span>
        </div>
        <h4 className="font-semibold text-gray-900 mb-2">Quick & Easy</h4>
        <p className="text-gray-600 text-sm">Complete setup in under 5 minutes</p>
      </div>
      
      <div className="text-center p-6 bg-green-50 rounded-xl">
        <div className="w-12 h-12 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-white text-xl">🎯</span>
        </div>
        <h4 className="font-semibold text-gray-900 mb-2">Personalized</h4>
        <p className="text-gray-600 text-sm">Tailored to your exact needs</p>
      </div>
      
      <div className="text-center p-6 bg-purple-50 rounded-xl">
        <div className="w-12 h-12 bg-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-white text-xl">📈</span>
        </div>
        <h4 className="font-semibold text-gray-900 mb-2">Proven Results</h4>
        <p className="text-gray-600 text-sm">Science-backed nutrition plans</p>
      </div>
    </div>

    <button
      onClick={nextStep}
      className="px-8 py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
    >
      Start Your Journey
    </button>
  </div>
);

const ProfileStep: React.FC<any> = ({ state, updateState, nextStep }) => (
  <div className="max-w-2xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gender
        </label>
        <select
          value={state.userProfile.gender || ''}
          onChange={(e) => updateState({ 
            userProfile: { ...state.userProfile, gender: e.target.value as 'male' | 'female' }
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Age
        </label>
        <input
          type="number"
          value={state.userProfile.age || ''}
          onChange={(e) => updateState({ 
            userProfile: { ...state.userProfile, age: parseInt(e.target.value) }
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your age"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Height (cm)
        </label>
        <input
          type="number"
          value={state.userProfile.height || ''}
          onChange={(e) => updateState({ 
            userProfile: { ...state.userProfile, height: parseInt(e.target.value) }
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your height"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Weight (kg)
        </label>
        <input
          type="number"
          value={state.userProfile.weight || ''}
          onChange={(e) => updateState({ 
            userProfile: { ...state.userProfile, weight: parseInt(e.target.value) }
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your weight"
        />
      </div>
    </div>

    <div className="mt-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Activity Level
      </label>
      <div className="grid grid-cols-1 gap-3">
        {[
          { value: ActivityLevel.Sedentary, label: 'Sedentary', desc: 'Little or no exercise' },
          { value: ActivityLevel.LightlyActive, label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
          { value: ActivityLevel.ModeratelyActive, label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
          { value: ActivityLevel.VeryActive, label: 'Very Active', desc: 'Hard exercise 6-7 days/week' },
          { value: ActivityLevel.ExtremelyActive, label: 'Extremely Active', desc: 'Very hard exercise, physical job' }
        ].map((activity) => (
          <label key={activity.value} className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="activityLevel"
              value={activity.value}
              checked={state.userProfile.activityLevel === activity.value}
              onChange={(e) => updateState({ 
                userProfile: { ...state.userProfile, activityLevel: parseFloat(e.target.value) }
              })}
              className="mr-3"
            />
            <div>
              <div className="font-medium text-gray-900">{activity.label}</div>
              <div className="text-sm text-gray-600">{activity.desc}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  </div>
);

const GoalsStep: React.FC<any> = ({ state, updateState, nextStep }) => (
  <div className="max-w-2xl mx-auto">
    <div className="grid grid-cols-1 gap-4">
      {[
        { value: WeightGoal.WeightLoss, label: 'Weight Loss', desc: 'Lose weight and improve body composition', icon: '📉' },
        { value: WeightGoal.Maintenance, label: 'Maintenance', desc: 'Maintain current weight and improve health', icon: '⚖️' },
        { value: WeightGoal.MuscleGain, label: 'Muscle Gain', desc: 'Build muscle and increase strength', icon: '💪' }
      ].map((goal) => (
        <label key={goal.value} className="flex items-center p-6 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 transition-all duration-200">
          <input
            type="radio"
            name="goal"
            value={goal.value}
            checked={state.userProfile.goal === goal.value}
            onChange={(e) => updateState({ 
              userProfile: { ...state.userProfile, goal: e.target.value as WeightGoal }
            })}
            className="mr-4"
          />
          <div className="flex items-center">
            <span className="text-2xl mr-4">{goal.icon}</span>
            <div>
              <div className="font-semibold text-gray-900 text-lg">{goal.label}</div>
              <div className="text-gray-600">{goal.desc}</div>
            </div>
          </div>
        </label>
      ))}
    </div>
  </div>
);

const EnergyStep: React.FC<any> = ({ state, nextStep }) => {
  const [energyNeeds, setEnergyNeeds] = useState<any>(null);

  useEffect(() => {
    if (state.userProfile.gender && state.userProfile.age && state.userProfile.height && 
        state.userProfile.weight && state.userProfile.activityLevel && state.userProfile.goal) {
      const needs = DietaryCalculator.calculateTargetCalories(state.userProfile as UserProfile);
      setEnergyNeeds(needs);
    }
  }, [state.userProfile]);

  if (!energyNeeds) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Calculating your energy needs...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Your Personalized Energy Needs
        </h3>
        <p className="text-gray-600">
          Based on your profile, here are your daily calorie targets:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="text-center p-6 bg-blue-50 rounded-xl">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {energyNeeds.bmr}
          </div>
          <div className="text-sm text-gray-600">BMR (Base Metabolic Rate)</div>
        </div>
        
        <div className="text-center p-6 bg-green-50 rounded-xl">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {energyNeeds.tdee}
          </div>
          <div className="text-sm text-gray-600">TDEE (Total Daily Energy Expenditure)</div>
        </div>
        
        <div className="text-center p-6 bg-purple-50 rounded-xl">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {energyNeeds.targetCalories}
          </div>
          <div className="text-sm text-gray-600">Target Calories</div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="font-semibold text-gray-900 mb-4">What This Means:</h4>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            Your body burns {energyNeeds.bmr} calories just to stay alive
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            With your activity level, you burn {energyNeeds.tdee} calories daily
          </li>
          <li className="flex items-start">
            <span className="text-green-500 mr-2">✓</span>
            For your goal, aim for {energyNeeds.targetCalories} calories daily
          </li>
        </ul>
      </div>
    </div>
  );
};

const DietaryApproachStep: React.FC<any> = ({ state, updateState, nextStep }) => {
  const diets = dietaryFactory.getAllDiets();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {diets.map((diet) => (
          <label key={diet.id} className="relative">
            <input
              type="radio"
              name="dietaryApproach"
              value={diet.id}
              checked={state.selectedDietaryApproach === diet.id}
              onChange={(e) => updateState({ selectedDietaryApproach: e.target.value })}
              className="sr-only"
            />
            <div className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
              state.selectedDietaryApproach === diet.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-lg">{diet.name}</h3>
                {state.selectedDietaryApproach === diet.id && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <p className="text-gray-600 mb-4">{diet.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {diet.macroRatios.carbohydrates.target}% carbs
                </span>
                <span className="text-gray-500">
                  {diet.macroRatios.protein.target}% protein
                </span>
                <span className="text-gray-500">
                  {diet.macroRatios.fat.target}% fat
                </span>
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

const PreferencesStep: React.FC<any> = ({ state, updateState, nextStep }) => (
  <div className="max-w-2xl mx-auto">
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Foods to Avoid</h3>
        <div className="grid grid-cols-2 gap-3">
          {['pork', 'fish', 'dairy', 'nuts', 'gluten', 'soy'].map((food) => (
            <label key={food} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={state.excludedIngredients.includes(food)}
                                 onChange={(e) => {
                   if (e.target.checked) {
                     updateState({ excludedIngredients: [...state.excludedIngredients, food] });
                   } else {
                     updateState({ 
                       excludedIngredients: state.excludedIngredients.filter((item: string) => item !== food)
                     });
                   }
                 }}
                className="mr-3"
              />
              <span className="capitalize">{food}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Allergies & Intolerances</h3>
        <div className="grid grid-cols-2 gap-3">
          {['milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 'peanuts', 'wheat', 'soy'].map((allergy) => (
            <label key={allergy} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={state.allergies.includes(allergy)}
                                 onChange={(e) => {
                   if (e.target.checked) {
                     updateState({ allergies: [...state.allergies, allergy] });
                   } else {
                     updateState({ 
                       allergies: state.allergies.filter((item: string) => item !== allergy)
                     });
                   }
                 }}
                className="mr-3"
              />
              <span className="capitalize">{allergy}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const NutritionalAssessmentStep: React.FC<any> = ({ state, updateState, nextStep }) => (
  <div className="max-w-2xl mx-auto">
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">How do you feel most days?</h3>
        <div className="space-y-3">
          {[
            'Energetic and focused',
            'Tired but functional',
            'Fatigued and sluggish',
            'Mood swings and irritability',
            'Brain fog and difficulty concentrating'
          ].map((feeling, index) => (
            <label key={index} className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="energyLevel"
                value={index}
                className="mr-3"
              />
              <span>{feeling}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Do you experience any of these?</h3>
        <div className="grid grid-cols-1 gap-3">
          {[
            'Muscle cramps or spasms',
            'Frequent headaches',
            'Poor sleep quality',
            'Digestive issues',
            'Joint pain or stiffness',
            'None of the above'
          ].map((symptom, index) => (
            <label key={index} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                className="mr-3"
              />
              <span>{symptom}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ReviewStep: React.FC<any> = ({ state, nextStep }) => (
  <div className="max-w-2xl mx-auto">
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Your Profile Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Age:</span>
            <span className="ml-2 font-medium">{state.userProfile.age}</span>
          </div>
          <div>
            <span className="text-gray-600">Gender:</span>
            <span className="ml-2 font-medium capitalize">{state.userProfile.gender}</span>
          </div>
          <div>
            <span className="text-gray-600">Height:</span>
            <span className="ml-2 font-medium">{state.userProfile.height} cm</span>
          </div>
          <div>
            <span className="text-gray-600">Weight:</span>
            <span className="ml-2 font-medium">{state.userProfile.weight} kg</span>
          </div>
        </div>
      </div>

      <div className="bg-green-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Your Goals</h3>
        <p className="text-gray-600">
          {state.userProfile.goal === 'weight-loss' && 'Weight Loss - Focus on calorie deficit and fat burning'}
          {state.userProfile.goal === 'maintenance' && 'Maintenance - Balance calories and maintain current weight'}
          {state.userProfile.goal === 'muscle-gain' && 'Muscle Gain - Calorie surplus and protein focus'}
        </p>
      </div>

      <div className="bg-purple-50 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Dietary Approach</h3>
        <p className="text-gray-600">
          {dietaryFactory.getDiet(state.selectedDietaryApproach)?.name}
        </p>
      </div>

      {state.excludedIngredients.length > 0 && (
        <div className="bg-yellow-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Foods to Avoid</h3>
          <div className="flex flex-wrap gap-2">
            {state.excludedIngredients.map((food: string) => (
              <span key={food} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                {food}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={nextStep}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Generate My 6-Week Plan
        </button>
      </div>
    </div>
  </div>
);

const GeneratingStep: React.FC<any> = ({ state }) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [progress, setProgress] = useState(0);
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const generateMealPlan = async () => {
      try {
        setProgress(10);
        
        // Validate required data
        if (!state.userProfile.gender || !state.userProfile.age || !state.userProfile.height || 
            !state.userProfile.weight || !state.userProfile.activityLevel || !state.userProfile.goal) {
          throw new Error('Missing required profile information');
        }

        if (!state.selectedDietaryApproach) {
          throw new Error('No dietary approach selected');
        }

        setProgress(30);

        // Generate the meal plan
        const generatedMealPlan = await mealPlanGenerator.generateMealPlan(
          'user-123', // Mock user ID
          state.userProfile as UserProfile,
          state.selectedDietaryApproach,
          state.excludedIngredients,
          state.allergies,
          state.nutritionalAssessment
        );

        setProgress(80);
        
        // Simulate additional processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setProgress(100);
        setMealPlan(generatedMealPlan);
        setIsGenerating(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsGenerating(false);
      }
    };

    generateMealPlan();
  }, [state]);

  if (error) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-red-600 text-2xl">❌</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="text-center">
        <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mx-auto mb-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Creating Your Personalized Plan
        </h3>
        <p className="text-gray-600 mb-6">
          We're analyzing your preferences and generating your perfect 6-week nutrition plan...
        </p>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="text-sm text-gray-500">
          {progress < 30 && 'Validating your information...'}
          {progress >= 30 && progress < 80 && 'Generating meal plans...'}
          {progress >= 80 && 'Finalizing your plan...'}
        </div>
      </div>
    );
  }

  if (mealPlan) {
    return (
      <div className="text-center">
        <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mx-auto mb-6 flex items-center justify-center">
          <span className="text-white text-3xl">✅</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Your Plan is Ready!
        </h3>
        <p className="text-gray-600 mb-6">
          We've created your personalized 6-week nutrition plan with {mealPlan.weeks.length} weeks of meals.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center p-6 bg-blue-50 rounded-xl">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {mealPlan.weeks.length}
            </div>
            <div className="text-sm text-gray-600">Weeks of Meals</div>
          </div>
          
          <div className="text-center p-6 bg-green-50 rounded-xl">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {mealPlan.weeks.reduce((total: number, week: any) => total + week.days.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Days Planned</div>
          </div>
          
          <div className="text-center p-6 bg-purple-50 rounded-xl">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {Math.round(mealPlan.energyNeeds.targetCalories)}
            </div>
            <div className="text-sm text-gray-600">Daily Calories</div>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => {
              // Here we would typically save to database and redirect to payment
              console.log('Meal plan generated:', mealPlan);
              alert('Meal plan generated successfully! This would typically redirect to payment.');
            }}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl text-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Get My Plan (1195 DKK)
          </button>
          
          <button
            onClick={() => setShowPreview(true)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
          >
            Preview My Plan
          </button>
        </div>

        {showPreview && (
          <MealPlanPreview 
            mealPlan={mealPlan} 
            onClose={() => setShowPreview(false)} 
          />
        )}
      </div>
    );
  }

  return null;
};

export default WizardFlow; 