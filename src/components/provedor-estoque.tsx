'use client'

/*
  Estado da aplicação e ações que as telas chamam.
  A sessão mora no cookie httpOnly. Este provider só espelha o usuário
  e os dados que a API devolve, no formato que as telas já consomem.
*/
import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { estaCritico, nivelEstoque, validarProduto } from '../lib/regras'
import { ROTA_LOGIN, ROTAS } from '../lib/rotas'

const EstoqueContext = createContext(null)

export function useEstoque() {
  const contexto = useContext(EstoqueContext)
  if (!contexto) throw new Error('useEstoque precisa estar dentro do ProvedorEstoque.')
  return contexto
}

function cargoDe(perfil) {
  return perfil === 'admin' ? 'Gestor' : 'Operador'
}

function usuarioTela(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    cargo: cargoDe(usuario.perfil),
  }
}

function produtoTela(produto) {
  return {
    id: produto.id,
    codigo: produto.codigo,
    descricao: produto.descricao,
    categoria: produto.categoria,
    quantidade: produto.quantidadeAtual,
    estoqueMinimo: produto.estoqueMinimo,
    valorUnitario: produto.valorVenda,
  }
}

function dataOcorrenciaDe(dataHora) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dataHora))
}

function movimentacaoTela(movimentacao) {
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

async function api(caminho, opcoes = {}) {
  const resposta = await fetch(caminho, {
    ...opcoes,
    headers: {
      ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
      ...opcoes.headers,
    },
    credentials: 'include',
  })
  const corpo = await resposta.json().catch(() => ({}))
  return { resposta, corpo }
}

async function listarSugestoes() {
  const { resposta, corpo } = await api('/api/ia/sugestoes')
  if (!resposta.ok) return { ok: false, erro: corpo.erro || 'Não foi possível carregar as sugestões.' }
  return { ok: true, sugestoes: corpo }
}

async function gerarSugestoes() {
  const { resposta, corpo } = await api('/api/ia/gerar', { method: 'POST' })
  if (!resposta.ok) return { ok: false, erro: corpo.erro || 'Não foi possível gerar as sugestões.' }
  return { ok: true, resumo: corpo }
}

async function decidirSugestao(id, status) {
  const { resposta, corpo } = await api(`/api/ia/sugestoes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
  if (!resposta.ok) return { ok: false, erro: corpo.erro || 'Não foi possível atualizar a sugestão.' }
  return { ok: true, sugestao: corpo }
}

async function listarMovimentacoes() {
  const itens = []
  let pagina = 1
  let total = Infinity

  while (itens.length < total) {
    const { resposta, corpo } = await api(`/api/movimentacoes?pagina=${pagina}&porPagina=100`)
    if (!resposta.ok) throw new Error(corpo.erro || 'Não foi possível carregar as movimentações.')
    itens.push(...corpo.itens.map(movimentacaoTela))
    total = corpo.total
    if (!corpo.itens?.length) break
    pagina += 1
  }

  return itens
}

export function ProvedorEstoque({ children }) {
  const router = useRouter()
  const [usuarioLogado, setUsuarioLogado] = useState(null)
  const [sessaoPronta, setSessaoPronta] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erroCarga, setErroCarga] = useState('')
  const [produtos, setProdutos] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [menuAberto, setMenuAberto] = useState(false)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    if (!aviso) return
    const timer = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(timer)
  }, [aviso])

  const mostrarAviso = (texto, tipo = 'sucesso') => setAviso({ texto, tipo, chave: Date.now() })

  async function carregarDados(aindaAtivo = () => true) {
    setCarregando(true)
    setErroCarga('')
    try {
      const [produtosResp, movimentos] = await Promise.all([api('/api/produtos'), listarMovimentacoes()])
      if (!aindaAtivo()) return
      if (!produtosResp.resposta.ok) throw new Error(produtosResp.corpo.erro || 'Não foi possível carregar os produtos.')
      setProdutos(produtosResp.corpo.map(produtoTela))
      setMovimentacoes(movimentos)
    } catch (erro) {
      if (aindaAtivo()) setErroCarga(erro.message || 'Não foi possível carregar os dados.')
    } finally {
      if (aindaAtivo()) setCarregando(false)
    }
  }

  useEffect(() => {
    let ativo = true
    async function iniciar() {
      const { resposta, corpo } = await api('/api/auth/me')
      if (!ativo) return
      if (resposta.ok) setUsuarioLogado(usuarioTela(corpo.usuario))
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

  async function fazerLogin(email, senha) {
    const { resposta, corpo } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), senha }),
    })
    if (!resposta.ok) return { ok: false, erro: corpo.erro || 'E-mail ou senha inválidos' }

    setUsuarioLogado(usuarioTela(corpo.usuario))
    setMenuAberto(false)
    router.push(ROTAS.dashboard)
    return { ok: true }
  }

  async function sair() {
    await api('/api/auth/logout', { method: 'POST' })
    setUsuarioLogado(null)
    setProdutos([])
    setMovimentacoes([])
    setMenuAberto(false)
    router.push(ROTA_LOGIN)
  }

  async function enviarMovimentacao(pedido) {
    const { resposta, corpo } = await api('/api/movimentacoes', {
      method: 'POST',
      body: JSON.stringify({
        produtoId: Number(pedido.produtoId),
        tipo: pedido.tipo === 'ENTRADA' ? 'entrada' : 'saida',
        quantidade: Number(pedido.quantidade),
        ...(pedido.observacao?.trim() ? { observacao: pedido.observacao.trim() } : {}),
      }),
    })
    if (!resposta.ok) return { ok: false, erro: corpo.erro || 'Não foi possível registrar a movimentação.' }

    const produto = produtoTela(corpo.produto)
    setProdutos((lista) => lista.map((item) => (item.id === produto.id ? produto : item)))
    setMovimentacoes((lista) => [...lista, movimentacaoTela(corpo.movimentacao)])
    return { ok: true, produto, saldos: { [produto.id]: produto.quantidade } }
  }

  async function salvarProduto(dados) {
    const erros = validarProduto(dados, produtos)
    if (Object.keys(erros).length > 0) return { ok: false, erros }

    const editando = Boolean(dados.id)
    const corpo = {
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
      if (recebido.campos) return { ok: false, erros: recebido.campos }
      if (resposta.status === 409) return { ok: false, erros: { codigo: recebido.erro } }
      return { ok: false, erros: { descricao: recebido.erro || 'Não foi possível salvar o produto.' } }
    }

    const produto = produtoTela(recebido)
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
          return { ok: true }
        }
        return { ok: false, erros: { quantidade: movimento.erro } }
      }
    }

    mostrarAviso(editando ? `Produto ${produto.codigo} atualizado.` : `Produto ${produto.codigo} cadastrado.`)
    return { ok: true }
  }

  async function excluirProduto(produto) {
    const { resposta, corpo } = await api(`/api/produtos/${produto.id}`, { method: 'DELETE' })
    if (!resposta.ok) {
      mostrarAviso(corpo.erro || 'Não foi possível excluir o produto.', 'erro')
      return { ok: false }
    }
    setProdutos((lista) => lista.filter((item) => item.id !== produto.id))
    mostrarAviso(`Produto ${produto.codigo} excluído.`)
    return { ok: true }
  }

  async function registrarMovimentacoes(pedidos) {
    const saldos = {}
    for (const pedido of pedidos) {
      const resultado = await enviarMovimentacao(pedido)
      if (!resultado.ok) {
        await carregarDados()
        return resultado
      }
      Object.assign(saldos, resultado.saldos)
    }
    return { ok: true, saldos }
  }

  async function registrarMovimentacao(pedido) {
    const resultado = await registrarMovimentacoes([pedido])
    if (resultado.ok) {
      const produto = produtos.find((item) => item.id === Number(pedido.produtoId))
      const verbo = pedido.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'
      const saldo = resultado.saldos[Number(pedido.produtoId)]
      mostrarAviso(`${verbo} de ${pedido.quantidade} un. em ${produto?.descricao ?? 'produto'}. Saldo atual: ${saldo}.`)
    }
    return resultado
  }

  async function buscarProdutoPorCodigo(codigo) {
    const { resposta, corpo } = await api(`/api/produtos/codigo/${encodeURIComponent(codigo.trim())}`)
    if (resposta.status === 404) return { ok: false }
    if (!resposta.ok) return { ok: false, erro: corpo.erro || 'Não foi possível consultar o código.' }
    const produto = produtoTela(corpo)
    setProdutos((lista) => (lista.some((item) => item.id === produto.id) ? lista.map((item) => (item.id === produto.id ? produto : item)) : [...lista, produto]))
    return { ok: true, produto }
  }

  function irPara(id) {
    setMenuAberto(false)
    router.push(ROTAS[id] ?? ROTAS.dashboard)
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
