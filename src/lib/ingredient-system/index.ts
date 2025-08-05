// Export all ingredient system components
export * from './types';
export * from './service';

// Create a singleton instance of the service
import { IngredientTaggingService } from './service';
export const ingredientService = new IngredientTaggingService(); 