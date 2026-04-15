export type PeoplePerMealMap = Record<'breakfast' | 'lunch' | 'dinner', number>

/**
 * Same logic as meal plan generation: count how many adults eat each slot,
 * or default to all adults when no mealsPerDay is set.
 */
export function getPeoplePerMealFromAdultsProfiles(
  adultsProfiles: { mealsPerDay?: string[] }[],
  adultsCount: number
): PeoplePerMealMap {
  const peoplePerMeal: PeoplePerMealMap = { breakfast: 0, lunch: 0, dinner: 0 }
  adultsProfiles.forEach((profile) => {
    if (profile.mealsPerDay) {
      profile.mealsPerDay.forEach((meal) => {
        if (meal === 'breakfast' || meal === 'lunch' || meal === 'dinner') {
          peoplePerMeal[meal] = (peoplePerMeal[meal] || 0) + 1
        }
      })
    }
  })
  const hasAnyMealsPerDay = Object.values(peoplePerMeal).some((n) => n > 0)
  if (!hasAnyMealsPerDay && adultsCount > 0) {
    peoplePerMeal.breakfast = adultsCount
    peoplePerMeal.lunch = adultsCount
    peoplePerMeal.dinner = adultsCount
  }
  return peoplePerMeal
}
