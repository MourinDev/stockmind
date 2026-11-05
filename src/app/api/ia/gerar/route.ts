import { exigirSessao } from '../../../../lib/auth'
import { erroInterno, json } from '../../../../lib/http'
import { gerarSugestoes } from '../../../../lib/ia/gerar-sugestoes'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const acesso = await exigirSessao(['admin'])
    if (acesso.resposta) return acesso.resposta
    return json(await gerarSugestoes())
  } catch (erro) {
    return erroInterno(erro, 'POST /api/ia/gerar')
  }
}
