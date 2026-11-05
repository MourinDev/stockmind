'use client'

/*
  Estado da aplicação e ações que as telas chamam.
  A sessão mora no cookie httpOnly. Este provider só espelha o usuário
  e os dados que a API devolve, no formato que as telas já consomem.
*/
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { estaCritico, nivelEstoque, validarProduto } from '../lib/regras'
import { ROTA_LOGIN, ROTAS } from '../lib/rotas'
import type { DadosFormularioProduto, MovimentacaoApi, MovimentacaoTela, Perfil, ProdutoApi, ProdutoTela, ResumoGeracao, Sessao, SugestaoApi, UsuarioTela } from '../types/dominio'
import type { AvisoTela, PedidoMovimentacao, ValorEstoque } from '../types/estoque'

const EstoqueContext = createContext<ValorEstoque | null>(null)

export function useEstoque() {
  const contexto = useContext(EstoqueContext)
  if (!contexto) throw new Error('useEstoque precisa estar dentro do ProvedorEstoque.')
  return contexto
}

function cargoDe(perfil: Perfil): 'Gestor' | 'Operador' {
  return perfil === 'admin' ? 'Gestor' : 'Operador'
}

function usuarioTela(usuario: Sessao): UsuarioTela {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    cargo: cargoDe(usuario.perfil),
  }
}

function produtoTela(produto: ProdutoApi) {
  return {
    id: produto.id,
    codigo: produto.codigo,
    descricao: produto.descricao,
    categoria: produto.categoria ?? '',
    quantidade: produto.quantidadeAtual,
    estoqueMinimo: produto.estoqueMinimo,
    valorUnitario: produto.valorVenda,
  }
}

function dataOcorrenciaDe(dataHora: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dataHora))
}

function movimentacaoTela(movimentacao: MovimentacaoApi): MovimentacaoTela {
  return {
    id: movimentacao.id,
    produtoId: movimentacao.produtoId,
    tipo: movimentacao.tipo === 'entrada' ? 'ENTRADA' : 'SAIDA',
    quantidade: movimentacao.quantidade,
    dataOcorrencia: dataOcorrenciaDe(movimentacao.dataHora),
    observacao: movimentacao.observacao ?? '',
    usuarioResponsavel: movimentacao.usuario?.nome ?? '',
  }
}

function registro(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {}
  return valor as Record<string, unknown>
}

function mensagem(valor: unknown, fallback: string) {
  const erro = registro(valor).erro
  return typeof erro === 'string' && erro ? erro : fallback
}

function comoProduto(valor: unknown): ProdutoApi {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('Resposta de produto inválida.')
  return valor as ProdutoApi
}

function comoSessao(valor: unknown): Sessao {
  if (!valor || typeof valor !== 'object') throw new Error('Sessão inválida.')
  return valor as Sessao
}

async function api(caminho: string, opcoes: RequestInit = {}) {
  const resposta = await fetch(caminho, {
    ...opcoes,
    headers: {
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opcoes.headers as Record<string, string> | undefined),
    },
    credentials: 'include',
  })
  const corpo: unknown = await resposta.json().catch(() => ({}))
  return { resposta, corpo }
}

async function listarSugestoes() {
  const { resposta, corpo } = await api('/api/ia/sugestoes')
  if (!resposta.ok) return { ok: false as const, erro: mensagem(corpo, 'Não foi possível carregar as sugestões.') }
  return { ok: true as const, sugestoes: (Array.isArray(corpo) ? corpo : []) as SugestaoApi[] }
}

async function gerarSugestoes() {
  const { resposta, corpo } = await api('/api/ia/gerar', { method: 'POST' })
  if (!resposta.ok) return { ok: false as const, erro: mensagem(corpo, 'Não foi possível gerar as sugestões.') }
  return { ok: true as const, resumo: registro(corpo) as unknown as ResumoGeracao }
}

