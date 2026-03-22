/**
 * Rækkefølge til indkøb: grønt → kød → kolonial → køl → øvrigt/forarbejdet → måske hjemme → basisvarer sidst.
 */
const RANK = (name: string): number => {
  const n = name.toLowerCase()
  if (n.includes('basis')) return 80
  if (n.includes('varer du måske') || n.includes('allerede har')) return 70
  if (n.includes('supplement')) return 65
  if (/grønt|grønts|frugt|salat|urter/.test(n)) return 10
  if (/kød|fisk|fjerkræ|pålæg|æg|skaldyr/.test(n)) return 20
  if (/kolonial|tør|konserves|pasta|ris|mel|krydderi|olie|sauce|snack|müsli|havre/.test(n)) return 30
  if (/køl|mejeri|mælk|yoghurt|ost|smør|drik/.test(n)) return 40
  if (/frost|frosne/.test(n)) return 45
  if (/diverse|øvrig|andet|forarbejdet|færdig/.test(n)) return 50
  return 60
}

export function sortShoppingCategoriesForStore<T extends { name: string }>(categories: T[]): T[] {
  return [...categories].sort((a, b) => RANK(a.name) - RANK(b.name))
}
