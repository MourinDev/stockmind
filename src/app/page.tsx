'use client'

import TelaDashboard from '../components/telas/Dashboard'
import { useEstoque } from '../components/provedor-estoque'

export default function Page() {
  const { usuario, produtos, movimentacoes, produtosCriticos, registrarMovimentacao, irPara } = useEstoque()
  if (!usuario) return null

  return (
    <TelaDashboard
      produtos={produtos}
      movimentacoes={movimentacoes}
      usuario={usuario}
      produtosCriticos={produtosCriticos}
      registrarMovimentacao={registrarMovimentacao}
      irPara={irPara}
    />
  )
}
