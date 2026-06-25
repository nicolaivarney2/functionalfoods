import type { GuestPageTourStep } from '@/components/madbudget/GuestPageTour'

/** Intro-rundvisning for loggede-in brugere efter første madplan (Goma/Planomo-stil). */
export const FF_USER_TOUR_STEPS: GuestPageTourStep[] = [
  {
    selector: '[data-tour="meal-plan-grid"]',
    title: 'Din madplan for ugen',
    description:
      'Her ser du morgenmad, frokost og aftensmad tilpasset din kostprofil og ugens tilbud. Skift mellem dag- og ugevisning.',
    placement: 'top',
  },
  {
    selector: '[data-tour="swap-meal-example"]',
    title: 'Skift en ret med ét klik',
    description:
      'Tryk på udskift-ikonet på et måltid for at vælge en anden opskrift — filtreret efter måltidstype og din kostprofil.',
    placement: 'auto',
  },
  {
    selector: '[data-tour="family-settings"]',
    title: 'Familieindstillinger',
    description:
      'Tilpas antal personer, kostprofil, butikker og fravalg. Husk at genberegne indkøbslisten efter ændringer.',
  },
  {
    selector: '[data-tour="generate-meal-plan"]',
    title: 'Generér ny madplan',
    description:
      'Lås retter du vil beholde, og tryk her for en frisk ugeplan baseret på tilbud og dine indstillinger.',
    placement: 'top',
  },
  {
    selector: '[data-tour="shopping-list"]',
    title: 'Indkøbsliste pr. butik',
    description:
      'Alle ingredienser opdelt på dine butikker med mængder tilpasset husstanden. Tryk Genberegn efter ændringer.',
    placement: 'top',
  },
  {
    selector: '[data-tour="nutrition"]',
    title: 'Ernæringsoverblik',
    description:
      'Se kalorier, protein og vitaminer i forhold til dit vægttabsmål — vejledende, ikke kalorie-fixering.',
    placement: 'top',
  },
]

export const FF_USER_TOUR_STORAGE_KEY = 'functionalfoods-user-tour-seen'
