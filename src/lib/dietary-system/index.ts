// Export all dietary system components
export * from './types';
export * from './calculator';
export * from './factory';

// Create a singleton instance of the factory
import { DietaryApproachFactory } from './factory';
export const dietaryFactory = new DietaryApproachFactory(); 