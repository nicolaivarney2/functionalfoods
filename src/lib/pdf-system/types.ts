// PDF Generation System Types

export interface PDFDocument {
  id: string;
  userId: string;
  mealPlanId: string;
  status: PDFStatus;
  createdAt: Date;
  updatedAt: Date;
  filePath?: string;
  downloadUrl?: string;
  metadata: PDFMetadata;
  security: PDFSecurity;
}

export enum PDFStatus {
  Generating = 'generating',
  Generated = 'generated',
  Failed = 'failed',
  Validated = 'validated',
  Approved = 'approved',
  Delivered = 'delivered'
}

export interface PDFMetadata {
  title: string;
  description: string;
  version: string;
  pageCount: number;
  fileSize?: number;
  generationTime?: number;
  userProfile: UserProfile;
  dietaryApproach: string;
  totalWeeks: number;
  totalCalories: number;
  targetWeight: number;
  currentWeight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
}

export interface PDFSecurity {
  watermark: string;
  documentId: string;
  accessToken: string;
  expiresAt?: Date;
  downloadCount: number;
  maxDownloads: number;
  isProtected: boolean;
  encryptionLevel: EncryptionLevel;
}

export enum EncryptionLevel {
  None = 'none',
  Basic = 'basic',
  Standard = 'standard',
  Premium = 'premium'
}

export interface PDFSection {
  id: string;
  title: string;
  type: SectionType;
  content: any;
  order: number;
  isRequired: boolean;
  isVisible: boolean;
}

export enum SectionType {
  Cover = 'cover',
  UserProfile = 'user-profile',
  MealPlan = 'meal-plan',
  ShoppingList = 'shopping-list',
  NutritionGuide = 'nutrition-guide',
  ProgressTracking = 'progress-tracking',
  Recipes = 'recipes',
  EducationalContent = 'educational-content',
  Disclaimer = 'disclaimer'
}

export interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  sections: PDFSection[];
  styling: PDFStyling;
  isDefault: boolean;
  isActive: boolean;
}

export interface PDFStyling {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  margins: Margins;
  headerStyle: HeaderStyle;
  footerStyle: FooterStyle;
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HeaderStyle {
  isVisible: boolean;
  logo?: string;
  title?: string;
  backgroundColor: string;
  textColor: string;
}

export interface FooterStyle {
  isVisible: boolean;
  pageNumbers: boolean;
  watermark: boolean;
  backgroundColor: string;
  textColor: string;
}

export interface PDFGenerationOptions {
  template?: string;
  includeSections?: SectionType[];
  excludeSections?: SectionType[];
  styling?: Partial<PDFStyling>;
  security?: Partial<PDFSecurity>;
  quality?: PDFQuality;
  format?: PDFFormat;
}

export enum PDFQuality {
  Draft = 'draft',
  Standard = 'standard',
  High = 'high',
  Premium = 'premium'
}

export enum PDFFormat {
  A4 = 'a4',
  Letter = 'letter',
  Custom = 'custom'
}

export interface PDFGenerationResult {
  success: boolean;
  document?: PDFDocument;
  error?: string;
  warnings?: string[];
  generationTime: number;
  fileSize?: number;
}

export interface PDFValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  code: string;
  message: string;
  section?: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  code: string;
  message: string;
  section?: string;
  severity: 'warning' | 'info';
}

export interface PDFExportOptions {
  format: ExportFormat;
  quality: PDFQuality;
  includeMetadata: boolean;
  includeSecurity: boolean;
  compression: boolean;
}

export enum ExportFormat {
  PDF = 'pdf',
  HTML = 'html',
  JSON = 'json'
}

export interface PDFAnalytics {
  documentId: string;
  generationCount: number;
  downloadCount: number;
  viewCount: number;
  averageViewTime: number;
  userFeedback?: UserFeedback;
  technicalMetrics: TechnicalMetrics;
}

export interface UserFeedback {
  rating: number;
  comments?: string;
  submittedAt: Date;
}

export interface TechnicalMetrics {
  generationTime: number;
  fileSize: number;
  pageCount: number;
  compressionRatio: number;
  loadTime: number;
}

