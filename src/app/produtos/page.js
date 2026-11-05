'use client'

import TelaProdutos from '../../components/telas/Produtos'
import { useEstoque } from '../../components/provedor-estoque'

export default function Page() {
  const { usuario, produtos, salvarProduto, excluirProduto } = useEstoque()
  if (!usuario) return null
  return <TelaProdutos produtos={produtos} onSalvar={salvarProduto} onExcluir={excluirProduto} podeGerenciar={usuario.perfil === 'admin'} />
}
