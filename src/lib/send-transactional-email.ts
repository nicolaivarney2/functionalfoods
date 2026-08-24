/**
 * Transactional mail via SMTP fra jeres eget domæne.
 *
 * Vercel kan ikke sende mail selv — men den kan tale SMTP til den postkasse
 * I allerede har (Google Workspace / Gmail / Microsoft 365). Ingen Loops-skabelon.
 *
 * Env (Vercel Production):
 *   SMTP_HOST   fx smtp.gmail.com
 *   SMTP_PORT   587 (STARTTLS) — port 25 er blokeret på Vercel
 *   SMTP_USER   fx nicolai@functionalfoods.dk
 *   SMTP_PASS   app-adgangskode (ikke almindelig login-kode)
 *   SMTP_FROM   valgfri, default SMTP_USER
 */

import nodemailer from 'nodemailer'

export type SendEmailResult = { ok: true; id?: string } | { ok: false; error: string }

function smtpPort(): number {
  const raw = process.env.SMTP_PORT?.trim()
  const n = raw ? Number.parseInt(raw, 10) : 587
  return Number.isFinite(n) && n > 0 ? n : 587
}

export async function sendTransactionalEmail(input: {
  to: string | string[]
  subject: string
  text: string
  replyTo?: string
}): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  if (!host || !user || !pass) {
    return {
      ok: false,
      error: 'Mangler SMTP_HOST, SMTP_USER eller SMTP_PASS (send fra jeres egen postkasse)',
    }
  }

  const from = process.env.SMTP_FROM?.trim() || user
  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((e) => e.trim())
    .filter(Boolean)
  if (recipients.length === 0) {
    return { ok: false, error: 'Ingen modtager' }
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: smtpPort(),
      secure: smtpPort() === 465,
      auth: { user, pass },
    })

    const info = await transporter.sendMail({
      from,
      to: recipients.join(', '),
      subject: input.subject,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    })

    return { ok: true, id: info.messageId }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message.slice(0, 400) }
  }
}
