import { json } from '../../../../lib/http'
import { nomeCookie, opcoesCookie } from '../../../../lib/sessao'

export const runtime = 'nodejs'

export async function POST() {
  const resposta = json({ ok: true })
  resposta.cookies.set(nomeCookie(), '', opcoesCookie(0))
  return resposta
}
