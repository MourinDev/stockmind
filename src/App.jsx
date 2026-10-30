/*
  Componente principal: guarda o estado do sistema e as ações que o alteram.
  As telas só recebem dados por props e chamam estas ações.
*/
import { useEffect, useState } from 'react'
import { MOVIMENTACOES_INICIAIS, PRODUTOS_INICIAIS, USUARIOS_DEMO } from './dados'
import { estaCritico, nivelEstoque, validarProduto } from './regras'
import { BarraLateral, Cabecalho } from './componentes/Layout'
import { Aviso } from './componentes/ui'
import TelaLogin from './telas/Login'
import TelaDashboard from './telas/Dashboard'
import TelaProdutos from './telas/Produtos'
import TelaMovimentacoes from './telas/Movimentacoes'
import TelaQRCode from './telas/OperacaoQR'
import TelaIA from './telas/InteligenciaIA'
import TelaRelatorios from './telas/Relatorios'

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null)
  const [produtos, setProdutos] = useState(PRODUTOS_INICIAIS)
  const [movimentacoes, setMovimentacoes] = useState(MOVIMENTACOES_INICIAIS)
  const [telaAtual, setTelaAtual] = useState('dashboard')
  const [menuAberto, setMenuAberto] = useState(false)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    if (!aviso) return
    const timer = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(timer)
  }, [aviso])

  const mostrarAviso = (texto, tipo = 'sucesso') => setAviso({ texto, tipo, chave: Date.now() })

  /* -----------------------------------------------------------------------
     CAMADA DE DADOS
     Hoje estas funções alteram o estado local. Com o back-end, cada uma vira
     uma chamada async à API e o estado é atualizado com a resposta:
       fazerLogin             -> POST   /api/auth/login
       salvarProduto (novo)   -> POST   /api/produtos
       salvarProduto (edição) -> PUT    /api/produtos/:id
       excluirProduto         -> DELETE /api/produtos/:id
       registrarMovimentacoes -> POST   /api/movimentacoes
     E os dados iniciais viriam de GET /api/produtos e GET /api/movimentacoes.
     Todas devolvem { ok, erro } para as telas não precisarem mudar.
     ----------------------------------------------------------------------- */

  function fazerLogin(email, senha) {
    const encontrado = USUARIOS_DEMO.find((u) => u.email === email.trim().toLowerCase() && u.senha === senha)
    if (!encontrado) return { ok: false, erro: 'E-mail ou senha inválidos.' }

    const { senha: _senha, ...dadosPublicos } = encontrado
    setUsuarioLogado({ ...dadosPublicos, token: `demo-${Date.now()}` })
    setTelaAtual('dashboard')
    return { ok: true }
  }

  function sair() {
    setUsuarioLogado(null)
    setMenuAberto(false)
  }

  function salvarProduto(dados) {
    const erros = validarProduto(dados, produtos)
    if (Object.keys(erros).length > 0) return { ok: false, erros }

    const produto = {
      id: dados.id ?? Math.max(0, ...produtos.map((p) => p.id)) + 1,
      codigo: dados.codigo.trim().toUpperCase(),
      descricao: dados.descricao.trim(),
      categoria: dados.categoria,
      quantidade: Number(dados.quantidade),
      estoqueMinimo: Number(dados.estoqueMinimo),
      valorUnitario: Number(dados.valorUnitario),
    }

    if (dados.id) {
      setProdutos((lista) => lista.map((p) => (p.id === produto.id ? produto : p)))
      mostrarAviso(`Produto ${produto.codigo} atualizado.`)
    } else {
      setProdutos((lista) => [...lista, produto])
      mostrarAviso(`Produto ${produto.codigo} cadastrado.`)
    }
    return { ok: true }
  }

  // Produto com histórico não pode sumir: as movimentações apontam para ele
  // (no PostgreSQL isso é a chave estrangeira movimentacoes.produto_id).
  function excluirProduto(produto) {
    if (movimentacoes.some((m) => m.produtoId === produto.id)) {
      mostrarAviso(`${produto.descricao} tem movimentações registradas e não pode ser excluído.`, 'erro')
      return { ok: false }
    }
    setProdutos((lista) => lista.filter((p) => p.id !== produto.id))
    mostrarAviso(`Produto ${produto.codigo} excluído.`)
    return { ok: true }
  }

  // Regra central do estoque: ENTRADA soma, SAÍDA subtrai e nunca deixa negativo.
  // Recebe uma lista para a ordem de reposição da IA gravar vários itens de uma vez.
  function registrarMovimentacoes(pedidos) {
    const saldos = Object.fromEntries(produtos.map((p) => [p.id, p.quantidade]))
    const novas = []
    let proximoId = Math.max(0, ...movimentacoes.map((m) => m.id)) + 1

    for (const { produtoId, tipo, quantidade, dataOcorrencia, observacao } of pedidos) {
      const produto = produtos.find((p) => p.id === Number(produtoId))
      const qtd = Number(quantidade)

      if (!produto) return { ok: false, erro: 'Selecione um produto.' }
      if (!Number.isInteger(qtd) || qtd <= 0) return { ok: false, erro: 'A quantidade deve ser um número inteiro maior que zero.' }
      if (!dataOcorrencia) return { ok: false, erro: 'Informe a data da ocorrência.' }
      if (tipo === 'SAIDA' && qtd > saldos[produto.id]) {
        return {
          ok: false,
          erro: `Saldo insuficiente: ${produto.descricao} tem só ${saldos[produto.id]} unidade(s) e a saída pedida é de ${qtd}.`,
        }
      }

      saldos[produto.id] += tipo === 'ENTRADA' ? qtd : -qtd
      novas.push({
        id: proximoId++,
        produtoId: produto.id,
        tipo,
        quantidade: qtd,
        dataOcorrencia,
        observacao: observacao?.trim() || (tipo === 'ENTRADA' ? 'Entrada' : 'Saída'),
        usuarioResponsavel: usuarioLogado.nome,
      })
    }

    // Só grava se todos os itens passaram (no banco, isso é uma transação)
    setProdutos((lista) => lista.map((p) => ({ ...p, quantidade: saldos[p.id] })))
    setMovimentacoes((lista) => [...lista, ...novas])
    return { ok: true, saldos }
  }

  function registrarMovimentacao(pedido) {
    const resultado = registrarMovimentacoes([pedido])
    if (resultado.ok) {
      const produto = produtos.find((p) => p.id === Number(pedido.produtoId))
      const verbo = pedido.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'
      mostrarAviso(`${verbo} de ${pedido.quantidade} un. em ${produto.descricao}. Saldo atual: ${resultado.saldos[produto.id]}.`)
    }
    return resultado
  }

  if (!usuarioLogado) return <TelaLogin onEntrar={fazerLogin} />

  const produtosCriticos = produtos.filter(estaCritico).sort((a, b) => nivelEstoque(a) - nivelEstoque(b))
  const irPara = (tela) => {
    setTelaAtual(tela)
    setMenuAberto(false)
    window.scrollTo({ top: 0 })
  }
  const propsComuns = { produtos, movimentacoes, usuario: usuarioLogado, registrarMovimentacao, irPara }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <BarraLateral
        telaAtual={telaAtual}
        totalAlertas={produtosCriticos.length}
        usuario={usuarioLogado}
        aberto={menuAberto}
        onFechar={() => setMenuAberto(false)}
        onNavegar={irPara}
        onSair={sair}
      />

      <div className="lg:pl-72">
        <Cabecalho
          telaAtual={telaAtual}
          usuario={usuarioLogado}
          produtosCriticos={produtosCriticos}
          onAbrirMenu={() => setMenuAberto(true)}
          onNavegar={irPara}
          onSair={sair}
        />

        {/* a chave faz a animação de entrada rodar a cada troca de tela */}
        <main key={telaAtual} className="animar-entrada mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {telaAtual === 'dashboard' && <TelaDashboard {...propsComuns} produtosCriticos={produtosCriticos} />}
          {telaAtual === 'produtos' && <TelaProdutos produtos={produtos} onSalvar={salvarProduto} onExcluir={excluirProduto} />}
          {telaAtual === 'movimentacoes' && <TelaMovimentacoes {...propsComuns} />}
          {telaAtual === 'qrcode' && <TelaQRCode {...propsComuns} />}
          {telaAtual === 'ia' && <TelaIA {...propsComuns} registrarMovimentacoes={registrarMovimentacoes} mostrarAviso={mostrarAviso} />}
          {telaAtual === 'relatorios' && <TelaRelatorios produtos={produtos} movimentacoes={movimentacoes} />}
        </main>
      </div>

      {aviso && <Aviso key={aviso.chave} aviso={aviso} onFechar={() => setAviso(null)} />}
    </div>
  )
}
