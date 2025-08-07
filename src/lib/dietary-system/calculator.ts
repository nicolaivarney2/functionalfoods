import { 
  UserProfile, 
  ActivityLevel, 
  WeightGoal, 
  EnergyNeeds, 
  MacroTargets, 
  MacroRatio,
  DietaryApproach 
} from './types';

export class DietaryCalculator {
  /**
   * Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation
   */
  static calculateBMR(profile: UserProfile): number {
    const { gender, age, height, weight } = profile;
    
    if (gender === 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
  }

  /**
   * Calculate Total Daily Energy Expenditure
   */
  static calculateTDEE(profile: UserProfile): number {
    const bmr = this.calculateBMR(profile);
    return bmr * profile.activityLevel;
  }

  /**
   * Calculate target calories based on goal
   */
  static calculateTargetCalories(profile: UserProfile): EnergyNeeds {
    const bmr = this.calculateBMR(profile);
    const tdee = this.calculateTDEE(profile);
    
    let targetCalories: number;
    let deficit: number;

    switch (profile.goal) {
      case WeightGoal.WeightLoss:
        // 15-20% deficit for weight loss
        deficit = tdee * 0.2;
        targetCalories = tdee - deficit;
        break;
      
      case WeightGoal.Maintenance:
        targetCalories = tdee;
        deficit = 0;
        break;
      
      case WeightGoal.MuscleGain:
        // 10-15% surplus for muscle gain
        const surplus = tdee * 0.15;
        targetCalories = tdee + surplus;
        deficit = -surplus;
        break;
      
      default:
        targetCalories = tdee;
        deficit = 0;
    }

    return {
      bmr,
      tdee,
      targetCalories: Math.round(targetCalories),
      deficit: Math.round(deficit)
    };
  }

  /**
   * Calculate macro targets in grams based on calories and macro ratios
   */
  static calculateMacroTargets(
    calories: number, 
    macroRatio: MacroRatio
  ): MacroTargets {
    // Convert percentages to grams
    // Protein and carbs: 4 calories per gram
    // Fat: 9 calories per gram
    
    const proteinGrams = (calories * macroRatio.protein.target / 100) / 4;
    const carbGrams = (calories * macroRatio.carbohydrates.target / 100) / 4;
    const fatGrams = (calories * macroRatio.fat.target / 100) / 9;

    return {
      calories,
      protein: Math.round(proteinGrams),
      carbohydrates: Math.round(carbGrams),
      fat: Math.round(fatGrams),
      proteinPercentage: macroRatio.protein.target,
      carbPercentage: macroRatio.carbohydrates.target,
      fatPercentage: macroRatio.fat.target
    };
  }

  /**
   * Calculate daily macro targets for a specific dietary approach
   */
  static calculateDietaryMacroTargets(
    profile: UserProfile,
    dietaryApproach: DietaryApproach
  ): MacroTargets {
    const energyNeeds = this.calculateTargetCalories(profile);
    
    // Adjust calories based on dietary approach specifics
    let adjustedCalories = energyNeeds.targetCalories;
    
    // Special handling for 5:2 diet
    if (dietaryApproach.id === '5-2') {
      // This will be handled separately in the meal plan generation
      // For now, use normal day calories
      adjustedCalories = energyNeeds.targetCalories;
    }
    
    return this.calculateMacroTargets(adjustedCalories, dietaryApproach.macroRatios);
  }

  /**
   * Validate macro ratios sum to approximately 100%
   */
  static validateMacroRatios(macroRatio: MacroRatio): boolean {
    const total = macroRatio.carbohydrates.target + 
                  macroRatio.protein.target + 
                  macroRatio.fat.target;
    
    return total >= 98 && total <= 102;
  }

  /**
   * Calculate meal-specific macro targets
   */
  static calculateMealMacros(
    dailyMacros: MacroTargets,
    mealDistribution: any, // Will be properly typed when we implement meal distribution
    mealType: string
  ): MacroTargets {
    // This is a placeholder - will be implemented when we add meal distribution logic
    return dailyMacros;
  }

  /**
   * Calculate BMI
   */
  static calculateBMI(weight: number, height: number): number {
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  }

  /**
   * Get BMI category
   */
  static getBMICategory(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  /**
   * Calculate ideal weight range based on height and gender
   */
  static calculateIdealWeightRange(height: number, gender: 'male' | 'female'): { min: number; max: number } {
    const heightInMeters = height / 100;
    
    if (gender === 'male') {
      const min = 18.5 * heightInMeters * heightInMeters;
      const max = 24.9 * heightInMeters * heightInMeters;
      return { min: Math.round(min), max: Math.round(max) };
    } else {
      const min = 18.5 * heightInMeters * heightInMeters;
      const max = 24.9 * heightInMeters * heightInMeters;
      return { min: Math.round(min), max: Math.round(max) };
    }
  }

  /**
   * Calculate weight loss rate and timeline
   */
  static calculateWeightLossTimeline(
    currentWeight: number,
    targetWeight: number,
    dailyDeficit: number
  ): { weeksToGoal: number; weeklyLoss: number } {
    const totalWeightToLose = currentWeight - targetWeight;
    const weeklyDeficit = dailyDeficit * 7;
    const weeklyLoss = weeklyDeficit / 7700; // 7700 calories = 1kg
    const weeksToGoal = totalWeightToLose / weeklyLoss;
    
    return {
      weeksToGoal: Math.ceil(weeksToGoal),
      weeklyLoss: Math.round(weeklyLoss * 100) / 100
    };
  }
} 