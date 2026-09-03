---
name: architecture
description: Arquitetura e organização da codebase EzGym — use ao criar qualquer arquivo/pasta nova (feature, componente, repository, store, migration Dexie), decidir onde colocar código, ou verificar regras de dependência entre camadas.
---

# Arquitetura — EzGym

Camadas unidirecionais com aliases (`tsconfig.json`): `@core/*`, `@domain/*`, `@features/*`, `@shared/*`, `@layouts/*`, `@testing/*`.

```
src/app/
├── core/       # infra transversal (sem regra de negócio, sem UI de feature)
│   ├── db/            # app-db.ts (schema Dexie) + database.ts (DatabaseService)
│   ├── theme/  i18n/  pwa/  error/  haptics/  back-button/  keyboard/  onboarding/  wipe/
├── domain/     # entidades + repositórios — ÚNICA porta para o IndexedDB
│   ├── exercises/  workouts/  sessions/  import-export/  shared/ (limits, muscle-group)
├── shared/     # componentes/diretivas/utils reutilizáveis (clipboard/, share/, date/number.utils)
├── features/   # uma pasta por domínio de tela (workouts, session, dashboard, progress, settings)
│   └── <feature>/
│       ├── pages/       # rotas (*.page.ts/html/scss)
│       ├── components/  # componentes e modais da tela
│       ├── facades/     # orquestração multi-repositório (só quando 2+ colaboradores)
│       ├── stores/      # @ngrx/signals (só estado vivo que sobrevive à rota)
│       ├── queries/     # read-models puros (dashboard, progress)
│       ├── services/    # lógica de UI da feature (ex.: copy de prompt de IA)
│       └── models/      # view models
└── layouts/tabs/  # shell de tabs (não conhece features, só rotas)
```

## Regras de dependência (ESLint `no-restricted-imports` — lint falha na violação)

| Camada | Pode importar | Não pode |
| --- | --- | --- |
| `core` | libs, `@domain` (só types no app-db) | `@features/@shared/@layouts` |
| `domain` | libs, `@core/db` (só `*.repository.ts`), `@domain` | `@features/@shared/@layouts`; não-repository não importa `@core/db/app-db` |
| `shared` | libs, `@core`, `@domain`, `@shared` | `@features/@layouts`; nunca o singleton Dexie |
| `features/<x>` | libs, `@core`, `@domain`, `@shared`, si mesma | `@features/<outra>`; nunca `@core/db/app-db` |
| `layouts` | libs, `@core`, `@shared` | `@features` (features entram por rotas lazy) |

Exceções de specs: `*.spec.ts` e `src/testing` têm `no-restricted-imports: 'off'`.

## Fluxo de dados (quem chama o quê)

```
page → facade/store/query → repository → DatabaseService/db (Dexie)
```

- **Páginas nunca importam repository nem `@core/db/*`** — usam facade/store/query da própria feature. Fronteira com lint próprio (`features/<x>/pages/**` falha no lint se importar `*.repository` ou `@core/db`).
- Escritas **multi-agregado** (cascade delete, import) passam por `DatabaseService.write()` (`core/db/database.ts`), que abre `db.transaction('rw', [...todas as tabelas])` — rollback atômico.
- Repositório (`*.repository.ts`): `@Injectable({ providedIn: 'root' })`, injeta `DatabaseService`, **todo método público começa com `await this.database.initialize()`** e retorna Promise (`Promise<T | null>`, nunca undefined). Sem interfaces — só existe Dexie.
- UUID (`uuidv4`) e timestamps (`created_at`/`updated_at = Date.now()`) gerados em **facade/store**; repository recebe a entidade pronta.
- `SessionStore` (`providedIn: 'root'`) é singleton de propósito: sessão em andamento sobrevive à troca de tab. Não "consertar".

## Onde criar coisa nova (decisão)

- **Regra de tela/negócio de uma tela** → na própria `features/<x>/` (page/component/model/facade/query/service). Anti-dump: nada de `*.service.ts` genérico pegando tudo.
- **Reusável por 2+ features, sem regra de negócio** → `@shared` (componente, diretiva, util). Dúvida = começa na feature e promove quando a 2ª feature pedir.
- **Infra transversal (tema, i18n, SW, back button, haptics, error handler)** → `@core/<assunto>/<arquivo>` — sem pasta `core/services/` (não existe mais).
- **Entidade/aggregate novo** → `domain/<aggregate>/` com `entidade.ts` + `entidade.repository.ts` (e spec). Tipos comuns em `domain/shared/`.
- **Componente visual genérico (ícone, selector)** → `shared/components/`.

## Esqueleto de feature (só pastas que existirem)

```
features/<x>/
  pages/<x>.page.ts|.html|.scss       (rotas; NÃO têm spec)
  components/<x>-<nome>/<x>-<nome>.component.ts|.html|.scss
  facades/<x>.facade.ts (+spec)
  stores/<x>.store.ts (+spec)
  queries/<x>.query.ts (+spec)
  models/<x>.models.ts
```

Naming: `*Page` (rotas), `*Component`, `*Facade`, `*Query`, `*Store`, `*Repository`; specs co-localizados `*.spec.ts` (em domain/core/facades/stores/queries/directives/services).

## Schema Dexie (migrations)

`core/db/app-db.ts`: `class EzGymDatabase extends Dexie` com tabelas tipadas (`Table<Entidade, string>`), singleton `export const db`. Banco: `ezgym_db` — tabelas `exercises`, `workouts`, `workout_exercises`, `workout_sessions`, `set_logs`.

**Mudança de schema = nova `version(N).stores({...}).upgrade(tx => ...)`** — nunca editar a versão existente.

## Rotas (`app.routes.ts`)

- `/tabs/*` — shell `layouts/tabs` com children lazy: `workouts`, `session`, `dashboard`, `progress`, `settings`.
- Fora das tabs (fullscreen, sem tab bar): `/workouts/:id`, `/session/:id`.
- Redirects `''` e `**` → `/tabs/workouts`. `withComponentInputBinding()` → params viram `input.required<string>()`.

## i18n

`src/assets/i18n/pt.json` **e** `en.json` (fallback `pt`), JSON aninhado com namespace UPPER_SNAKE por tela/feature + `COMMON`/`TABS` compartilhados. Chave nova vai **nos dois arquivos**, sempre.

## Testes

- `src/test-setup.ts` = `import 'fake-indexeddb/auto'`.
- `src/testing/db-test-helpers.ts`: builders (`buildExercise`, `buildWorkout`, `buildSession`...) + `resetDatabase()` (`await db.delete(); await db.open();`) + `injectService()`.
- Repos/stores/facades: integração real sobre fake-indexeddb, `resetDatabase()` no `beforeEach`, seed com `db.<tabela>.bulkAdd([...])`.
- Componentes: classe via TestBed (ver skill `angular-v22`).
