'use client'

import TelaLogin from '../../components/telas/Login'
import { useEstoque } from '../../components/provedor-estoque'

export default function Page() {
  const { usuario, fazerLogin } = useEstoque()
  if (usuario) return null
  return <TelaLogin onEntrar={fazerLogin} />
}
