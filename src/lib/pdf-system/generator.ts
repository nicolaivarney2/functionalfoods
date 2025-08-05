import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  PDFDocument, 
  PDFGenerationOptions, 
  PDFGenerationResult, 
  PDFMetadata, 
  PDFSecurity, 
  PDFStatus,
  PDFQuality,
  PDFFormat,
  SectionType,
  CoverPageContent,
  MealPlanContent,
  ShoppingListContent,
  NutritionalSummary,
  EducationalContent,
  ProgressTracking
} from './types';
import { dietaryFactory } from '../dietary-system';
import { mealPlanGenerator } from '../meal-plan-system';

export class PDFGenerator {
  private isInitialized = true;

  constructor() {
    // jsPDF doesn't need initialization
  }

  async generateMealPlanPDF(
    userId: string,
    mealPlanId: string,
    mealPlan: any,
    userProfile: any,
    options: PDFGenerationOptions = {}
  ): Promise<PDFGenerationResult> {
    const startTime = Date.now();

    try {
      // Create a temporary div element to render the HTML
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '1200px';
      tempDiv.style.height = '1600px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.padding = '20px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '14px';
      tempDiv.style.lineHeight = '1.6';
      
      // Generate HTML content
      const htmlContent = await this.generateHTMLContent(mealPlan, userProfile, options);
      tempDiv.innerHTML = htmlContent;
      
      // Add to DOM temporarily
      document.body.appendChild(tempDiv);
      
      // Convert to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // Remove from DOM
      document.body.removeChild(tempDiv);
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const pageHeight = pdfHeight;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const pdfBuffer = pdf.output('arraybuffer');

      // Create PDF document metadata
      const metadata: PDFMetadata = {
        title: `6-Week ${userProfile.dietaryApproach} Meal Plan`,
        description: `Personalized meal plan for ${userProfile.name}`,
        version: '1.0.0',
        pageCount: Math.ceil(pdfBuffer.length / 1000), // Rough estimate
        generationTime: Date.now() - startTime,
        userProfile,
        dietaryApproach: userProfile.dietaryApproach,
        totalWeeks: 6,
        totalCalories: mealPlan.totalCalories || 0,
        targetWeight: userProfile.targetWeight,
        currentWeight: userProfile.currentWeight,
        height: userProfile.height,
        age: userProfile.age,
        gender: userProfile.gender,
        activityLevel: userProfile.activityLevel
      };

      // Create security settings
      const security: PDFSecurity = {
        watermark: `FF-${userId}-${Date.now()}`,
        documentId: `doc-${userId}-${mealPlanId}`,
        accessToken: this.generateAccessToken(),
        downloadCount: 0,
        maxDownloads: 3,
        isProtected: true,
        encryptionLevel: options.security?.encryptionLevel || 'standard'
      };

      const document: PDFDocument = {
        id: `pdf-${userId}-${mealPlanId}`,
        userId,
        mealPlanId,
        status: PDFStatus.Generated,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata,
        security
      };

      return {
        success: true,
        document,
        generationTime: Date.now() - startTime,
        fileSize: pdfBuffer.length
      };

    } catch (error) {
      console.error('PDF generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        generationTime: Date.now() - startTime
      };
    }
  }

  private async generateHTMLContent(
    mealPlan: any,
    userProfile: any,
    options: PDFGenerationOptions
  ): Promise<string> {
    const sections = options.includeSections || [
      SectionType.Cover,
      SectionType.UserProfile,
      SectionType.MealPlan,
      SectionType.ShoppingList,
      SectionType.NutritionGuide,
      SectionType.ProgressTracking,
      SectionType.EducationalContent
    ];

    const excludedSections = options.excludeSections || [];

    const htmlSections = await Promise.all(
      sections
        .filter(section => !excludedSections.includes(section))
        .map(section => this.generateSectionHTML(section, mealPlan, userProfile))
    );

    return this.generateFullHTML(htmlSections, options);
  }

  private async generateSectionHTML(
    sectionType: SectionType,
    mealPlan: any,
    userProfile: any
  ): Promise<string> {
    switch (sectionType) {
      case SectionType.Cover:
        return this.generateCoverPageHTML(userProfile, mealPlan);
      case SectionType.UserProfile:
        return this.generateUserProfileHTML(userProfile);
      case SectionType.MealPlan:
        return this.generateMealPlanHTML(mealPlan);
      case SectionType.ShoppingList:
        return this.generateShoppingListHTML(mealPlan);
      case SectionType.NutritionGuide:
        return this.generateNutritionGuideHTML(mealPlan, userProfile);
      case SectionType.ProgressTracking:
        return this.generateProgressTrackingHTML(userProfile);
      case SectionType.EducationalContent:
        return this.generateEducationalContentHTML(userProfile);
      default:
        return '';
    }
  }

