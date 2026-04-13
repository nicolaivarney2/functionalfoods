'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline';

// Import our systems
import { DietaryCalculator, UserProfile, ActivityLevel, WeightGoal } from '@/lib/dietary-system';
import { mealPlanGenerator } from '@/lib/meal-plan-system';
import MealPlanPreview from './MealPlanPreview';
import VaegttabsbogPromoModal from './VaegttabsbogPromoModal';

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

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [mealPlan, setMealPlan] = useState<any>(null);
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

  const currentStep = steps[state.currentStep];
  const CurrentStepComponent = currentStep.component;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#FEFDF8] via-white to-[#87A96B]/10">
      <div className="pointer-events-none select-none" aria-hidden="true">
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
                  setShowPreviewModal={currentStep.id === 'generating' ? setShowPreviewModal : undefined}
                  setMealPlan={currentStep.id === 'generating' ? setMealPlan : undefined}
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

      {/* Preview Modal */}
      </div>

      <VaegttabsbogPromoModal />

      {showPreviewModal && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowPreviewModal(false)}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Din personlige 6-ugers plan</h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <MealPlanPreview 
                userProfile={state.userProfile}
                selectedDietaryApproach={state.selectedDietaryApproach}
                excludedIngredients={state.excludedIngredients}
                excludedCategories={state.excludedCategories}
                allergies={state.allergies}
                intolerances={state.intolerances}
                dietaryRestrictions={state.dietaryRestrictions}
                nutritionalAssessment={state.nutritionalAssessment}
                realMealPlan={mealPlan?.realMealPlan}
                onClose={() => setShowPreviewModal(false)}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

// Placeholder components for each step
const ProfileStep: React.FC<any> = ({ state, updateState, nextStep: _nextStep }) => (
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

const EnergyStep: React.FC<any> = ({ state, updateState, nextStep: _nextStep }) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);

  useEffect(() => {
    if (state.userProfile.age && state.userProfile.weight && state.userProfile.height && state.userProfile.gender && state.userProfile.activityLevel && !hasCalculated) {
      setIsCalculating(true);
      setShowSuccess(false);
      setHasCalculated(true);
    }
  }, [state.userProfile.age, state.userProfile.weight, state.userProfile.height, state.userProfile.gender, state.userProfile.activityLevel, hasCalculated]);

  useEffect(() => {
    if (!isCalculating) return;

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
  }, [isCalculating]);

  if (isCalculating) {
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
          <p className="text-sm text-gray-600">Basal stofskifte</p>
        </motion.div>

        <motion.div 
          className="text-center p-6 bg-[#87A96B]/10 rounded-xl border border-[#87A96B]/20"
          whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(135, 169, 107, 0.15)" }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl font-bold text-[#87A96B] mb-2">
            {energyNeeds.tdee}
          </div>
          <p className="text-sm text-gray-600">Dagligt energiforbrug</p>
        </motion.div>

        <motion.div 
          className="text-center p-6 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20"
          whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(212, 175, 55, 0.15)" }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-3xl font-bold text-[#D4AF37] mb-2">
            {energyNeeds.targetCalories}
          </div>
          <p className="text-sm text-gray-600">Dagligt kalorietarget</p>
        </motion.div>
      </motion.div>

      <div className="text-center">
        <p className="text-sm text-gray-500 mb-4">
          Disse tal vil blive brugt til at tilpasse din madplan præcist til dine behov.
        </p>
      </div>
    </motion.div>
  );
};

