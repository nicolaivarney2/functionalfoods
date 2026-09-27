/** Skjuler site-chrome på printsider (header, footer, bannere). */
export const printChromeCss = `
  [data-site-chrome] { display: none !important; }
  @page { size: A4; margin: 14mm; }
  @media print {
    .no-print { display: none !important; }
    html, body { background: #fff !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`

export function PrintLayoutFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printChromeCss }} />
      {children}
    </>
  )
}
