'use client'

import TelaIA from '../../components/telas/InteligenciaIA'
import { useEstoque } from '../../components/provedor-estoque'

export default function Page() {
  const { usuario, listarSugestoes, gerarSugestoes, decidirSugestao, mostrarAviso } = useEstoque()
  if (!usuario) return null

  return (
    <TelaIA
      podeGerenciar={usuario.perfil === 'admin'}
      listarSugestoes={listarSugestoes}
      gerarSugestoes={gerarSugestoes}
      decidirSugestao={decidirSugestao}
      mostrarAviso={mostrarAviso}
    />
  )
}