// Content interfaces for different sections
export interface CoverPageContent {
  title: string;
  subtitle: string;
  userInfo: UserInfo;
  planInfo: PlanInfo;
  generatedDate: Date;
  logo?: string;
}

export interface UserInfo {
  name: string;
  age: number;
  gender: string;
  currentWeight: number;
  targetWeight: number;
  height: number;
  activityLevel: string;
}

export interface PlanInfo {
  dietaryApproach: string;
  totalWeeks: number;
  dailyCalories: number;
  macroRatio: MacroRatio;
  startDate: Date;
  endDate: Date;
}

export interface MacroRatio {
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface MealPlanContent {
  weeks: WeekContent[];
  nutritionalSummary: NutritionalSummary;
  mealStructure: MealStructure;
}

export interface WeekContent {
  weekNumber: number;
  days: DayContent[];
  shoppingList: ShoppingListContent;
  weeklyNutrition: WeeklyNutrition;
}

export interface DayContent {
  dayName: string;
  meals: MealContent[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface MealContent {
  mealType: string;
  recipe: RecipeContent;
  servings: number;
  adjustedNutrition: AdjustedNutrition;
  prepTime: number;
  cookTime: number;
}

export interface RecipeContent {
  title: string;
  description: string;
  ingredients: IngredientContent[];
  instructions: string[];
  nutrition: NutritionalInfo;
  image?: string;
  difficulty: string;
  tags: string[];
}

export interface IngredientContent {
  name: string;
  amount: number;
  unit: string;
  category: string;
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface AdjustedNutrition {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface ShoppingListContent {
  categories: ShoppingCategoryContent[];
  totalItems: number;
  estimatedCost?: number;
}

export interface ShoppingCategoryContent {
  name: string;
  items: ShoppingItemContent[];
}

export interface ShoppingItemContent {
  name: string;
  amount: number;
  unit: string;
  estimatedPrice?: number;
}

export interface WeeklyNutrition {
  averageDailyCalories: number;
  averageDailyProtein: number;
  averageDailyCarbs: number;
  averageDailyFat: number;
  totalWeeklyCalories: number;
}

export interface NutritionalSummary {
  dailyTargets: MacroTargets;
  weeklyAverages: MacroTargets;
  deficiencies: NutritionalDeficiency[];
  recommendations: string[];
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface NutritionalDeficiency {
  nutrient: string;
  severity: 'low' | 'medium' | 'high';
  symptoms: string[];
  recommendations: string[];
  foodSources: string[];
}

export interface MealStructure {
  breakfast: MealDistribution;
  lunch: MealDistribution;
  dinner: MealDistribution;
  snacks: MealDistribution[];
}

export interface MealDistribution {
  percentage: number;
  calories: number;
  macroDistribution: MacroRatio;
}

export interface EducationalContent {
  sections: EducationalSection[];
  tips: string[];
  faqs: FAQ[];
  resources: Resource[];
}

export interface EducationalSection {
  title: string;
  content: string;
  image?: string;
  order: number;
}

export interface FAQ {
  question: string;
  answer: string;
  category: string;
}

export interface Resource {
  title: string;
  description: string;
  url?: string;
  type: 'article' | 'video' | 'book' | 'website';
}

export interface ProgressTracking {
  weeklyGoals: WeeklyGoal[];
  measurementTracking: MeasurementTracking;
  progressTips: string[];
  milestoneRewards: MilestoneReward[];
}

export interface WeeklyGoal {
  week: number;
  weightGoal: number;
  nutritionGoals: string[];
  exerciseGoals: string[];
  habitGoals: string[];
}

export interface MeasurementTracking {
  weight: WeightTracking;
  measurements: Measurement[];
  photos: PhotoTracking;
}

export interface WeightTracking {
  startWeight: number;
  targetWeight: number;
  weeklyTargets: number[];
  trackingFrequency: string;
}

export interface Measurement {
  name: string;
  startValue: number;
  targetValue: number;
  unit: string;
}

export interface PhotoTracking {
  frequency: string;
  instructions: string[];
  privacySettings: string[];
}

export interface MilestoneReward {
  milestone: string;
  description: string;
  reward: string;
  achieved: boolean;
} 