const DietaryApproachStep: React.FC<any> = ({ state, updateState, nextStep }) => {
  const dietaryApproaches = [
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
    nextStep();
  };

  return (
    <motion.div 
      className="max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
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

const PreferencesStep: React.FC<any> = ({ state, updateState, nextStep: _nextStep }) => (
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

const NutritionalAssessmentStep: React.FC<any> = ({ state, updateState, nextStep: _nextStep }) => (
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

const GeneratingStep: React.FC<any> = ({ state, setShowPreviewModal, setMealPlan }) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateMealPlan = async () => {
      try {
        // Use real meal plan generator
        const realMealPlan = await mealPlanGenerator.generateMealPlan(
          'user-' + Date.now(), // Generate unique user ID
          state.userProfile as UserProfile,
          state.selectedDietaryApproach,
          state.excludedIngredients,
          state.allergies,
          state.nutritionalAssessment
        );
        
        // Transform to preview format
        const previewMealPlan = {
          userProfile: state.userProfile,
          dietaryApproach: state.selectedDietaryApproach,
          weeks: realMealPlan.weeks.length,
          dailyCalories: state.userProfile.targetCalories || 1800,
          expectedWeightLoss: Math.round((state.userProfile.weight || 80) * 0.06), // 6% of body weight
          nutritionalBenefits: [
            'Højt indhold af vitamin B12 og omega-3',
            'Optimalt proteinindhold for muskelbevarelse',
            'Rig på antioxidanter og anti-inflammatoriske stoffer',
            'Balanceret fiberindhold for god fordøjelse'
          ],
          // Add real meal plan data
          realMealPlan: realMealPlan
        };
        
        setMealPlan(previewMealPlan);
        setIsGenerating(false);
      } catch (err) {
        console.error('Meal plan generation error:', err);
        setError('Der opstod en fejl under generering af din plan. Prøv venligst igen.');
        setIsGenerating(false);
      }
    };

    generateMealPlan();
  }, [state, setMealPlan]);

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

  // Show success message after generation
  return (
    <motion.div 
      className="max-w-4xl mx-auto text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <div className="w-20 h-20 bg-[#87A96B] rounded-full mx-auto mb-6 flex items-center justify-center">
          <CheckIcon className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Din plan er klar! 🎉
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          Vi har skabt din personlige 6-ugers vægttabsplan.
        </p>
      </motion.div>

      <motion.div 
        className="bg-gradient-to-r from-[#1B365D] to-[#87A96B] rounded-xl p-6 mb-8 text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <h3 className="text-xl font-bold mb-4">Hvad du får:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            <span>Personlig 6 ugers vægttabsbog</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            <span>+60-100 siders trykt bog i flot indpakning</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            <span>Funktionel ernæringsrig mad</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            <span>Ubegrænset og gratis sparing på SMS</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            <span>Fri adgang til simpelt online vægttabskursus</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
            <span>Budgetvenlig indkøbsliste uge-for-uge</span>
          </div>
        </div>
      </motion.div>

      <motion.div 
        className="flex flex-col sm:flex-row gap-4 justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <button
          onClick={() => setShowPreviewModal(true)}
          className="px-8 py-4 bg-[#1B365D] text-white rounded-lg hover:bg-[#1B365D]/90 transition-all duration-200 font-semibold"
        >
          Se min plan
        </button>
        <button
          onClick={() => {/* Handle payment */}}
          className="px-8 py-4 bg-[#D4AF37] text-white rounded-lg hover:bg-[#D4AF37]/90 transition-all duration-200 font-semibold"
        >
          Få min plan nu - 1195 DKK
        </button>
      </motion.div>
    </motion.div>
  );
};

const MiscellaneousStep: React.FC<any> = ({ state, updateState, nextStep: _nextStep }) => (
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
        Hjælp os med at tilpasse din plan endnu bedre til dine behov.
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
          Vil du springe morgenmad over en gang imellem?
        </label>
        <motion.label
          className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-[#1B365D]/5 transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <input
            type="checkbox"
            checked={state.miscellaneous?.skipBreakfast || false}
            onChange={(e) => updateState({
              miscellaneous: {
                ...state.miscellaneous,
                skipBreakfast: e.target.checked
              }
            })}
            className="w-4 h-4 text-[#1B365D] border-gray-300 rounded focus:ring-[#1B365D]"
          />
          <span className="text-gray-700">Ja, jeg vil gerne springe morgenmad over nogle gange</span>
        </motion.label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Hvor mange personer er denne plan til?
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
          Vil du spise samme mad 2 dage i træk nogle gange?
        </label>
        <motion.label
          className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-[#1B365D]/5 transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <input
            type="checkbox"
            checked={state.miscellaneous?.repeatMeals || false}
            onChange={(e) => updateState({
              miscellaneous: {
                ...state.miscellaneous,
                repeatMeals: e.target.checked
              }
            })}
            className="w-4 h-4 text-[#1B365D] border-gray-300 rounded focus:ring-[#1B365D]"
          />
          <span className="text-gray-700">Ja, jeg vil gerne spise samme mad 2 dage i træk</span>
        </motion.label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Vil du have adgang til vores gratis online videokurs?
        </label>
        <motion.label
          className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-[#1B365D]/5 transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <input
            type="checkbox"
            checked={state.miscellaneous?.videoCourse || false}
            onChange={(e) => updateState({
              miscellaneous: {
                ...state.miscellaneous,
                videoCourse: e.target.checked
              }
            })}
            className="w-4 h-4 text-[#1B365D] border-gray-300 rounded focus:ring-[#1B365D]"
          />
          <span className="text-gray-700">Ja, jeg vil gerne have adgang til videokurset</span>
        </motion.label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Vil du have gratis personlig SMS-sparring?
        </label>
        <motion.label
          className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-[#1B365D]/5 transition-all duration-200"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <input
            type="checkbox"
            checked={state.miscellaneous?.smsSparring || false}
            onChange={(e) => updateState({
              miscellaneous: {
                ...state.miscellaneous,
                smsSparring: e.target.checked
              }
            })}
            className="w-4 h-4 text-[#1B365D] border-gray-300 rounded focus:ring-[#1B365D]"
          />
          <span className="text-gray-700">Ja, jeg vil gerne have SMS-sparring</span>
        </motion.label>
      </div>
    </motion.div>
  </motion.div>
);

export default WizardFlow; 