  private generateCoverPageHTML(userProfile: any, mealPlan: any): string {
    const dietaryApproach = dietaryFactory.getDietaryApproach(userProfile.dietaryApproach);
    
    return `
      <div class="cover-page" style="page-break-after: always;">
        <div class="cover-content" style="
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px;
        ">
          <div class="logo" style="margin-bottom: 40px;">
            <h1 style="font-size: 48px; font-weight: bold; margin: 0;">FF</h1>
            <p style="font-size: 18px; margin: 0;">Functional Foods</p>
          </div>
          
          <div class="main-title" style="margin-bottom: 60px;">
            <h2 style="font-size: 36px; font-weight: bold; margin: 0 0 20px 0;">
              Your 6-Week Meal Plan
            </h2>
            <p style="font-size: 20px; margin: 0; opacity: 0.9;">
              ${dietaryApproach?.name || userProfile.dietaryApproach} Diet
            </p>
          </div>
          
          <div class="user-info" style="margin-bottom: 40px;">
            <h3 style="font-size: 24px; margin: 0 0 20px 0;">Personalized for</h3>
            <p style="font-size: 18px; margin: 5px 0;">${userProfile.name}</p>
            <p style="font-size: 16px; margin: 5px 0; opacity: 0.8;">
              ${userProfile.age} years • ${userProfile.currentWeight}kg → ${userProfile.targetWeight}kg
            </p>
            <p style="font-size: 16px; margin: 5px 0; opacity: 0.8;">
              ${Math.round(mealPlan.totalCalories || 0)} calories/day
            </p>
          </div>
          
          <div class="generated-date" style="margin-top: auto;">
            <p style="font-size: 14px; opacity: 0.7;">
              Generated on ${new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  private generateUserProfileHTML(userProfile: any): string {
    return `
      <div class="user-profile-section" style="page-break-after: always;">
        <h2 style="color: #333; font-size: 28px; margin-bottom: 30px;">Your Profile</h2>
        
        <div class="profile-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <div class="personal-info">
            <h3 style="color: #555; font-size: 20px; margin-bottom: 15px;">Personal Information</h3>
            <div class="info-item" style="margin-bottom: 10px;">
              <strong>Name:</strong> ${userProfile.name}
            </div>
            <div class="info-item" style="margin-bottom: 10px;">
              <strong>Age:</strong> ${userProfile.age} years
            </div>
            <div class="info-item" style="margin-bottom: 10px;">
              <strong>Gender:</strong> ${userProfile.gender}
            </div>
            <div class="info-item" style="margin-bottom: 10px;">
              <strong>Height:</strong> ${userProfile.height}cm
            </div>
          </div>
          
          <div class="goals-info">
            <h3 style="color: #555; font-size: 20px; margin-bottom: 15px;">Your Goals</h3>
            <div class="info-item" style="margin-bottom: 10px;">
              <strong>Current Weight:</strong> ${userProfile.currentWeight}kg
            </div>
            <div class="info-item" style="margin-bottom: 10px;">
              <strong>Target Weight:</strong> ${userProfile.targetWeight}kg
            </div>
            <div class="info-item" style="margin-bottom: 10px;">
              <strong>Activity Level:</strong> ${userProfile.activityLevel}
            </div>
            <div class="info-item" style="margin-bottom: 10px;">
              <strong>Dietary Approach:</strong> ${userProfile.dietaryApproach}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private generateMealPlanHTML(mealPlan: any): string {
    let html = `
      <div class="meal-plan-section">
        <h2 style="color: #333; font-size: 28px; margin-bottom: 30px;">Your 6-Week Meal Plan</h2>
    `;

    mealPlan.weeks.forEach((week: any, weekIndex: number) => {
      html += `
        <div class="week-section" style="page-break-inside: avoid; margin-bottom: 40px;">
          <h3 style="color: #555; font-size: 24px; margin-bottom: 20px;">Week ${weekIndex + 1}</h3>
      `;

      week.days.forEach((day: any, dayIndex: number) => {
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        html += `
          <div class="day-section" style="margin-bottom: 30px; border: 1px solid #eee; border-radius: 8px; padding: 20px;">
            <h4 style="color: #666; font-size: 20px; margin-bottom: 15px;">${dayNames[dayIndex]}</h4>
            <div class="day-summary" style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
              <strong>Daily Total:</strong> ${Math.round(day.totalCalories)} cal • 
              P: ${Math.round(day.totalProtein)}g • 
              C: ${Math.round(day.totalCarbs)}g • 
              F: ${Math.round(day.totalFat)}g
            </div>
        `;

        day.meals.forEach((meal: any) => {
          html += `
            <div class="meal-item" style="margin-bottom: 15px; padding: 15px; background: #fff; border-left: 4px solid #667eea;">
              <div class="meal-header" style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
                <span class="meal-type" style="font-weight: bold; color: #667eea; text-transform: uppercase; font-size: 12px;">
                  ${meal.mealType}
                </span>
                <span class="meal-calories" style="color: #666; font-size: 14px;">
                  ${Math.round(meal.adjustedCalories)} cal
                </span>
              </div>
              <h5 style="margin: 0 0 5px 0; color: #333;">${meal.recipe.title}</h5>
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">${meal.recipe.description}</p>
              <div class="meal-details" style="font-size: 12px; color: #888;">
                <span>Servings: ${meal.servings}</span> • 
                <span>Prep: ${meal.recipe.prepTime}min</span> • 
                <span>Cook: ${meal.recipe.cookTime}min</span>
              </div>
              <div class="meal-nutrition" style="margin-top: 10px; font-size: 12px; color: #666;">
                P: ${Math.round(meal.adjustedProtein)}g • 
                C: ${Math.round(meal.adjustedCarbs)}g • 
                F: ${Math.round(meal.adjustedFat)}g
              </div>
            </div>
          `;
        });

        html += `</div>`;
      });

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }

  private generateShoppingListHTML(mealPlan: any): string {
    let html = `
      <div class="shopping-list-section" style="page-break-after: always;">
        <h2 style="color: #333; font-size: 28px; margin-bottom: 30px;">Weekly Shopping Lists</h2>
    `;

    mealPlan.weeks.forEach((week: any, weekIndex: number) => {
      html += `
        <div class="week-shopping" style="page-break-inside: avoid; margin-bottom: 40px;">
          <h3 style="color: #555; font-size: 24px; margin-bottom: 20px;">Week ${weekIndex + 1} Shopping List</h3>
      `;

      week.shoppingList.categories.forEach((category: any) => {
        html += `
          <div class="category-section" style="margin-bottom: 25px;">
            <h4 style="color: #666; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid #667eea; padding-bottom: 5px;">
              ${category.name}
            </h4>
            <div class="items-list">
        `;

        category.items.forEach((item: any) => {
          html += `
            <div class="item" style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
              <span style="color: #333;">${item.name}</span>
              <span style="color: #666; font-weight: bold;">${item.amount} ${item.unit}</span>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      });

      html += `</div>`;
    });

    html += `</div>`;
    return html;
  }

  private generateNutritionGuideHTML(mealPlan: any, userProfile: any): string {
    return `
      <div class="nutrition-guide-section" style="page-break-after: always;">
        <h2 style="color: #333; font-size: 28px; margin-bottom: 30px;">Nutrition Guide</h2>
        
        <div class="nutrition-summary" style="margin-bottom: 30px;">
          <h3 style="color: #555; font-size: 20px; margin-bottom: 15px;">Your Daily Targets</h3>
          <div class="targets-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
            <div class="target-item" style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #667eea;">${Math.round(mealPlan.totalCalories || 0)}</div>
              <div style="font-size: 14px; color: #666;">Calories</div>
            </div>
            <div class="target-item" style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #667eea;">${Math.round(mealPlan.totalProtein || 0)}g</div>
              <div style="font-size: 14px; color: #666;">Protein</div>
            </div>
            <div class="target-item" style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #667eea;">${Math.round(mealPlan.totalCarbs || 0)}g</div>
              <div style="font-size: 14px; color: #666;">Carbs</div>
            </div>
            <div class="target-item" style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <div style="font-size: 24px; font-weight: bold; color: #667eea;">${Math.round(mealPlan.totalFat || 0)}g</div>
              <div style="font-size: 14px; color: #666;">Fat</div>
            </div>
          </div>
        </div>
        
        <div class="nutrition-tips">
          <h3 style="color: #555; font-size: 20px; margin-bottom: 15px;">Nutrition Tips</h3>
          <ul style="color: #666; line-height: 1.6;">
            <li>Stay hydrated by drinking at least 8 glasses of water daily</li>
            <li>Eat slowly and mindfully to improve digestion</li>
            <li>Include a variety of colorful vegetables in your meals</li>
            <li>Plan your meals ahead to avoid unhealthy choices</li>
            <li>Listen to your body's hunger and fullness cues</li>
          </ul>
        </div>
      </div>
    `;
  }

  private generateProgressTrackingHTML(userProfile: any): string {
    return `
      <div class="progress-tracking-section" style="page-break-after: always;">
        <h2 style="color: #333; font-size: 28px; margin-bottom: 30px;">Progress Tracking</h2>
        
        <div class="tracking-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <div class="weight-tracking">
            <h3 style="color: #555; font-size: 20px; margin-bottom: 15px;">Weight Goals</h3>
            <div class="weight-info" style="margin-bottom: 20px;">
              <div style="margin-bottom: 10px;">
                <strong>Starting Weight:</strong> ${userProfile.currentWeight}kg
              </div>
              <div style="margin-bottom: 10px;">
                <strong>Target Weight:</strong> ${userProfile.targetWeight}kg
              </div>
              <div style="margin-bottom: 10px;">
                <strong>Goal:</strong> ${userProfile.currentWeight - userProfile.targetWeight}kg weight loss
              </div>
            </div>
            
            <div class="weekly-goals">
              <h4 style="color: #666; font-size: 16px; margin-bottom: 10px;">Weekly Weight Goals</h4>
              <div style="font-size: 14px; color: #666;">
                <div>Week 1: ${userProfile.currentWeight - 0.5}kg</div>
                <div>Week 2: ${userProfile.currentWeight - 1.0}kg</div>
                <div>Week 3: ${userProfile.currentWeight - 1.5}kg</div>
                <div>Week 4: ${userProfile.currentWeight - 2.0}kg</div>
                <div>Week 5: ${userProfile.currentWeight - 2.5}kg</div>
                <div>Week 6: ${userProfile.targetWeight}kg</div>
              </div>
            </div>
          </div>
          
          <div class="measurements-tracking">
            <h3 style="color: #555; font-size: 20px; margin-bottom: 15px;">Measurements</h3>
            <div class="measurement-list" style="font-size: 14px; color: #666;">
              <div style="margin-bottom: 8px;">• Waist circumference</div>
              <div style="margin-bottom: 8px;">• Hip circumference</div>
              <div style="margin-bottom: 8px;">• Chest circumference</div>
              <div style="margin-bottom: 8px;">• Arm circumference</div>
              <div style="margin-bottom: 8px;">• Thigh circumference</div>
            </div>
            
            <div class="tracking-tips" style="margin-top: 20px;">
              <h4 style="color: #666; font-size: 16px; margin-bottom: 10px;">Tracking Tips</h4>
              <ul style="font-size: 14px; color: #666; line-height: 1.4;">
                <li>Measure at the same time each week</li>
                <li>Use the same measuring tape</li>
                <li>Take progress photos monthly</li>
                <li>Record measurements in a journal</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private generateEducationalContentHTML(userProfile: any): string {
    const dietaryApproach = dietaryFactory.getDietaryApproach(userProfile.dietaryApproach);
    
    return `
      <div class="educational-content-section">
        <h2 style="color: #333; font-size: 28px; margin-bottom: 30px;">Educational Content</h2>
        
        <div class="diet-info" style="margin-bottom: 30px;">
          <h3 style="color: #555; font-size: 20px; margin-bottom: 15px;">About Your ${dietaryApproach?.name || userProfile.dietaryApproach} Diet</h3>
          <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
            ${dietaryApproach?.description || 'This personalized diet plan is designed to help you achieve your health and weight loss goals.'}
          </p>
          
          <div class="macro-info" style="margin-bottom: 20px;">
            <h4 style="color: #666; font-size: 16px; margin-bottom: 10px;">Macronutrient Distribution</h4>
            <div style="font-size: 14px; color: #666;">
              <div>Protein: ${dietaryApproach?.macroRatio?.protein?.target || 25}%</div>
              <div>Carbohydrates: ${dietaryApproach?.macroRatio?.carbohydrates?.target || 45}%</div>
              <div>Fat: ${dietaryApproach?.macroRatio?.fat?.target || 30}%</div>
            </div>
          </div>
        </div>
        
        <div class="tips-section">
          <h3 style="color: #555; font-size: 20px; margin-bottom: 15px;">Success Tips</h3>
          <ul style="color: #666; line-height: 1.6;">
            <li>Prepare your meals in advance to stay on track</li>
            <li>Keep healthy snacks readily available</li>
            <li>Stay consistent with your meal timing</li>
            <li>Don't skip meals - it can slow your metabolism</li>
            <li>Celebrate small victories along the way</li>
          </ul>
        </div>
      </div>
    `;
  }

  private generateFullHTML(sections: string[], options: PDFGenerationOptions): string {
    const styling = options.styling || {
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      fontFamily: 'Arial, sans-serif',
      fontSize: 14,
      lineHeight: 1.6
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>6-Week Meal Plan</title>
          <style>
            body {
              font-family: ${styling.fontFamily};
              font-size: ${styling.fontSize}px;
              line-height: ${styling.lineHeight};
              color: #333;
              margin: 0;
              padding: 0;
            }
            
            h1, h2, h3, h4, h5, h6 {
              color: ${styling.primaryColor};
              margin-top: 0;
            }
            
            .page-break {
              page-break-before: always;
            }
            
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${sections.join('')}
        </body>
      </html>
    `;
  }

  private generateAccessToken(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async close(): Promise<void> {
    // jsPDF doesn't need cleanup
  }
} 