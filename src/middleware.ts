import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// App-API'et (Functional Foods-appen) kaldes fra både native og — under udvikling
// — fra Expo web på localhost. Browsere håndhæver CORS, så vi åbner /api/* for
// cross-origin-kald. Endpointsene autentificerer via Authorization: Bearer (ingen
// cookies), så det er sikkert at tillade alle origins uden credentials.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Local macOS filesystems and some tooling can behave oddly with non-ascii route segments.
  // To make /vægttab reliable everywhere, we internally serve the ASCII route /vaegttab.
  if (pathname === '/vægttab') {
    const url = request.nextUrl.clone()
    url.pathname = '/vaegttab'
    return NextResponse.rewrite(url)
  }

  // /api/images/proxy sætter selv CORS — undgå dublerede headers.
  if (pathname.startsWith('/api/') && pathname !== '/api/images/proxy') {
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
    }
    const res = NextResponse.next()
    for (const [key, value] of Object.entries(CORS_HEADERS)) res.headers.set(key, value)
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/vægttab', '/api/:path*'],
}
