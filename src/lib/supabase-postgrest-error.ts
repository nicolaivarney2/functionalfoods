import { NextResponse } from 'next/server'

/** PostgREST: tabel findes ikke / ikke i schema cache endnu (fx før SQL-migration). */
export function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.code === 'PGRST205') return true
  return typeof error.message === 'string' && error.message.includes('Could not find the table')
}

export function missingWeightTrackerTablesResponse(error: { code?: string; message?: string }) {
  return NextResponse.json(
    {
      error: 'Vægt-tracker tabeller mangler i databasen',
      details:
        'Kør filen add-weight-tracker-tables.sql i Supabase → SQL Editor (ligger i projektroden). Vent et øjeblik, så API-cachen opdateres, og genindlæs siden.',
      code: error.code,
    },
    { status: 503 }
  )
}
