# CLAUDE.md — stockmind

## Contexto sob demanda
Vault: `/Users/joaosantana/Documents/Obsidian Vault`
NÃO leia o vault inteiro nem o INDEX.md. Antes de escrever código, leia **só** as notas da tarefa atual:

| Se a tarefa envolve… | Leia |
|---|---|
| Qualquer coisa (1× por sessão) | `01-Arquitetura-e-Stack/projetos/stockmind.md` |
| Tela, componente, CSS | `02-Design-e-Identidade-UI/principios-anti-ia.md` + `02-Design-e-Identidade-UI/tokens/tokens-stockmind.md` |
| Layout, densidade, botões | `02-Design-e-Identidade-UI/densidade-e-layout.md` + `componentes-base.md` |
| Vazio, erro, loading, sucesso | `02-Design-e-Identidade-UI/estados.md` + `05-Copy-e-UX-Writing/microcopy.md` |
| Lógica, API, refactor | `03-Craftsmanship-de-Codigo/regras-gerais.md` + `erros.md` |
| Componente novo ou > 150 linhas | `03-Craftsmanship-de-Codigo/componentes-react.md` |
| Tipos, validação | `03-Craftsmanship-de-Codigo/typescript-e-zod.md` |
| Banco, Prisma, migração | `01-Arquitetura-e-Stack/dados-prisma.md` |
| Login, sessão, proxy/middleware | `01-Arquitetura-e-Stack/auth-e-sessao.md` |
| WhatsApp, cron, serviço externo | `01-Arquitetura-e-Stack/integracoes.md` |
| Prompt, LLM, "IA" | `04-Prompts-e-Agentes-IA/ia-deterministica.md` primeiro; depois `anatomia-system-prompt.md`, `schemas-de-saida.md`, `fallback-e-custos.md` |
| Qualquer texto visível ao usuário | `05-Copy-e-UX-Writing/voz-e-tom.md` + `blacklist.md` (+ `glossario-dominio.md`) |

- Tarefa cruza áreas → some as linhas. Nenhuma linha se aplica → não leia nada.
- Nota contradiz o código → **o código vence**; avise e proponha a correção da nota.
- Não siga `[[links]]` entre notas por conta própria; só se a tarefa exigir.

## Antes de dizer "pronto"
1. `npm run typecheck && npm test` passa. Mexeu em config, rota ou proxy → `npm run build`.
2. Revise o diff com `03-Craftsmanship-de-Codigo/checklist-revisao-codigo.md`.
3. Mexeu em UI → `02-Design-e-Identidade-UI/checklist-revisao-visual.md` e screenshot em 390px e 1280px.
4. Texto novo → rode o grep de `05-Copy-e-UX-Writing/blacklist.md` nos arquivos alterados.
5. Resposta final, curta: o que mudou, arquivos tocados, o que **não** foi verificado.

## Este projeto
- Stack: Next 16 (`src/proxy.ts`) · React 19 · Tailwind v3 · Prisma 7 + Neon · jose · zod 3 · código em português
- Comandos: `npm run dev` · `npm run typecheck` · `npm test` · `npm run db:migrate` · `npm run db:studio`
- Não editar: `src/generated/prisma/**`, `.env`
- Regras que não podem quebrar: código e `docs/` não podem divergir (apresentação ao vivo); sugestão de reposição é estatística, não ML (`docs/ia.md`)
