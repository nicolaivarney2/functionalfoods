import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// Local macOS filesystems and some tooling can behave oddly with non-ascii route segments.
// To make /vægttab reliable everywhere, we internally serve the ASCII route /vaegttab.
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/vægttab') {
    const url = request.nextUrl.clone()
    url.pathname = '/vaegttab'
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/vægttab'],
}


