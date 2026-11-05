'use client'

import TelaIA from '../../components/telas/InteligenciaIA'
import { useEstoque } from '../../components/provedor-estoque'

export default function Page() {
  const { usuario, produtos, movimentacoes, registrarMovimentacao, registrarMovimentacoes, mostrarAviso } = useEstoque()
  if (!usuario) return null

  return (
    <TelaIA
      produtos={produtos}
      movimentacoes={movimentacoes}
      registrarMovimentacao={registrarMovimentacao}
      registrarMovimentacoes={registrarMovimentacoes}
      mostrarAviso={mostrarAviso}
    />
  )
}
