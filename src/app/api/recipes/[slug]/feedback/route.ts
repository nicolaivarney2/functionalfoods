import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth-from-request'
import { databaseService } from '@/lib/database-service'
import { sendTransactionalEmail } from '@/lib/send-transactional-email'

export const dynamic = 'force-dynamic'

const FEEDBACK_TO = 'nicolai@functionalfoods.dk'
const MAX_MESSAGE_LENGTH = 5000

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLen)
}

function formatContext(context: unknown): string {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return ''
  try {
    return JSON.stringify(context, null, 2)
  } catch {
    return String(context)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params
    const body = await request.json().catch(() => ({}))

    const message = sanitizeText(body.message ?? body.content ?? body.feedback, MAX_MESSAGE_LENGTH)
    if (!message) {
      return NextResponse.json({ error: 'Feedback må ikke være tom' }, { status: 400 })
    }

    const source = sanitizeText(body.source, 200) || 'ukendt'
    const sourceUrl = sanitizeText(body.sourceUrl ?? body.url, 2000)
    const sourceScreen = sanitizeText(body.sourceScreen ?? body.screen, 200)
    const platform = sanitizeText(body.platform, 100)
    const contextBlock = formatContext(body.context)

    const user = await getAuthenticatedUser(request)
    const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>
    const userName = sanitizeText(
      (metadata.name ?? metadata.full_name ?? metadata.display_name) as string | undefined,
      120,
    )
    const userEmail = user?.email ?? null

    const recipe = await databaseService.getPublishedRecipeBySlug(slug)
    const recipeTitle = recipe?.title ?? slug

    const referer = request.headers.get('referer')
    const userAgent = request.headers.get('user-agent')
    const ffClient = request.headers.get('x-ff-client')

    const lines = [
      'Ny opskrift-feedback fra Functional Foods',
      '',
      `Opskrift: ${recipeTitle}`,
      `Slug: ${slug}`,
      recipe?.id ? `Recipe ID: ${recipe.id}` : null,
      '',
      `Kilde (source): ${source}`,
      sourceScreen ? `Skærm: ${sourceScreen}` : null,
      platform ? `Platform: ${platform}` : null,
      sourceUrl ? `URL angivet: ${sourceUrl}` : null,
      referer ? `Referer: ${referer}` : null,
      ffClient ? `X-FF-Client: ${ffClient}` : null,
      userAgent ? `User-Agent: ${userAgent}` : null,
      '',
      user
        ? `Bruger: ${userName || 'Ukendt navn'} (${userEmail ?? user.id})`
        : 'Bruger: Ikke logget ind',
      '',
      '--- Feedback ---',
      message,
    ]

    if (contextBlock) {
      lines.push('', '--- Ekstra kontekst ---', contextBlock)
    }

    const emailResult = await sendTransactionalEmail({
      to: process.env.FEEDBACK_TO_EMAIL?.trim() || FEEDBACK_TO,
      subject: `[FF feedback] ${recipeTitle}`,
      text: lines.filter((line) => line != null).join('\n'),
      replyTo: userEmail ?? undefined,
    })

    if (!emailResult.ok) {
      console.error('recipe feedback email failed', emailResult.error)
      return NextResponse.json(
        { error: 'Kunne ikke sende feedback lige nu. Prøv igen senere.' },
        { status: 503 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST recipe feedback error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
