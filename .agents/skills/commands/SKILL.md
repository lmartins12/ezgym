---
name: commands
description: Comandos do projeto EzGym (pnpm) — use sempre que precisar rodar dev server, testes, lint, build de produção, format, ou validar uma tarefa antes de considerar concluída.
---

# Comandos — EzGym (pnpm)

pnpm é **obrigatório** (versão fixada em `packageManager` no `package.json`; nunca npm/yarn). Node 20+ e `corepack enable` resolvem a versão. Windows/PowerShell: comandos rodam na raiz do repo.

## Scripts

| Comando | O que faz |
| --- | --- |
| `pnpm install` | instala deps (lockfile `pnpm-lock.yaml` é fonte da verdade) |
| `pnpm start` | dev server (`ng serve`) — **sem** service worker |
| `pnpm test` | Vitest via `ng test` — roda todos os `*.spec.ts` co-localizados |
| `pnpm lint` | ESLint — **inclui as regras de camadas** (fronteira violada = lint falha) |
| `pnpm build` | produção em `www/` — **com** service worker (`ngsw`) |
| `pnpm format` | Prettier em `src/**/*.{ts,html}` (não formata SCSS) |
| `pnpm watch` | build watch em modo development |

## Validação obrigatória

Antes de considerar **qualquer** tarefa concluída:

```powershell
pnpm lint; if ($?) { pnpm test }; if ($?) { pnpm build }
```

- `pnpm lint` deve passar **zero** erros (as regras `no-restricted-imports` de camada falham aqui, não em runtime).
- `pnpm test` — todos os specs passando (fake-indexeddb; sem banco externo).
- `pnpm build` — warnings de budget de SCSS (`anyComponentStyle`) **pré-existentes são conhecidos**; warning novo é regression e precisa ser resolvido.
- `pnpm format` é opcional no fim, mas o código novo deve nascer formatado.

## Armadilhas

- Nunca rodar `npm install`/`npx` ad-hoc para adicionar dep: instalar via `pnpm add <pkg>` (mantém o lockfile coerente).
- `pnpm start` não registra SW — para validar fluxo PWA/update, `pnpm build` + servir `www/` via HTTPS (ver skill `pwa`).
- Specs não existem para pages (padrão do repo); cobre lógica nova em facade/store/query/repository.
