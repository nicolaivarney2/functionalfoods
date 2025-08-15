export interface PublishingSchedule {
  recipeId: string
  title: string
  scheduledDate: Date
  scheduledTime?: string // Optional time (HH:MM format)
  status: 'draft' | 'scheduled' | 'published'
  manualReviewRequired: boolean
  seoOptimized: boolean
}

export class PublishingScheduler {
  private static readonly MAX_DAILY_POSTS = 2
  private static readonly MIN_DAYS_BETWEEN_POSTS = 1
  private static readonly WEEKEND_SKIP = true // Skip weekends for more natural posting

  /**
   * Planlæg udgivelse af opskrifter med jævne mellemrum
   * Håndterer 400+ opskrifter over 200+ dage
   */
  static scheduleRecipes(recipes: Array<{ id: string; title: string }>): PublishingSchedule[] {
    const schedules: PublishingSchedule[] = []
    const today = new Date()
    
    recipes.forEach((recipe, index) => {
      // Beregn udgivelsesdato med jævne mellemrum
      const daysOffset = Math.floor(index / this.MAX_DAILY_POSTS) * this.MIN_DAYS_BETWEEN_POSTS
      const scheduledDate = new Date(today)
      scheduledDate.setDate(today.getDate() + daysOffset)
      
      // Skip weekends hvis aktiveret
      if (this.WEEKEND_SKIP) {
        while (scheduledDate.getDay() === 0 || scheduledDate.getDay() === 6) {
          scheduledDate.setDate(scheduledDate.getDate() + 1)
        }
      }
      
      schedules.push({
        recipeId: recipe.id,
        title: recipe.title,
        scheduledDate,
        scheduledTime: '09:00', // Default time
        status: 'draft',
        manualReviewRequired: true,
        seoOptimized: false
      })
    })
    
    return schedules
  }

  /**
   * Få dagens planlagte opskrifter
   */
  static getTodaysScheduledRecipes(schedules: PublishingSchedule[]): PublishingSchedule[] {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.scheduledDate)
      scheduleDate.setHours(0, 0, 0, 0)
      return scheduleDate.getTime() === today.getTime() && schedule.status === 'scheduled'
    })
  }

  /**
   * Markér opskrift som klar til udgivelse
   */
  static markReadyForPublishing(schedule: PublishingSchedule): PublishingSchedule {
    return {
      ...schedule,
      status: 'scheduled',
      manualReviewRequired: false,
      seoOptimized: true
    }
  }

  /**
   * Generer SEO-venlig udgivelsesplan
   */
  static generateSEOPublishingPlan(schedules: PublishingSchedule[]): string {
    const upcoming = schedules
      .filter(s => s.status === 'scheduled' && s.scheduledDate > new Date())
      .slice(0, 7) // Næste uge
    
    let plan = '📅 **Udgivelsesplan - Næste Uge**\n\n'
    
    upcoming.forEach(schedule => {
      const date = schedule.scheduledDate.toLocaleDateString('da-DK', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })
      const time = schedule.scheduledTime || '09:00'
      plan += `**${date} kl. ${time}**: ${schedule.title}\n`
    })
    
    plan += '\n🎯 **SEO Strategi**:\n'
    plan += '• Maks 2 opskrifter om dagen\n'
    plan += '• Manuel review af hver opskrift\n'
    plan += '• Unikke billeder og personlige tips\n'
    plan += '• Fokus på danske ingredienser\n'
    
    return plan
  }

  /**
   * Generer langtids oversigt over udgivelsesplan
   */
  static generateLongTermOverview(schedules: PublishingSchedule[]): string {
    const totalRecipes = schedules.length
    const published = schedules.filter(s => s.status === 'published').length
    const scheduled = schedules.filter(s => s.status === 'scheduled').length
    const draft = schedules.filter(s => s.status === 'draft').length
    
    const firstScheduled = schedules
      .filter(s => s.status === 'scheduled')
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())[0]
    
    const lastScheduled = schedules
      .filter(s => s.status === 'scheduled')
      .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime())[0]
    
    let overview = `📊 **Udgivelsesplan Oversigt**\n\n`
    overview += `**Total opskrifter**: ${totalRecipes}\n`
    overview += `**Status**:\n`
    overview += `• Udgivet: ${published}\n`
    overview += `• Planlagt: ${scheduled}\n`
    overview += `• Kladde: ${draft}\n\n`
    
    if (firstScheduled && lastScheduled) {
      const daysDiff = Math.ceil((lastScheduled.scheduledDate.getTime() - firstScheduled.scheduledDate.getTime()) / (1000 * 60 * 60 * 24))
      overview += `**Tidsplan**:\n`
      overview += `• Første planlagte: ${firstScheduled.scheduledDate.toLocaleDateString('da-DK')} kl. ${firstScheduled.scheduledTime || '09:00'}\n`
      overview += `• Sidste planlagte: ${lastScheduled.scheduledDate.toLocaleDateString('da-DK')} kl. ${lastScheduled.scheduledTime || '09:00'}\n`
      overview += `• Total varighed: ${daysDiff} dage\n`
      overview += `• Gennemsnit: ${Math.ceil(totalRecipes / 2)} opskrifter om dagen\n\n`
    }
    
    overview += `🎯 **SEO Strategi**:\n`
    overview += `• Maks 2 opskrifter om dagen (weekend fri)\n`
    overview += `• Manuel review af hver opskrift\n`
    overview += `• Personlige tips og erfaringer\n`
    overview += `• Unikke billeder (lokalt lagret)\n`
    overview += `• Fokus på danske ingredienser\n`
    
    return overview
  }
}

