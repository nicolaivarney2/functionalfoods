// Export all meal plan system components
export * from './types';
export * from './generator';

// Create a singleton instance of the generator
import { MealPlanGenerator } from './generator';
export const mealPlanGenerator = new MealPlanGenerator(); 