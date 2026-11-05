'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ROTA_LOGIN } from '../lib/rotas'
import { BarraLateral, Cabecalho } from './Layout'
import { useEstoque } from './provedor-estoque'
import { Aviso } from './ui'

export function CascaApp({ children }: { children: ReactNode }) {
  const { usuario, sessaoPronta, carregando, erroCarga, produtosCriticos, menuAberto, setMenuAberto, aviso, setAviso, sair } = useEstoque()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!sessaoPronta) return
    if (!usuario && pathname !== ROTA_LOGIN) router.replace(ROTA_LOGIN)
    if (usuario && pathname === ROTA_LOGIN) router.replace('/')
  }, [sessaoPronta, usuario, pathname, router])

  if (!sessaoPronta) return <p className="p-6 text-sm text-slate-500">Carregando…</p>
  if (!usuario) return pathname === ROTA_LOGIN ? children : null
  if (pathname === ROTA_LOGIN) return null

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <BarraLateral
        totalAlertas={produtosCriticos.length}
        usuario={usuario}
        aberto={menuAberto}
        onFechar={() => setMenuAberto(false)}
        onSair={sair}
      />

      <div className="lg:pl-72">
        <Cabecalho
          usuario={usuario}
          produtosCriticos={produtosCriticos}
          onAbrirMenu={() => setMenuAberto(true)}
          onSair={sair}
        />

        {/* a chave faz a animação de entrada rodar a cada troca de tela */}
        <main key={pathname} className="animar-entrada mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {erroCarga && <p className="mb-4 text-sm text-red-600">{erroCarga}</p>}
          {carregando && <p className="mb-4 text-sm text-slate-500">Carregando dados…</p>}
          {children}
        </main>
      </div>

      {aviso && <Aviso key={aviso.chave} aviso={aviso} onFechar={() => setAviso(null)} />}
    </div>
  )
}
