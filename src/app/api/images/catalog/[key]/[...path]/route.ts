import { NextResponse } from 'next/server'

/**
 * Tidligere proxy for billeder hos Goma og Tjek. De værter bruges ikke som
 * kilde, så ruten svarer 404 og henter ikke filen.
 */
export async function GET() {
  return new NextResponse(null, {
    status: 404,
    headers: { 'Cache-Control': 'public, max-age=300' },
  })
}
