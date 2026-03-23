import { NextResponse, type NextRequest } from 'next/server'

const USER_COOKIE = 'sidebet_uid'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const userId = request.cookies.get(USER_COOKIE)?.value

  const publicRoutes = ['/onboarding']
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r))
  const isJoin = pathname.startsWith('/join/')

  if (!userId && !isPublic && !isJoin) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = userId ? '/home' : '/onboarding'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
