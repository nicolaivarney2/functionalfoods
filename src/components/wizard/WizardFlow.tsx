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
      id: 'profile',
      title: 'Din profil',
      description: 'Fortæl os om dig selv',
      component: ProfileStep,
      isCompleted: false
    },
    {
      id: 'energy',
      title: 'Energiberegning',
      description: 'Dine personlige kaloriebehov',
      component: EnergyStep,
      isCompleted: false
    },
    {
      id: 'nutritional-assessment',
      title: 'Ernæringsmæssig sundhed',
      description: 'Hurtig vurdering for optimale resultater',
      component: NutritionalAssessmentStep,
      isCompleted: false
    },
    {
      id: 'dietary-approach',
      title: 'Vælg din tilgang',
      description: 'Vælg din foretrukne koststil',
      component: DietaryApproachStep,
      isCompleted: false
    },
    {
      id: 'preferences',
      title: 'Fødevarepræferencer',
      description: 'Hvilke fødevarer vil du undgå?',
      component: PreferencesStep,
      isCompleted: false
    },
    {
      id: 'miscellaneous',
      title: 'Ekstra information',
      description: 'Yderligere detaljer for din plan',
      component: MiscellaneousStep,
      isCompleted: false
    },
    {
      id: 'generating',
      title: 'Genererer din plan',
      description: 'Skaber din personlige 6-ugers plan',
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
    <div className="min-h-screen bg-gradient-to-br from-[#FEFDF8] via-white to-[#87A96B]/10">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1B365D] to-[#87A96B] text-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Din 6-ugers
              </h1>
              <p className="text-[#FEFDF8] mt-1 text-sm">
                personlige vægttabs-bog
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
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
          <div className="flex items-center justify-center space-x-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => goToStep(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    index <= state.currentStep
                      ? 'bg-[#87A96B]'
                      : 'bg-gray-300'
                  }`}
                />
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      index < state.currentStep ? 'bg-[#87A96B]' : 'bg-gray-300'
                    }`}
                  />
                )}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 border border-gray-100">
              {/* Step Header */}
              <motion.div 
                className="text-center mb-6 lg:mb-8"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                  {currentStep.title}
                </h2>
                <p className="text-gray-600 text-base lg:text-lg">
                  {currentStep.description}
                </p>
              </motion.div>

              {/* Step Content */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <CurrentStepComponent 
                  state={state} 
                  updateState={updateState} 
                  nextStep={nextStep} 
                />
              </motion.div>

              {/* Navigation */}
              <motion.div 
                className="flex flex-col sm:flex-row justify-between items-center mt-6 lg:mt-8 pt-6 border-t border-gray-100 space-y-4 sm:space-y-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <button
                  onClick={prevStep}
                  disabled={state.currentStep === 0}
                  className={`flex items-center space-x-2 px-4 lg:px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    state.currentStep === 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-[#1B365D] hover:bg-[#1B365D]/5 hover:scale-105'
                  }`}
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                  <span>Tilbage</span>
                </button>

                {/* Mobile: Step counter below buttons */}
                <div className="flex flex-col items-center space-y-2 sm:hidden">
                  <span className="text-sm text-gray-500">
                    Trin {state.currentStep + 1} af {steps.length}
                  </span>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#1B365D] to-[#87A96B]"
                      initial={{ width: 0 }}
                      animate={{ width: `${((state.currentStep + 1) / steps.length) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Desktop: Step counter between buttons */}
                <div className="hidden sm:flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    Trin {state.currentStep + 1} af {steps.length}
                  </span>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#1B365D] to-[#87A96B]"
                      initial={{ width: 0 }}
                      animate={{ width: `${((state.currentStep + 1) / steps.length) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <button
                  onClick={nextStep}
                  disabled={state.currentStep === steps.length - 1}
                  className={`flex items-center space-x-2 px-4 lg:px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    state.currentStep === steps.length - 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#1B365D] to-[#87A96B] text-white hover:shadow-lg hover:scale-105'
                  }`}
                >
                  <span>Næste</span>
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Floating Action Button for Mobile */}
      <motion.div 
        className="fixed bottom-6 right-6 lg:hidden"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-14 h-14 bg-gradient-to-r from-[#1B365D] to-[#87A96B] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
        >
          <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </motion.div>
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
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Køn
        </label>
        <select
          value={state.userProfile.gender || ''}
          onChange={(e) => updateState({ 
            userProfile: { ...state.userProfile, gender: e.target.value as 'male' | 'female' }
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D] transition-all duration-200 hover:border-[#87A96B]"
        >
          <option value="">Vælg køn</option>
          <option value="male">Mand</option>
          <option value="female">Kvinde</option>
        </select>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alder
        </label>
        <input
          type="number"
          value={state.userProfile.age || ''}
          onChange={(e) => updateState({ 
            userProfile: { ...state.userProfile, age: parseInt(e.target.value) }
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D] transition-all duration-200 hover:border-[#87A96B]"
          placeholder="Indtast din alder"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Højde (cm)
        </label>
        <input
          type="number"
          value={state.userProfile.height || ''}
          onChange={(e) => updateState({ 
            userProfile: { ...state.userProfile, height: parseInt(e.target.value) }
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D] transition-all duration-200 hover:border-[#87A96B]"
          placeholder="Indtast din højde"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Vægt (kg)
        </label>
        <input
          type="number"
          value={state.userProfile.weight || ''}
          onChange={(e) => updateState({ 
            userProfile: { ...state.userProfile, weight: parseInt(e.target.value) }
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D] transition-all duration-200 hover:border-[#87A96B]"
          placeholder="Indtast din vægt"
        />
      </motion.div>
    </motion.div>

    <motion.div 
      className="mt-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
    >
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Aktivitetsniveau
      </label>
      <select
        value={state.userProfile.activityLevel || ''}
        onChange={(e) => updateState({ 
          userProfile: { ...state.userProfile, activityLevel: parseFloat(e.target.value) }
        })}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D] transition-all duration-200 hover:border-[#87A96B]"
      >
        <option value="">Vælg aktivitetsniveau</option>
        <option value={ActivityLevel.Sedentary}>Stillesiddende - Lidt eller ingen motion</option>
        <option value={ActivityLevel.LightlyActive}>Lidt aktiv - Let motion 1-3 dage/uge</option>
        <option value={ActivityLevel.ModeratelyActive}>Moderat aktiv - Moderat motion 3-5 dage/uge</option>
        <option value={ActivityLevel.VeryActive}>Meget aktiv - Hård motion 6-7 dage/uge</option>
        <option value={ActivityLevel.ExtremelyActive}>Ekstremt aktiv - Meget hård motion, fysisk arbejde</option>
      </select>
    </motion.div>
  </div>
);

const GoalsStep: React.FC<any> = ({ state, updateState, nextStep }) => (
  <div className="max-w-2xl mx-auto">
    <div className="grid grid-cols-1 gap-4">
      {[
        { value: WeightGoal.WeightLoss, label: 'Vægt tab', desc: 'Tabe vægt og forbedre kropssammensætning', icon: '📉' },
        { value: WeightGoal.Maintenance, label: 'Vedligeholdelse', desc: 'Vedligehold din nuværende vægt og forbedre sundhed', icon: '⚖️' },
        { value: WeightGoal.MuscleGain, label: 'Muskelbygning', desc: 'Byg muskel og øge styrke', icon: '💪' }
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

const EnergyStep: React.FC<any> = ({ state, updateState, nextStep }) => {
  const [isCalculating, setIsCalculating] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const calculateEnergy = async () => {
      if (state.userProfile.age && state.userProfile.weight && state.userProfile.height && state.userProfile.gender && state.userProfile.activityLevel) {
        // Always use weight loss goal
        const energyNeeds = DietaryCalculator.calculateTargetCalories(
          { ...state.userProfile as UserProfile, goal: WeightGoal.WeightLoss }
        );
        
        updateState({ 
          userProfile: { 
            ...state.userProfile, 
            bmr: energyNeeds.bmr,
            tdee: energyNeeds.tdee,
            targetCalories: energyNeeds.targetCalories
          }
        });
        
        // Add a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsCalculating(false);
        setShowSuccess(true);
      }
    };

    calculateEnergy();
  }, [state.userProfile]);

  if (isCalculating) {
    return (
      <div className="text-center py-12">
        <motion.div 
          className="animate-spin rounded-full h-16 w-16 border-4 border-[#1B365D] border-t-transparent mx-auto mb-6"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.p 
          className="text-gray-600 text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Beregner dine energibehov...
        </motion.p>
        <motion.div 
          className="mt-4 text-sm text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Dette tager kun et øjeblik
        </motion.div>
      </div>
    );
  }

  const energyNeeds = {
    bmr: state.userProfile.bmr || 0,
    tdee: state.userProfile.tdee || 0,
    targetCalories: state.userProfile.targetCalories || 0
  };

  return (
    <motion.div 
      className="max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {showSuccess && (
        <motion.div 
          className="text-center mb-8 p-4 bg-[#87A96B]/10 rounded-xl border border-[#87A96B]/20"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-[#87A96B] text-2xl mb-2">✓</div>
          <p className="text-[#87A96B] font-medium">Beregning gennemført!</p>
        </motion.div>
      )}

      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Dine personlige energibehov
        </h3>
        <p className="text-gray-600">
          Baseret på din profil, her er dine daglige kalorietargets:
        </p>
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <motion.div 
          className="text-center p-6 bg-[#1B365D]/10 rounded-xl border border-[#1B365D]/20"
          whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(27, 54, 93, 0.15)" }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl font-bold text-[#1B365D] mb-2">
            {energyNeeds.bmr}
          </div>
          <div className="text-sm text-gray-600">BMR (Grundstofskifte)</div>
        </motion.div>
        
        <motion.div 
          className="text-center p-6 bg-[#87A96B]/10 rounded-xl border border-[#87A96B]/20"
          whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(135, 169, 107, 0.15)" }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl font-bold text-[#87A96B] mb-2">
            {energyNeeds.tdee}
          </div>
          <div className="text-sm text-gray-600">TDEE (Total daglig energiforbrug)</div>
        </motion.div>
        
        <motion.div 
          className="text-center p-6 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20"
          whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(212, 175, 55, 0.15)" }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl font-bold text-[#D4AF37] mb-2">
            {energyNeeds.targetCalories}
          </div>
          <div className="text-sm text-gray-600">Målkalorier</div>
        </motion.div>
      </motion.div>

      <motion.div 
        className="bg-gray-50 rounded-xl p-6 border border-gray-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <h4 className="font-semibold text-gray-900 mb-4">Hvad dette betyder:</h4>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-start">
            <span className="text-[#87A96B] mr-2">✓</span>
            Din krop forbrænder {energyNeeds.bmr} kalorier bare for at holde sig i live
          </li>
          <li className="flex items-start">
            <span className="text-[#87A96B] mr-2">✓</span>
            Med dit aktivitetsniveau forbrænder du {energyNeeds.tdee} kalorier dagligt
          </li>
          <li className="flex items-start">
            <span className="text-[#87A96B] mr-2">✓</span>
            For dit mål, sigt efter {energyNeeds.targetCalories} kalorier dagligt
          </li>
        </ul>
      </motion.div>
    </motion.div>
  );
};

const DietaryApproachStep: React.FC<any> = ({ state, updateState, nextStep }) => {
  const dietaryApproaches = [
    {
      id: 'social-proof',
      name: 'Vi bygger din laver og printer din fysiske vægttabsbog omkring dine madønsker. Du får al den viden i bogen du har brug for at lykkedes. Fra os til dig ❤️',
      description: 'Social proof box',
      color: 'from-[#D4AF37] to-[#87A96B]'
    },
    {
      id: 'keto',
      name: 'Ketogenisk diæt',
      description: 'Højt fedt, moderat protein, meget lavt kulhydrat. Fokuserer på at få kroppen til at brænde fedt i stedet for kulhydrater.',
      color: 'from-[#1B365D] to-[#87A96B]'
    },
    {
      id: 'sense',
      name: 'Sense diæt',
      description: 'Balanceret tilgang til sund mad og vægttab. Fokuserer på næringsrige fødevarer og en bæredygtig livsstil.',
      color: 'from-[#87A96B] to-[#1B365D]'
    },
    {
      id: 'lchf',
      name: 'LCHF/Paleo',
      description: 'Lavt kulhydrat, højt fedt med fokus på paleo-fødevarer. Inkluderer fuldkorn og strukturelle fødevarer.',
      color: 'from-[#3C3C3B] to-[#87A96B]'
    },
    {
      id: 'anti-inflammatory',
      name: 'Anti-inflammatorisk',
      description: 'Fokuserer på anti-inflammatoriske fødevarer, næringsrige og mættende måltider for optimal sundhed.',
      color: 'from-[#87A96B] to-[#D4AF37]'
    },
    {
      id: 'mediterranean',
      name: 'Middelhavsdiæt',
      description: 'Sund spisning med fokus på fisk, olivenolie, grøntsager og fuldkorn. Næringsrig og funktionelt stærk.',
      color: 'from-[#1B365D] to-[#D4AF37]'
    },
    {
      id: 'flexitarian',
      name: 'Fleksitarisk',
      description: 'Primært plantebaseret med lejlighedsvis kød. Næringsrig tilgang til vægttab og sundhed.',
      color: 'from-[#87A96B] to-[#3C3C3B]'
    },
    {
      id: '5-2',
      name: '5:2 diæt',
      description: '5 dage normal spisning, 2 dage med meget lavt kalorieindtag (500 kalorier). Effektivt for vægttab.',
      color: 'from-[#D4AF37] to-[#1B365D]'
    }
  ];

  const handleApproachSelect = (approachId: string) => {
    updateState({ selectedDietaryApproach: approachId });
    if (approachId !== 'social-proof') {
      nextStep();
    }
  };

  return (
    <motion.div 
      className="max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Vælg din tilgang
        </h3>
        <p className="text-gray-600">
          Vælg den kosttilgang, der passer bedst til dine mål og præferencer. Vi vil tilpasse din madplan derefter.
        </p>
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {dietaryApproaches.map((approach, index) => (
          <motion.div
            key={approach.id}
            className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
              state.selectedDietaryApproach === approach.id
                ? 'border-[#1B365D] bg-[#1B365D]/5 shadow-lg scale-105'
                : 'border-gray-200 hover:border-[#1B365D] hover:bg-[#1B365D]/5 hover:scale-105'
            }`}
            onClick={() => handleApproachSelect(approach.id)}
            whileHover={{ 
              scale: 1.05, 
              boxShadow: "0 8px 25px rgba(27, 54, 93, 0.15)" 
            }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
          >
            {approach.id === 'social-proof' ? (
              <div className="text-center">
                <div className="text-2xl mb-3">❤️</div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {approach.name}
                </p>
              </div>
            ) : (
              <>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${approach.color} mb-4 flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">
                    {approach.name.charAt(0)}
                  </span>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {approach.name}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {approach.description}
                </p>
              </>
            )}
            
            {state.selectedDietaryApproach === approach.id && (
              <motion.div
                className="absolute top-2 right-2 w-6 h-6 bg-[#87A96B] rounded-full flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

const PreferencesStep: React.FC<any> = ({ state, updateState, nextStep }) => (
  <div className="max-w-2xl mx-auto">
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Vælg fødevarer du ikke kan tåle eller lide</h3>
        <p className="text-gray-600 mb-4">Afkryds dem vi skal ekskludere</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'red-meat', label: 'Rødt kød' },
            { id: 'poultry', label: 'Fjerkræ' },
            { id: 'pork', label: 'Svinekød' },
            { id: 'fish', label: 'Fisk' },
            { id: 'eggs', label: 'Æg' },
            { id: 'shellfish', label: 'Skaldyr' },
            { id: 'nuts', label: 'Nødder' },
            { id: 'dairy', label: 'Mælkeprodukter' },
            { id: 'gluten', label: 'Gluten' },
            { id: 'soy', label: 'Soja' }
          ].map((food) => (
            <label key={food.id} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={state.excludedIngredients.includes(food.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateState({ excludedIngredients: [...state.excludedIngredients, food.id] });
                  } else {
                    updateState({ 
                      excludedIngredients: state.excludedIngredients.filter((item: string) => item !== food.id)
                    });
                  }
                }}
                className="mr-3"
              />
              <span>{food.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const NutritionalAssessmentStep: React.FC<any> = ({ state, updateState, nextStep }) => (
  <motion.div 
    className="max-w-2xl mx-auto"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="text-center mb-8">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">
        Ernæringsmæssig sundhed
      </h3>
      <p className="text-gray-600">
        Vi er ikke kun interesseret i at hjælpe med vægttab, men også at du får det fantastisk i din krop. Vi elsker funktionel mad, og er eksperter i, at strikke en madplan sammen, der dækker dine funktionelle og ernæringsmæssige behov, samtidigt med et sundt og effektivt vægttab.
      </p>
    </div>

    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Hvordan føler du dig de fleste dage?
        </label>
        <select
          value={state.nutritionalAssessment?.energyLevel || ''}
          onChange={(e) => updateState({ 
            nutritionalAssessment: { 
              ...state.nutritionalAssessment, 
              energyLevel: e.target.value 
            } 
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D] transition-all duration-200"
        >
          <option value="">Vælg dit energiniveau</option>
          <option value="high">Højt energiniveau - Jeg føler mig energisk og klar</option>
          <option value="medium">Mellem energiniveau - Jeg føler mig okay, men kunne være bedre</option>
          <option value="low">Lavt energiniveau - Jeg føler mig ofte træt og udmattet</option>
          <option value="fluctuating">Svingende energiniveau - Det varierer meget fra dag til dag</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Har du problemer med følgende?
        </label>
        <div className="space-y-3">
          {[
            'Søvnproblemer',
            'Fordøjelsesproblemer', 
            'Humørsvingninger',
            'Koncentrationsproblemer',
            'Træthed',
            'Ingen problemer'
          ].map((problem) => (
            <motion.label
              key={problem}
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-[#1B365D]/5 transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <input
                type="checkbox"
                checked={state.nutritionalAssessment?.issues?.includes(problem) || false}
                onChange={(e) => {
                  const current = state.nutritionalAssessment?.issues || [];
                  const updated = e.target.checked
                    ? [...current, problem]
                    : current.filter((item: string) => item !== problem);
                  updateState({
                    nutritionalAssessment: {
                      ...state.nutritionalAssessment,
                      issues: updated
                    }
                  });
                }}
                className="w-4 h-4 text-[#1B365D] border-gray-300 rounded focus:ring-[#1B365D]"
              />
              <span className="text-gray-700">{problem}</span>
            </motion.label>
          ))}
        </div>
      </div>
    </motion.div>
  </motion.div>
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
          {state.userProfile.goal === 'weight-loss' && 'Vægt tab - Fokus på kalorieunderskud og fedtforskydning'}
          {state.userProfile.goal === 'maintenance' && 'Vedligeholdelse - Balancere kalorier og vedligeholde nuværende vægt'}
          {state.userProfile.goal === 'muscle-gain' && 'Muskelbygning - Kalorieoverskud og proteinfokus'}
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
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateMealPlan = async () => {
      try {
        // Simulate meal plan generation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const mockMealPlan = {
          userProfile: state.userProfile,
          dietaryApproach: state.selectedDietaryApproach,
          weeks: 6,
          dailyCalories: state.userProfile.targetCalories || 1800,
          expectedWeightLoss: Math.round((state.userProfile.weight || 80) * 0.06), // 6% of body weight
          nutritionalBenefits: [
            'Højt indhold af vitamin B12 og omega-3',
            'Optimalt proteinindhold for muskelbevarelse',
            'Rig på antioxidanter og anti-inflammatoriske stoffer',
            'Balanceret fiberindhold for god fordøjelse'
          ]
        };
        
        setMealPlan(mockMealPlan);
        setIsGenerating(false);
      } catch (err) {
        setError('Der opstod en fejl under generering af din plan. Prøv venligst igen.');
        setIsGenerating(false);
      }
    };

    generateMealPlan();
  }, [state]);

  if (isGenerating) {
    return (
      <div className="text-center py-12">
        <motion.div 
          className="animate-spin rounded-full h-16 w-16 border-4 border-[#1B365D] border-t-transparent mx-auto mb-6"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-[#1B365D] text-white rounded-lg hover:bg-[#1B365D]/90 transition-colors"
        >
          Prøv igen
        </button>
      </div>
    );
  }

  if (!mealPlan) return null;

  const dietaryApproachName = {
    'keto': 'Ketogenisk diæt',
    'sense': 'Sense diæt',
    'lchf': 'LCHF/Paleo',
    'anti-inflammatory': 'Anti-inflammatorisk',
    'mediterranean': 'Middelhavsdiæt',
    'flexitarian': 'Fleksitarisk',
    '5-2': '5:2 diæt'
  }[mealPlan.dietaryApproach] || 'Din valgte tilgang';

  return (
    <motion.div 
      className="max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-8">
        <motion.h2 
          className="text-3xl font-bold text-gray-900 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Din plan er klar! 🎉
        </motion.h2>
        <motion.p 
          className="text-lg text-gray-600 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Vi har skabt din personlige 6-ugers vægttabsplan med {mealPlan.weeks * 7} dages måltider.
        </motion.p>
        <motion.p 
          className="text-sm text-gray-500 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Validér din plan og send til print ved betaling.
        </motion.p>
      </div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <motion.div 
          className="p-6 bg-gradient-to-br from-[#1B365D]/10 to-[#87A96B]/10 rounded-xl border border-[#1B365D]/20"
          whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(27, 54, 93, 0.15)" }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl mb-3">⚖️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Forventet vægttab</h3>
          <p className="text-2xl font-bold text-[#1B365D] mb-1">{mealPlan.expectedWeightLoss} kg</p>
          <p className="text-sm text-gray-600">over 6 uger</p>
        </motion.div>

        <motion.div 
          className="p-6 bg-gradient-to-br from-[#87A96B]/10 to-[#D4AF37]/10 rounded-xl border border-[#87A96B]/20"
          whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(135, 169, 107, 0.15)" }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl mb-3">🔥</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Daglige kalorier</h3>
          <p className="text-2xl font-bold text-[#87A96B] mb-1">{mealPlan.dailyCalories}</p>
          <p className="text-sm text-gray-600">kalorier per dag</p>
        </motion.div>

        <motion.div 
          className="p-6 bg-gradient-to-br from-[#D4AF37]/10 to-[#1B365D]/10 rounded-xl border border-[#D4AF37]/20"
          whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(212, 175, 55, 0.15)" }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl mb-3">🥗</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Kosttilgang</h3>
          <p className="text-lg font-medium text-[#D4AF37] mb-1">{dietaryApproachName}</p>
          <p className="text-sm text-gray-600">tilpasset til dig</p>
        </motion.div>
      </motion.div>

      <motion.div 
        className="bg-white rounded-xl border border-gray-200 p-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Hvad du får ud af denne plan:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mealPlan.nutritionalBenefits.map((benefit: string, index: number) => (
            <motion.div 
              key={index}
              className="flex items-start space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1, duration: 0.4 }}
            >
              <div className="w-5 h-5 bg-[#87A96B] rounded-full flex items-center justify-center mt-0.5">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-gray-700">{benefit}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <p className="text-sm text-gray-500 mb-6">
          Gennemgå eventuelt planen kort, og gå til betaling.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => window.location.href = '/wizard/preview'}
            className="px-8 py-4 bg-[#1B365D] text-white rounded-lg hover:bg-[#1B365D]/90 transition-all duration-200 hover:scale-105 font-semibold"
          >
            Se min plan
          </button>
          <button 
            onClick={() => window.location.href = '/checkout'}
            className="px-8 py-4 bg-gradient-to-r from-[#87A96B] to-[#D4AF37] text-white rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 font-semibold"
          >
            Få min plan nu
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const MiscellaneousStep: React.FC<any> = ({ state, updateState, nextStep }) => (
  <motion.div 
    className="max-w-2xl mx-auto"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="text-center mb-8">
      <h3 className="text-2xl font-bold text-gray-900 mb-4">
        Ekstra information
      </h3>
      <p className="text-gray-600">
        Hjælp os med at tilpasse din plan endnu bedre til dine behov og livsstil.
      </p>
    </div>

    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Vil du springe morgenmad over en gang imellem? Dette kan booste dit vægttab.
        </label>
        <div className="space-y-3">
          {[
            { value: 'skip-breakfast', label: 'Ja, jeg vil gerne springe morgenmad over nogle gange' },
            { value: 'no-skip-breakfast', label: 'Nej, jeg vil have morgenmad hver dag' }
          ].map((option) => (
            <motion.label
              key={option.value}
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-[#1B365D]/5 transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <input
                type="radio"
                name="skipBreakfast"
                value={option.value}
                checked={state.miscellaneous?.skipBreakfast === option.value}
                onChange={(e) => updateState({
                  miscellaneous: {
                    ...state.miscellaneous,
                    skipBreakfast: e.target.value
                  }
                })}
                className="w-4 h-4 text-[#1B365D] border-gray-300 focus:ring-[#1B365D]"
              />
              <span className="text-gray-700">{option.label}</span>
            </motion.label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Hvor mange personer er denne plan til? Vi vil tilpasse opskrifter og indkøbsliste.
        </label>
        <select
          value={state.miscellaneous?.peopleCount || ''}
          onChange={(e) => updateState({
            miscellaneous: {
              ...state.miscellaneous,
              peopleCount: e.target.value
            }
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D] transition-all duration-200"
        >
          <option value="">Vælg antal personer</option>
          <option value="1">1 person</option>
          <option value="2">2 personer</option>
          <option value="3">3 personer</option>
          <option value="4">4 personer</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Vil du spise samme mad 2 dage i træk nogle gange for at spare tid på madlavning? Vi vil koordinere planen for dette.
        </label>
        <div className="space-y-3">
          {[
            { value: 'repeat-meals', label: 'Ja, jeg vil gerne spise samme mad 2 dage i træk' },
            { value: 'no-repeat-meals', label: 'Nej, jeg vil have forskellig mad hver dag' }
          ].map((option) => (
            <motion.label
              key={option.value}
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-[#1B365D]/5 transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <input
                type="radio"
                name="repeatMeals"
                value={option.value}
                checked={state.miscellaneous?.repeatMeals === option.value}
                onChange={(e) => updateState({
                  miscellaneous: {
                    ...state.miscellaneous,
                    repeatMeals: e.target.value
                  }
                })}
                className="w-4 h-4 text-[#1B365D] border-gray-300 focus:ring-[#1B365D]"
              />
              <span className="text-gray-700">{option.label}</span>
            </motion.label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Vil du have adgang til vores gratis online videokurs sammen med den fysiske bog? Dette er komplementært og koster ikke ekstra.
        </label>
        <div className="space-y-3">
          {[
            { value: 'video-course', label: 'Ja, jeg vil gerne have adgang til videokurset' },
            { value: 'no-video-course', label: 'Nej tak, jeg vil kun have den fysiske bog' }
          ].map((option) => (
            <motion.label
              key={option.value}
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-[#1B365D]/5 transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <input
                type="radio"
                name="videoCourse"
                value={option.value}
                checked={state.miscellaneous?.videoCourse === option.value}
                onChange={(e) => updateState({
                  miscellaneous: {
                    ...state.miscellaneous,
                    videoCourse: e.target.value
                  }
                })}
                className="w-4 h-4 text-[#1B365D] border-gray-300 focus:ring-[#1B365D]"
              />
              <span className="text-gray-700">{option.label}</span>
            </motion.label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Vil du have gratis personlig SMS-sparring sammen med din fysiske bog? Dette er også komplementært og koster ikke ekstra. Enten Nicolai eller Jannie vil være tilgængelig for din personlige sparring og hjælp. Kun 6 uger dog.
        </label>
        <div className="space-y-3">
          {[
            { value: 'sms-sparring', label: 'Ja, jeg vil gerne have SMS-sparring' },
            { value: 'no-sms-sparring', label: 'Nej tak, jeg vil kun have den fysiske bog' }
          ].map((option) => (
            <motion.label
              key={option.value}
              className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-[#1B365D]/5 transition-all duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <input
                type="radio"
                name="smsSparring"
                value={option.value}
                checked={state.miscellaneous?.smsSparring === option.value}
                onChange={(e) => updateState({
                  miscellaneous: {
                    ...state.miscellaneous,
                    smsSparring: e.target.value
                  }
                })}
                className="w-4 h-4 text-[#1B365D] border-gray-300 focus:ring-[#1B365D]"
              />
              <span className="text-gray-700">{option.label}</span>
            </motion.label>
          ))}
        </div>
      </div>
    </motion.div>
  </motion.div>
);

export default WizardFlow; 