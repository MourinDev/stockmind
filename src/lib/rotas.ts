// Ids do menu antigo viram caminhos do App Router.
export const ROTAS = {
  dashboard: '/',
  produtos: '/produtos',
  movimentacoes: '/movimentacoes',
  qrcode: '/qrcode',
  ia: '/ia',
  relatorios: '/relatorios',
}

export const ROTA_LOGIN = '/login'

export function idDaRota(pathname) {
  const encontrada = Object.entries(ROTAS).find(([, href]) => href === pathname)
  return encontrada ? encontrada[0] : 'dashboard'
}
