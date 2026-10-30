/*
  TELA 0: Login. Sem usuário autenticado, nenhuma outra tela é exibida.
*/
import { useState } from 'react'
import { BellRing, BrainCircuit, Eye, EyeOff, Lock, Mail, QrCode, ShieldCheck } from 'lucide-react'
import { USUARIOS_DEMO } from '../dados'
import { Botao, Campo, MensagemErro, classeEntrada } from '../componentes/ui'

const DESTAQUES = [
  { icone: BellRing, titulo: 'Alertas de ruptura', texto: 'Aviso automático quando um item chega no estoque mínimo.' },
  { icone: BrainCircuit, titulo: 'Reposição com IA', texto: 'Sugestão de compra calculada pelo giro real de cada produto.' },
  { icone: QrCode, titulo: 'Operação por QR Code', texto: 'Entrada e saída direto da prateleira, com um toque.' },
]

export default function TelaLogin({ onEntrar }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')

  function enviar(evento) {
    evento.preventDefault()
    if (!email.trim() || !senha) {
      setErro('Preencha o e-mail e a senha.')
      return
    }
    const resultado = onEntrar(email, senha)
    if (!resultado.ok) setErro(resultado.erro)
  }

  function preencherDemo(usuario) {
    setEmail(usuario.email)
    setSenha(usuario.senha)
    setErro('')
  }

  return (
    <div className="grid min-h-screen font-sans lg:grid-cols-2">
      {/* Painel da marca (só no computador) */}
      <div className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-royal/60 blur-3xl" />
          <div className="absolute -bottom-40 -right-20 h-[28rem] w-[28rem] rounded-full bg-teal-marca/40 blur-3xl" />
          <div className="fundo-grade absolute inset-0 opacity-20" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <BrainCircuit size={24} />
          </div>
          <p className="text-2xl font-extrabold">
            STOCK<span className="bg-gradient-to-r from-blue-400 to-teal-300 bg-clip-text text-transparent">MIND</span>
          </p>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight">
            Seu estoque no controle.{' '}
            <span className="bg-gradient-to-r from-blue-400 to-teal-300 bg-clip-text text-transparent">Sem planilha.</span>
          </h1>
          <p className="mt-4 text-slate-300">
            Feito para o pequeno comércio que quer parar de perder venda por falta de produto e dinheiro parado na prateleira.
          </p>

          <div className="mt-10 space-y-5">
            {DESTAQUES.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icone size={18} className="text-teal-300" />
                </div>
                <div>
                  <p className="font-semibold">{titulo}</p>
                  <p className="text-sm text-slate-400">{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-500">Projeto Integrado de Engenharia de Produto · Uniceplac 2026</p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center bg-slate-50 p-4 sm:p-8">
        <div className="animar-entrada w-full max-w-md">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            {/* o brilho extra deixa o fundo cinza claro da logo branco, igual ao cartão */}
            <img
              src="./logo.jpg"
              alt="StockMind - Sistema Inteligente de Controle de Estoque"
              className="mx-auto mb-6 w-full max-w-[300px] brightness-[1.07] contrast-[1.05]"
            />
            <h2 className="text-2xl font-extrabold text-slate-900">Entrar</h2>
            <p className="mb-6 mt-1 text-sm text-slate-500">Acesse o painel com sua conta.</p>

            <form onSubmit={enviar} className="space-y-4" noValidate>
              <Campo rotulo="E-mail">
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${classeEntrada(!!erro)} pl-10`}
                    placeholder="seu@email.com"
                    autoComplete="username"
                  />
                </div>
              </Campo>
              <Campo rotulo="Senha">
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className={`${classeEntrada(!!erro)} pl-10 pr-10`}
                    placeholder="••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Campo>

              <MensagemErro texto={erro} />

              <Botao type="submit" className="w-full py-3 text-base">
                Entrar no sistema
              </Botao>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> acesso de demonstração <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {USUARIOS_DEMO.map((u) => (
                <button
                  key={u.id}
                  onClick={() => preencherDemo(u)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm transition hover:border-royal-claro hover:bg-blue-50/50"
                >
                  <span className="block font-bold text-slate-800">{u.cargo}</span>
                  <span className="block truncate text-xs text-slate-500">{u.email}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck size={14} /> Acesso restrito a usuários cadastrados
          </p>
        </div>
      </div>
    </div>
  )
}
