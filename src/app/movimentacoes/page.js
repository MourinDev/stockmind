'use client'

import TelaMovimentacoes from '../../components/telas/Movimentacoes'
import { useEstoque } from '../../components/provedor-estoque'

export default function Page() {
  const { usuario, produtos, movimentacoes, registrarMovimentacao } = useEstoque()
  if (!usuario) return null
  return <TelaMovimentacoes produtos={produtos} movimentacoes={movimentacoes} registrarMovimentacao={registrarMovimentacao} />
}
