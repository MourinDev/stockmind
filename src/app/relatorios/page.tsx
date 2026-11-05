'use client'

import TelaRelatorios from '../../components/telas/Relatorios'
import { useEstoque } from '../../components/provedor-estoque'

export default function Page() {
  const { usuario, produtos, movimentacoes } = useEstoque()
  if (!usuario) return null
  return <TelaRelatorios produtos={produtos} movimentacoes={movimentacoes} />
}