async function decidirSugestao(id: number, status: 'aceita' | 'ignorada') {
  const { resposta, corpo } = await api(`/api/ia/sugestoes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  if (!resposta.ok) return { ok: false as const, erro: mensagem(corpo, 'Não foi possível atualizar a sugestão.') }
  return { ok: true as const, sugestao: registro(corpo) as unknown as SugestaoApi }
}

async function listarMovimentacoes() {
  const itens: ReturnType<typeof movimentacaoTela>[] = []
  let pagina = 1
  let total = Infinity

  while (itens.length < total) {
    const { resposta, corpo } = await api(`/api/movimentacoes?pagina=${pagina}&porPagina=100`)
    if (!resposta.ok) throw new Error(mensagem(corpo, 'Não foi possível carregar as movimentações.'))
    const dados = registro(corpo)
    const recebidos = Array.isArray(dados.itens) ? (dados.itens as MovimentacaoApi[]) : []
    if (!recebidos.length) break
    itens.push(...recebidos.map(movimentacaoTela))
    total = typeof dados.total === 'number' ? dados.total : itens.length
    pagina += 1
  }

  return itens
}

export function ProvedorEstoque({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [usuarioLogado, setUsuarioLogado] = useState<ValorEstoque['usuario']>(null)
  const [sessaoPronta, setSessaoPronta] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erroCarga, setErroCarga] = useState('')
  const [produtos, setProdutos] = useState<ValorEstoque['produtos']>([])
  const [movimentacoes, setMovimentacoes] = useState<ValorEstoque['movimentacoes']>([])
  const [menuAberto, setMenuAberto] = useState(false)
  const [aviso, setAviso] = useState<AvisoTela | null>(null)

  useEffect(() => {
    if (!aviso) return
    const timer = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(timer)
  }, [aviso])

  const mostrarAviso = (texto: string, tipo: 'sucesso' | 'erro' = 'sucesso') => setAviso({ texto, tipo, chave: Date.now() })

  async function carregarDados(aindaAtivo = () => true) {
    setCarregando(true)
    setErroCarga('')
    try {
      const [produtosResp, movimentos] = await Promise.all([api('/api/produtos'), listarMovimentacoes()])
      if (!aindaAtivo()) return
      if (!produtosResp.resposta.ok) throw new Error(mensagem(produtosResp.corpo, 'Não foi possível carregar os produtos.'))
      if (!Array.isArray(produtosResp.corpo)) throw new Error('Não foi possível carregar os produtos.')
      setProdutos((produtosResp.corpo as ProdutoApi[]).map(produtoTela))
      setMovimentacoes(movimentos)
    } catch (erro) {
      if (aindaAtivo()) setErroCarga(erro instanceof Error ? erro.message : 'Não foi possível carregar os dados.')
    } finally {
      if (aindaAtivo()) setCarregando(false)
    }
  }

  useEffect(() => {
    let ativo = true
    async function iniciar() {
      const { resposta, corpo } = await api('/api/auth/me')
      if (!ativo) return
      if (resposta.ok) setUsuarioLogado(usuarioTela(comoSessao(registro(corpo).usuario)))
      else if (resposta.status === 401) await api('/api/auth/logout', { method: 'POST' })
      if (ativo) setSessaoPronta(true)
    }
    iniciar()
    return () => {
      ativo = false
    }
  }, [])

  useEffect(() => {
    if (!usuarioLogado) return undefined
    let ativo = true
    carregarDados(() => ativo)
    return () => {
      ativo = false
    }
    // A carga depende de quem entrou, não das funções recriadas a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioLogado?.id])

  async function fazerLogin(email: string, senha: string) {
    const { resposta, corpo } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), senha }),
    })
    if (!resposta.ok) return { ok: false as const, erro: mensagem(corpo, 'E-mail ou senha inválidos') }

    setUsuarioLogado(usuarioTela(comoSessao(registro(corpo).usuario)))
    setMenuAberto(false)
    router.push(ROTAS.dashboard)
    return { ok: true as const }
  }

  async function sair() {
    await api('/api/auth/logout', { method: 'POST' })
    setUsuarioLogado(null)
    setProdutos([])
    setMovimentacoes([])
    setMenuAberto(false)
    router.push(ROTA_LOGIN)
  }

  async function enviarMovimentacao(pedido: PedidoMovimentacao) {
    const { resposta, corpo } = await api('/api/movimentacoes', {
      method: 'POST',
      body: JSON.stringify({
        produtoId: Number(pedido.produtoId),
        tipo: pedido.tipo === 'ENTRADA' ? 'entrada' : 'saida',
        quantidade: Number(pedido.quantidade),
        ...(pedido.observacao?.trim() ? { observacao: pedido.observacao.trim() } : {}),
      }),
    })
    if (!resposta.ok) return { ok: false as const, erro: mensagem(corpo, 'Não foi possível registrar a movimentação.') }

    const dados = registro(corpo)
    const produto = produtoTela(comoProduto(dados.produto))
    setProdutos((lista) => lista.map((item) => (item.id === produto.id ? produto : item)))
    setMovimentacoes((lista) => [...lista, movimentacaoTela(dados.movimentacao as MovimentacaoApi)])
    return { ok: true as const, produto, saldos: { [produto.id]: produto.quantidade } }
  }

  async function salvarProduto(dados: DadosFormularioProduto) {
    const erros = validarProduto(dados, produtos)
    if (Object.keys(erros).length > 0) return { ok: false as const, erros }

    const editando = Boolean(dados.id)
    const corpo: {
      codigo: string
      descricao: string
      categoria: string
      estoqueMinimo: number
      valorVenda: number
      valorCusto?: number
    } = {
      codigo: dados.codigo.trim().toUpperCase(),
      descricao: dados.descricao.trim(),
      categoria: dados.categoria,
      estoqueMinimo: Number(dados.estoqueMinimo),
      valorVenda: Number(dados.valorUnitario),
    }
    if (!editando) corpo.valorCusto = Number(dados.valorUnitario)

    const { resposta, corpo: recebido } = await api(editando ? `/api/produtos/${dados.id}` : '/api/produtos', {
      method: editando ? 'PATCH' : 'POST',
      body: JSON.stringify(corpo),
    })
    if (!resposta.ok) {
      const campos = registro(recebido).campos
      if (campos && typeof campos === 'object') return { ok: false as const, erros: campos as Record<string, string> }
      if (resposta.status === 409) return { ok: false as const, erros: { codigo: mensagem(recebido, 'Código já cadastrado.') } }
      return { ok: false as const, erros: { descricao: mensagem(recebido, 'Não foi possível salvar o produto.') } }
    }

    const produto = produtoTela(comoProduto(recebido))
    setProdutos((lista) => (editando ? lista.map((item) => (item.id === produto.id ? produto : item)) : [...lista, produto]))

    const quantidadeInformada = Number(dados.quantidade)
    const atual = editando ? (produtos.find((item) => item.id === dados.id)?.quantidade ?? produto.quantidade) : 0
    const delta = quantidadeInformada - atual
    if (delta !== 0) {
      const movimento = await enviarMovimentacao({
        produtoId: produto.id,
        tipo: delta > 0 ? 'ENTRADA' : 'SAIDA',
        quantidade: Math.abs(delta),
        observacao: editando ? 'Ajuste de inventário' : 'Quantidade inicial',
      })
      if (!movimento.ok) {
        if (!editando) {
          mostrarAviso(`Produto ${produto.codigo} cadastrado, mas a quantidade inicial não entrou: ${movimento.erro}`, 'erro')
          return { ok: true as const }
        }
        return { ok: false as const, erros: { quantidade: movimento.erro } }
      }
    }

    mostrarAviso(editando ? `Produto ${produto.codigo} atualizado.` : `Produto ${produto.codigo} cadastrado.`)
    return { ok: true as const }
  }

  async function excluirProduto(produto: ProdutoTela) {
    const { resposta, corpo } = await api(`/api/produtos/${produto.id}`, { method: 'DELETE' })
    if (!resposta.ok) {
      mostrarAviso(mensagem(corpo, 'Não foi possível excluir o produto.'), 'erro')
      return { ok: false }
    }
    setProdutos((lista) => lista.filter((item) => item.id !== produto.id))
    mostrarAviso(`Produto ${produto.codigo} excluído.`)
    return { ok: true }
  }

  async function registrarMovimentacoes(pedidos: PedidoMovimentacao[]) {
    const saldos: Record<number, number> = {}
    for (const pedido of pedidos) {
      const resultado = await enviarMovimentacao(pedido)
      if (!resultado.ok) {
        await carregarDados()
        return resultado
      }
      Object.assign(saldos, resultado.saldos)
    }
    return { ok: true as const, saldos }
  }

  async function registrarMovimentacao(pedido: PedidoMovimentacao) {
    const resultado = await registrarMovimentacoes([pedido])
    if (resultado.ok) {
      const produto = produtos.find((item) => item.id === Number(pedido.produtoId))
      const verbo = pedido.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'
      const saldo = resultado.saldos[Number(pedido.produtoId)]
      mostrarAviso(`${verbo} de ${pedido.quantidade} un. em ${produto?.descricao ?? 'produto'}. Saldo atual: ${saldo}.`)
    }
    return resultado
  }

  async function buscarProdutoPorCodigo(codigo: string) {
    const { resposta, corpo } = await api(`/api/produtos/codigo/${encodeURIComponent(codigo.trim())}`)
    if (resposta.status === 404) return { ok: false as const }
    if (!resposta.ok) return { ok: false as const, erro: mensagem(corpo, 'Não foi possível consultar o código.') }
    const produto = produtoTela(comoProduto(corpo))
    setProdutos((lista) => (lista.some((item) => item.id === produto.id) ? lista.map((item) => (item.id === produto.id ? produto : item)) : [...lista, produto]))
    return { ok: true as const, produto }
  }

  function irPara(id: string) {
    setMenuAberto(false)
    const destino = id in ROTAS ? ROTAS[id as keyof typeof ROTAS] : ROTAS.dashboard
    router.push(destino)
    window.scrollTo({ top: 0 })
  }

  const produtosCriticos = produtos.filter(estaCritico).sort((a, b) => nivelEstoque(a) - nivelEstoque(b))

  return (
    <EstoqueContext.Provider
      value={{
        usuario: usuarioLogado,
        sessaoPronta,
        carregando,
        erroCarga,
        produtos,
        movimentacoes,
        produtosCriticos,
        menuAberto,
        setMenuAberto,
        aviso,
        setAviso,
        fazerLogin,
        sair,
        salvarProduto,
        excluirProduto,
        registrarMovimentacao,
        registrarMovimentacoes,
        buscarProdutoPorCodigo,
        listarSugestoes,
        gerarSugestoes,
        decidirSugestao,
        mostrarAviso,
        irPara,
      }}
    >
      {children}
    </EstoqueContext.Provider>
  )
}
