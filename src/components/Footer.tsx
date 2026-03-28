
import Link from 'next/link'

const columns = [
  {
    title: 'Funktioner',
    links: [
      { label: 'Madbudget (AI madplaner)', href: '/funktioner/madbudget-ai-madplaner' },
      { label: 'Madplaner ud fra tilbud', href: '/funktioner/madplaner-ud-fra-tilbud' },
      { label: 'Vægttabsrejse (50+ parametre)', href: '/funktioner/vaegttabsrejse' },
      { label: 'Makro + mikro opskrifter', href: '/funktioner/makro-mikro-opskrifter' },
      { label: '5000 opskrifter i 8 nicher', href: '/funktioner/5000-opskrifter-i-8-nicher' },
      { label: 'Smart-indkøbliste på sms', href: '/funktioner/smart-indkob-liste-sms' },
      { label: 'Vægt tracker', href: '/funktioner/vaegt-tracker' },
    ],
  },
  {
    title: 'Vægttab & guides',
    links: [
      { label: 'Vægttabsoverblik', href: '/vaegttab' },
      { label: 'Mentalt (adfærd & vaner)', href: '/blog/mentalt' },
      { label: 'Keto vægttab', href: '/keto/vaegttab' },
      { label: 'Sense vægttab', href: '/sense/vaegttab' },
      { label: 'Proteinrig vægttab', href: '/proteinrig-kost/vaegttab' },
      { label: 'GLP-1 vægttab', href: '/GLP-1/vaegttab' },
    ],
  },
  {
    title: 'Kostnicher',
    links: [
      { label: 'Keto', href: '/keto' },
      { label: 'Sense', href: '/sense' },
      { label: 'GLP-1 kost', href: '/GLP-1' },
      { label: 'Anti-inflammatorisk', href: '/anti-inflammatory' },
      { label: 'Fleksitarisk', href: '/flexitarian' },
      { label: '5:2 diæt', href: '/5-2-diet' },
      { label: 'Familiemad', href: '/familie' },
    ],
  },
  {
    title: 'Om FunctionalFoods',
    links: [
      { label: 'Om os', href: '/bag-om-ff' },
      { label: 'Opret dig', href: '/kom-i-gang' },
      { label: 'Opskrifter', href: '/opskriftsoversigt' },
      { label: 'Dagligvarer', href: '/dagligvarer' },
      { label: 'Madbudget', href: '/madbudget' },
      { label: 'Reddit communities', href: '/reddit-communities' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="container px-4 py-12 sm:py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold tracking-wide text-white/95 mb-3">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={`${col.title}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border border-white/10 rounded-lg p-4 text-xs text-white/60 leading-relaxed">
          FunctionalFoods er til information og inspiration. Siden erstatter ikke professionel medicinsk
          rådgivning.
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-white/50">
          <p>© {new Date().getFullYear()} FunctionalFoods</p>
          <div className="flex items-center gap-4">
            <Link href="/bag-om-ff" className="hover:text-white/80 transition-colors">
              Om os
            </Link>
            <Link href="/kom-i-gang" className="hover:text-white/80 transition-colors">
              Kom i gang
            </Link>
            <Link href="/opskriftsoversigt" className="hover:text-white/80 transition-colors">
              Opskrifter
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
