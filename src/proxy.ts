import { NextResponse } from 'next/server'
import { nomeCookie, verificarSessao } from './lib/sessao'

export async function proxy(request) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(nomeCookie())?.value
  const sessao = await verificarSessao(token)

  if (pathname === '/login') {
    if (sessao) return NextResponse.redirect(new URL('/', request.url))
    return NextResponse.next()
  }

  if (!sessao) return NextResponse.redirect(new URL('/login', request.url))
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
