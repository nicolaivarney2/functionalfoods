import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-route-auth'
import { sendDagligvarerOpsEmail } from '@/lib/dagligvarer-ops-email'
import {
  formatLaunchHealthReport,
  runDagligvarerLaunchHealth,
} from '@/lib/dagligvarer-launch-health'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 120

function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const bearer = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const header = request.headers.get('x-cron-secret')
  return bearer === cronSecret || header === cronSecret
}

export async function GET(request: NextRequest) {
  const cronOk = isCronAuthorized(request)
  if (!cronOk) {
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  const emailRequested =
    request.nextUrl.searchParams.get('email') === '1' ||
    request.nextUrl.searchParams.get('email') === 'true'

  try {
    const report = await runDagligvarerLaunchHealth()
    let email: { ok: boolean; error?: string } | undefined
    if (emailRequested) {
      const subject = report.ok
        ? `[FF dagligvarer] Rapport OK (${report.warnCount} advarsler)`
        : `[FF dagligvarer] ${report.failCount} kæder røde`
      const sent = await sendDagligvarerOpsEmail({
        subject,
        text: formatLaunchHealthReport(report),
      })
      email = sent.ok ? { ok: true } : { ok: false, error: sent.error }
    }

    return NextResponse.json(
      { success: true, ...report, email },
      { status: report.ok ? 200 : 503 },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ukendt fejl'
    if (emailRequested || cronOk) {
      await sendDagligvarerOpsEmail({
        subject: '[FF dagligvarer] Health-check crashede',
        text: message,
      })
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
