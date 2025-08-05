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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
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
          Køn
        </label>
        <select
          value={state.userProfile.gender || ''}
          onChange={(e) => updateState({ 
            userProfile: { ...state.userProfile, gender: e.target.value as 'male' | 'female' }
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D]"
        >
          <option value="">Vælg køn</option>
          <option value="male">Mand</option>
          <option value="female">Kvinde</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alder
        </label>
        <input
          type="number"
          value={state.userProfile.age || ''}
          onChange={(e) => updateState({ 
            userProfile: { ...state.userProfile, age: parseInt(e.target.value) }
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D]"
          placeholder="Indtast din alder"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Højde (cm)
        </label>
        <input
          type="number"
          value={state.userProfile.height || ''}
          onChange={(e) => updateState({ 
            userProfile: { ...state.userProfile, height: parseInt(e.target.value) }
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D]"
          placeholder="Indtast din højde"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Vægt (kg)
        </label>
        <input
          type="number"
          value={state.userProfile.weight || ''}
          onChange={(e) => updateState({ 
            userProfile: { ...state.userProfile, weight: parseInt(e.target.value) }
          })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D]"
          placeholder="Indtast din vægt"
        />
      </div>
    </div>

    <div className="mt-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Aktivitetsniveau
      </label>
      <select
        value={state.userProfile.activityLevel || ''}
        onChange={(e) => updateState({ 
          userProfile: { ...state.userProfile, activityLevel: parseFloat(e.target.value) }
        })}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D]"
      >
        <option value="">Vælg aktivitetsniveau</option>
        <option value={ActivityLevel.Sedentary}>Stillesiddende - Lidt eller ingen motion</option>
        <option value={ActivityLevel.LightlyActive}>Lidt aktiv - Let motion 1-3 dage/uge</option>
        <option value={ActivityLevel.ModeratelyActive}>Moderat aktiv - Moderat motion 3-5 dage/uge</option>
        <option value={ActivityLevel.VeryActive}>Meget aktiv - Hård motion 6-7 dage/uge</option>
        <option value={ActivityLevel.ExtremelyActive}>Ekstremt aktiv - Meget hård motion, fysisk arbejde</option>
      </select>
    </div>
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

  useEffect(() => {
    const calculateEnergy = async () => {
      if (state.userProfile.age && state.userProfile.weight && state.userProfile.height && state.userProfile.gender && state.userProfile.activityLevel) {
        // Always use weight loss goal
        const energyNeeds = DietaryCalculator.calculateTargetCalories(
          state.userProfile as UserProfile,
          WeightGoal.WeightLoss
        );
        
        updateState({ 
          userProfile: { 
            ...state.userProfile, 
            bmr: energyNeeds.bmr,
            tdee: energyNeeds.tdee,
            targetCalories: energyNeeds.targetCalories
          }
        });
        setIsCalculating(false);
      }
    };

    calculateEnergy();
  }, [state.userProfile, updateState]);

  if (isCalculating) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B365D] mx-auto mb-4"></div>
        <p className="text-gray-600">Beregner dine energibehov...</p>
      </div>
    );
  }

  const energyNeeds = {
    bmr: state.userProfile.bmr || 0,
    tdee: state.userProfile.tdee || 0,
    targetCalories: state.userProfile.targetCalories || 0
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">
          Dine personlige energibehov
        </h3>
        <p className="text-gray-600">
          Baseret på din profil, her er dine daglige kalorietargets:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="text-center p-6 bg-[#1B365D]/10 rounded-xl">
          <div className="text-3xl font-bold text-[#1B365D] mb-2">
            {energyNeeds.bmr}
          </div>
          <div className="text-sm text-gray-600">BMR (Grundstofskifte)</div>
        </div>
        
        <div className="text-center p-6 bg-[#87A96B]/10 rounded-xl">
          <div className="text-3xl font-bold text-[#87A96B] mb-2">
            {energyNeeds.tdee}
          </div>
          <div className="text-sm text-gray-600">TDEE (Total daglig energiforbrug)</div>
        </div>
        
        <div className="text-center p-6 bg-[#D4AF37]/10 rounded-xl">
          <div className="text-3xl font-bold text-[#D4AF37] mb-2">
            {energyNeeds.targetCalories}
          </div>
          <div className="text-sm text-gray-600">Målkalorier</div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
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
                ? 'border-[#1B365D] bg-[#1B365D]/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-lg">{diet.name}</h3>
                {state.selectedDietaryApproach === diet.id && (
                  <div className="w-6 h-6 bg-[#1B365D] rounded-full flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <p className="text-gray-600 mb-4">{diet.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {diet.macroRatios.carbohydrates.target}% kulhydrater
                </span>
                <span className="text-gray-500">
                  {diet.macroRatios.protein.target}% protein
                </span>
                <span className="text-gray-500">
                  {diet.macroRatios.fat.target}% fedt
                </span>
              </div>
            </div>
          </label>
        ))}
        
        {/* Social Proof Box */}
        <div className="p-6 border-2 border-[#87A96B] rounded-xl bg-[#87A96B]/5">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-semibold text-gray-900 text-lg">Din personlige vægttabsbog</h3>
            <div className="w-6 h-6 bg-[#87A96B] rounded-full flex items-center justify-center">
              <span className="text-white text-sm">✓</span>
            </div>
          </div>
          <p className="text-gray-600 mb-4">
            Den kostideologi du vælger er det, vi bygger din fysiske vægttabsbog omkring. Vi giver dig al den grundlæggende viden, du har brug for for at lykkes, og dette vil være i bogen, skrevet af os til dig.
          </p>
          <div className="text-sm text-[#87A96B] font-medium">
            Inkluderet i din 6-ugers plan
          </div>
        </div>
      </div>
    </div>
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
  <div className="max-w-2xl mx-auto">
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-gray-600 mb-4">
          Vores madplan er ikke kun interesseret i at give dig vægttab, men også med, at du får det fantastisk i din krop. Vi elsker funktionel mad, og er eksperter i, at strikke en madplan sammen, der dækker din krops fulde behov på ernæring og mineraler, samtidigt med, at vi giver dig et sundt og effektivt vægttab. Fortæl os derfor, om der er nogle af disse symptomer, du døjer med regelmæssigt:
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Hvordan føler du dig de fleste dage?</h3>
        <div className="space-y-3">
          {[
            'Energisk og fokuseret',
            'Træt men funktionel',
            'Udmattet og sløv',
            'Humørsvingninger og irritabilitet',
            'Hjerne-tåge og svært ved at koncentrere sig'
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
        <h3 className="font-semibold text-gray-900 mb-4">Oplever du nogle af disse?</h3>
        <div className="grid grid-cols-1 gap-3">
          {[
            'Muskelkramper eller spasmer',
            'Hyppige hovedpiner',
            'Dårlig søvnkvalitet',
            'Fordøjelsesproblemer',
            'Led- eller stivhedssmerter',
            'Ingen af ovenstående'
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

const MiscellaneousStep: React.FC<any> = ({ state, updateState, nextStep }) => (
  <div className="max-w-2xl mx-auto">
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Ekstra information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vil du springe morgenmad over en gang imellem? Dette kan booste dit vægttab.
            </label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D]">
              <option value="">Vælg</option>
              <option value="yes">Ja</option>
              <option value="no">Nej</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hvor mange personer er denne plan til? Vi vil tilpasse opskrifter og indkøbsliste.
            </label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D]">
              <option value="1">1 person</option>
              <option value="2">2 personer</option>
              <option value="3">3 personer</option>
              <option value="4">4 personer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vil du spise samme mad 2 dage i træk nogle gange for at spare tid på madlavning? Vi vil koordinere planen for dette.
            </label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D]">
              <option value="">Vælg</option>
              <option value="yes">Ja</option>
              <option value="no">Nej</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vil du have adgang til vores gratis online videokurs sammen med den fysiske bog? Dette er komplementært og koster ikke ekstra.
            </label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D]">
              <option value="">Vælg</option>
              <option value="yes">Ja</option>
              <option value="no">Nej</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vil du have gratis personlig SMS-sparring sammen med din fysiske bog? Dette er også komplementært og koster ikke ekstra. Enten Nicolai eller Jannie vil være tilgængelig for din personlige sparring og hjælp. Kun 6 uger dog.
            </label>
            <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B365D] focus:border-[#1B365D]">
              <option value="">Vælg</option>
              <option value="yes">Ja</option>
              <option value="no">Nej</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default WizardFlow; 