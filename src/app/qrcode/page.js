'use client'

import TelaQRCode from '../../components/telas/OperacaoQR'
import { useEstoque } from '../../components/provedor-estoque'

export default function Page() {
  const { usuario, produtos, registrarMovimentacao } = useEstoque()
  if (!usuario) return null
  return <TelaQRCode produtos={produtos} registrarMovimentacao={registrarMovimentacao} />
}
