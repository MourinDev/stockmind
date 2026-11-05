import { exigirSessao } from '../../../../lib/auth'
import { erroInterno, json } from '../../../../lib/http'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const acesso = await exigirSessao()
    if (acesso.resposta) return acesso.resposta
    return json({ usuario: acesso.sessao })
  } catch (erro) {
    return erroInterno(erro, 'GET /api/auth/me')
  }
}
