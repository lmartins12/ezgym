# EzGym

App de treinos (PWA) que funciona 100% offline, com dados no dispositivo. Este README explica como o projeto funciona para um dev clonar, rodar e saber onde mexer.

## Stack

| Camada | Tecnologia |
| --- | --- |
| UI | Angular 22 (standalone, zoneless) + Ionic 9 |
| Estado | Angular Signals + `@ngrx/signals` (stores/queries por feature) |
| Persistência | Dexie (IndexedDB) |
| i18n | `@ngx-translate/core` |
| PWA | `manifest.webmanifest` + Angular Service Worker (`ngsw`) |
| Testes | Vitest (via `ng test`) |

Requer Node 20+ e pnpm (`corepack enable`).

## Scripts

```bash
pnpm install
pnpm start        # ng serve (dev, sem service worker)
pnpm test         # vitest, specs co-localizados (*.spec.ts)
pnpm lint         # eslint
pnpm build        # build de produção em www/ (com SW)
pnpm format       # pretier em src/**/*.{ts,html}
```

O service worker só registra em build de produção (`!isDevMode()`); para validar PWA, rode `pnpm build` e sirva `www/` via HTTPS.

## Estrutura

```
src/app/
├── core/       # serviços transversais singletons
│   ├── db/           # Dexie: app-db.ts (schema) + database.ts (bootstrap)
│   ├── theme/        # tema dark/light + meta theme-color
│   ├── i18n/         # idioma pt/en
│   ├── pwa/          # detecção de instalado, invite e update do SW
│   ├── back-button/  # hardware back (Android)
│   ├── keyboard/     # blur do input focado quando o teclado fecha (scroll assist)
│   ├── haptics/      # feedback tátil
│   ├── error/        # ErrorHandler global
│   ├── onboarding/   # welcome na primeira visita
│   ├── wipe/         # reset de dados do usuário
│   └── gesture-hint/ # dicas de gesto
├── domain/     # modelos + repositórios (única porta para o IndexedDB)
│   ├── workouts/     # Workout + WorkoutExercise (aggregate, reorder, cascade)
│   ├── exercises/    # catálogo de exercícios
│   ├── sessions/     # WorkoutSession + SetLog
│   ├── import-export/# backup/restauração JSON
│   └── shared/       # tipos comuns (muscle-group, limits)
├── features/   # uma pasta por domínio de tela
│   └── <feature>/
│       ├── pages/        # rotas
│       ├── components/   # componentes de tela (inclui modais)
│       ├── facades/      # orquestração repositório → signal
│       ├── stores/       # @ngrx/signals (sessão em andamento)
│       ├── queries/      # leituras agregadas (dashboard, progress)
│       └── models/       # view models
├── shared/     # componentes/diretivas/utils reutilizáveis, sem features
└── layouts/    # shells de navegação (tabs)
```

Path aliases (`tsconfig.json`): `@core/*`, `@domain/*`, `@features/*`, `@shared/*`, `@layouts/*`.

### Regras de dependência

- `core` não importa de nenhuma outra camada (exceção: `core/db/app-db.ts` importa *types* de `@domain` para tipar as tabelas).
- `domain` importa apenas de `@core/db` (Dexie).
- `shared` pode importar `@core` e tipos de `@domain`; nunca `@features`.
- `features` importam `@core`, `@domain` e `@shared`; **nunca** outra feature.
- `layouts` não conhece features (só rotas).

## Rotas

- `/tabs/*` — shell com tab bar: `workouts`, `session`, `dashboard`, `progress`, `settings`
- `/workouts/:id` e `/session/:id` — páginas fullscreen fora das tabs (detalhe do treino e execução da sessão, sem tab bar)

## Persistência e offline

**IndexedDB `ezgym_db`** (Dexie, schema em `core/db/app-db.ts`):

| Tabela | Conteúdo |
| --- | --- |
| `exercises` | catálogo de exercícios |
| `workouts` | treinos (aggregate root, `order_index` para ordenação) |
| `workout_exercises` | exercícios de cada treino (join + ordem) |
| `workout_sessions` | sessões de treino (`status`, timestamps) |
| `set_logs` | séries logadas por exercício/sessão |

Mudanças de schema = nova `version(N)` no `app-db.ts` com migration do Dexie.

**localStorage** (prefs do usuário, prefixo `app_`): `app_theme`, `app_language`, `app_onboarding_seen`, `app_pwa_visits`, `app_pwa_install_dismissed`. O wipe (`core/wipe`) limpa as tabelas Dexie e essas chaves.

**Service worker** (`ngsw-config.json`): assets do app em `prefetch`, fontes/assets em `lazy` com `prefetch` no update. `core/pwa/pwa-update` cuida do fluxo de nova versão.

## i18n

- Traduções: `src/assets/i18n/pt.json` e `src/assets/i18n/en.json`
- Fallback: `pt` (`app.config.ts`)
- Toda string de UI usa `TranslatePipe` com chave; novas chaves vão nos dois arquivos
