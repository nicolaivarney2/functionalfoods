import type { GuestPageTourStep } from '@/components/madbudget/GuestPageTour'

/** Spotlight-trin for gæster på /madbudget (Functional Foods — uden madpakker). */
export const FF_GUEST_TOUR_STEPS: GuestPageTourStep[] = [
  {
    selector: '[data-tour="meal-plan-grid"]',
    title: 'Din vægttabsplan for ugen',
    description:
      'Demo viser morgenmad, frokost og aftensmad — alle tilpasset vægttab og ugens tilbud i dine butikker. Skift visning for at se hele ugen eller én dag ad gangen.',
    placement: 'top',
  },
  {
    selector: '[data-tour="swap-meal-example"]',
    title: 'Skift en madret med ét klik',
    description:
      'Er der en ret I ikke er vilde med? Klik på kortet — fx onsdagens aftensmad — for at vælge en anden ret der passer til jer og ugens tilbud.',
    placement: 'auto',
  },
  {
    selector: '[data-tour="week-selector"]',
    title: 'Skift mellem uger',
    description:
      'Bladr tilbage til tidligere uger, eller skift mellem dag- og ugevisning.',
  },
  {
    selector: '[data-tour="family-settings"]',
    title: 'Tilpas demo-familien',
    description:
      'Genåbn introen: familie, mad-niche (Keto i demo), vægttabsprofiler og butikker — samme som Familieindstillinger når du er bruger.',
  },
  {
    selector: '[data-tour="basisvarer"]',
    title: 'Basisvarer',
    description:
      'Tilføj de varer du ALTID skal have hjemme. I demo-tilstand har vi tilføjet 13 typiske basisvarer for jer.',
  },
  {
    selector: '[data-tour="generate-meal-plan"]',
    title: 'Morgenmad, frokost og aftensmad',
    description:
      'Vælg hvilke måltider planen skal dække — i demo er alle tre slået til, så du ser et helt døgns vægttabsfokus, ikke kun aftensmad. Lås retter og generér ny plan som bruger.',
    placement: 'top',
  },
  {
    selector: '[data-tour="nutrition"]',
    title: 'Vejledende ernæring',
    description:
      'Overblik over kalorier, protein og vitaminer i forhold til dit vægttabsmål — vejledende, ikke kalorie-fixering.',
    placement: 'top',
  },
  {
    selector: '[data-tour="shopping-list"]',
    title: 'Indkøbsliste pr. butik',
    description:
      'Ugens tilbud opdelt på de butikker du handler i — så du kan vælge den billigste rute.',
    placement: 'top',
  },
  {
    selector: '[data-tour="basisvarer-in-shopping"]',
    title: 'Dine basisvarer er allerede med',
    description:
      'Dine faste basisvarer ligger nederst i indkøbslisten — så du aldrig glemmer skyr, æg eller agurk.',
    placement: 'top',
  },
  {
    selector: '[data-tour="meal-plan-grid"]',
    title: 'Klar til selv at prøve?',
    description:
      'Opret en gratis bruger på /kom-i-gang, så kan du gemme dine egne madplaner og få ugens tilbud beregnet ud fra DIN butik.',
    placement: 'top',
  },
]

export const FF_GUEST_TOUR_STORAGE_KEY = 'functionalfoods-guest-tour-seen'
