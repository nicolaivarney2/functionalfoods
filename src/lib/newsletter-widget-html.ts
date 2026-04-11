import { getNewsletterFormAction, getNewsletterVariant } from '@/lib/newsletter-variants'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type WidgetContext = { categorySlug?: string }

export function buildNewsletterWidgetHtml(context: WidgetContext | undefined, cfg: Record<string, unknown>): string {
  const v = getNewsletterVariant(context?.categorySlug)
  const headline = typeof cfg.title === 'string' && cfg.title.trim() ? cfg.title.trim() : v.headline
  const subline =
    typeof cfg.subtitle === 'string' && cfg.subtitle.trim() ? cfg.subtitle.trim() : v.subline
  const buttonText =
    (typeof cfg.button === 'string' && cfg.button.trim()) ||
    (typeof cfg.button_text === 'string' && cfg.button_text.trim()) ||
    'Ja tak — tilmeld mig'
  const placeholder =
    typeof cfg.placeholder === 'string' && cfg.placeholder.trim() ? cfg.placeholder.trim() : 'din@email.dk'

  const formActionOverride = typeof cfg.action === 'string' && cfg.action.trim() ? cfg.action.trim() : ''
  const formAction = formActionOverride || getNewsletterFormAction(context?.categorySlug)
  const useExternal = Boolean(formAction.length)

  const perksHtml = v.perks
    .map(
      (p) =>
        `<li style="display:flex;gap:0.5rem;align-items:flex-start;margin:0.35rem 0;font-size:14px;line-height:1.45;color:#334155;">
          <span style="flex-shrink:0;width:1.1rem;height:1.1rem;margin-top:0.15rem;border-radius:9999px;background:linear-gradient(135deg,${esc(v.accentFrom)},${esc(v.accentTo)});display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;">✓</span>
          <span>${esc(p)}</span>
        </li>`
    )
    .join('')

  const gradientBorder = `linear-gradient(135deg, ${v.accentFrom}, ${v.accentTo})`
  const innerBg = '#ffffff'

  if (useExternal) {
    return `
<div class="widget-newsletter-ff" style="margin:1.25rem 0;padding:2px;border-radius:14px;background:${gradientBorder};box-shadow:0 10px 40px -12px rgba(15,23,42,0.18);">
  <div style="background:${innerBg};border-radius:12px;padding:1.25rem 1.25rem 1.35rem;">
    <p style="margin:0 0 0.35rem;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${esc(v.accentFrom)};">Gratis · Ingen spam</p>
    <h4 style="margin:0 0 0.5rem;font-size:1.25rem;font-weight:700;line-height:1.25;color:#0f172a;letter-spacing:-0.02em;">${esc(headline)}</h4>
    <p style="margin:0 0 0.85rem;font-size:0.95rem;line-height:1.55;color:#475569;">${esc(subline)}</p>
    <ul style="margin:0 0 1rem;padding:0;list-style:none;">${perksHtml}</ul>
    <form action="${esc(formAction)}" method="post" class="newsletter-ext-form" style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:stretch;">
      <input type="hidden" name="newsletter_category" value="${esc(v.audienceTag)}" />
      <input type="email" name="email" required placeholder="${esc(placeholder)}" autocomplete="email" inputmode="email"
        style="flex:1;min-width:200px;padding:0.65rem 0.85rem;border-radius:10px;border:1px solid #cbd5e1;font-size:16px;background:#f8fafc;" />
      <button type="submit" style="padding:0.65rem 1.1rem;border-radius:10px;border:none;font-weight:600;font-size:0.95rem;cursor:pointer;color:#fff;background:linear-gradient(135deg,${esc(v.accentFrom)},${esc(v.accentTo)});box-shadow:0 4px 14px -4px ${esc(v.accentFrom)};">${esc(buttonText)}</button>
    </form>
    <p style="margin:0.75rem 0 0;font-size:11px;line-height:1.4;color:#94a3b8;">Afmeld når som helst. Vi bruger kun din e-mail til det du tilmelder dig til.</p>
  </div>
</div>`.trim()
  }

  return `
<div class="widget-newsletter-ff" style="margin:1.25rem 0;padding:2px;border-radius:14px;background:${gradientBorder};box-shadow:0 10px 40px -12px rgba(15,23,42,0.18);">
  <div style="background:${innerBg};border-radius:12px;padding:1.25rem 1.25rem 1.35rem;">
    <p style="margin:0 0 0.35rem;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${esc(v.accentFrom)};">Gratis · Ingen spam</p>
    <h4 style="margin:0 0 0.5rem;font-size:1.25rem;font-weight:700;line-height:1.25;color:#0f172a;letter-spacing:-0.02em;">${esc(headline)}</h4>
    <p style="margin:0 0 0.85rem;font-size:0.95rem;line-height:1.55;color:#475569;">${esc(subline)}</p>
    <ul style="margin:0 0 1rem;padding:0;list-style:none;">${perksHtml}</ul>
    <form data-newsletter-internal="1" data-audience="${esc(v.audienceTag)}" class="newsletter-int-form" style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:stretch;">
      <input type="email" name="email" required placeholder="${esc(placeholder)}" autocomplete="email" inputmode="email"
        style="flex:1;min-width:200px;padding:0.65rem 0.85rem;border-radius:10px;border:1px solid #cbd5e1;font-size:16px;background:#f8fafc;" />
      <button type="submit" style="padding:0.65rem 1.1rem;border-radius:10px;border:none;font-weight:600;font-size:0.95rem;cursor:pointer;color:#fff;background:linear-gradient(135deg,${esc(v.accentFrom)},${esc(v.accentTo)});box-shadow:0 4px 14px -4px ${esc(v.accentFrom)};">${esc(buttonText)}</button>
    </form>
    <p data-newsletter-msg style="display:none;margin-top:0.65rem;font-size:0.9rem;font-weight:600;color:#059669;"></p>
    <p style="margin:0.75rem 0 0;font-size:11px;line-height:1.4;color:#94a3b8;">Afmeld når som helst. Vi bruger kun din e-mail til det du tilmelder dig til.</p>
  </div>
</div>`.trim()
}
