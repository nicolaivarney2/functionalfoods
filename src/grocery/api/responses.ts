/**
 * Standard response envelopes for the grocery API.
 *
 * Lists:    { data: T[], meta: { total, limit, offset } }
 * Singles:  { data: T }
 * Errors:   { error: string, details?: unknown }
 */

import { NextResponse } from 'next/server'

export interface ListMeta {
  total: number
  limit: number
  offset: number
}

export function listResponse<T>(data: T[], meta: ListMeta): NextResponse {
  return NextResponse.json(
    { data, meta },
    {
      headers: {
        'Cache-Control': 'private, max-age=60', // 60s edge cache
      },
    },
  )
}

export function singleResponse<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, max-age=60' } })
}

export function notFound(message = 'Not found'): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function badRequest(message: string, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, details }, { status: 400 })
}

export function serverError(message: string, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, details }, { status: 500 })
}
