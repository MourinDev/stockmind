import { SignJWT, jwtVerify } from 'jose'
import type { ClaimsSessao, Perfil } from '../types/dominio'

const COOKIE = 'stockmind_sessao'
const OITO_HORAS_SEGUNDOS = 60 * 60 * 8

export function nomeCookie() {
  return COOKIE
}

export function opcoesCookie(maxAge = OITO_HORAS_SEGUNDOS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}

function chave() {
  const segredo = process.env.SESSION_SECRET
  if (!segredo) {
    throw new Error('SESSION_SECRET não está definida.')
  }
  return new TextEncoder().encode(segredo)
}

export async function assinarSessao({ id, perfil, nome }: { id: number; perfil: Perfil; nome: string }) {
  return new SignJWT({ perfil, nome })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(id))
    .setIssuedAt()
    .setExpirationTime(`${OITO_HORAS_SEGUNDOS}s`)
    .sign(chave())
}

export async function verificarSessao(token: string | undefined): Promise<ClaimsSessao | null> {
  if (!token || !process.env.SESSION_SECRET) return null
  try {
    const { payload } = await jwtVerify(token, chave())
    const id = Number(payload.sub)
    if (!Number.isInteger(id) || id <= 0) return null
    if (payload.perfil !== 'admin' && payload.perfil !== 'operador') return null
    if (typeof payload.nome !== 'string' || !payload.nome) return null
    return { id, perfil: payload.perfil, nome: payload.nome } as ClaimsSessao
  } catch {
    return null
  }
}
