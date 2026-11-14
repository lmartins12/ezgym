# AGENTS.md — EzGym

App de treinos PWA, 100% offline (dados só no dispositivo). Stack: Angular 22 standalone + zoneless + Signals, Ionic 9, `@ngrx/signals`, Dexie (IndexedDB), `@ngx-translate/core`, Vitest, pnpm.

## Comandos

pnpm é obrigatório (versão fixada em `packageManager`; Node 20+, `corepack enable`):

- `pnpm start` — dev server (`ng serve`, sem service worker)
- `pnpm test` — Vitest via `ng test` (specs co-localizados `*.spec.ts`)
- `pnpm lint` — ESLint (inclui as regras de camadas — o lint falhar se a fronteira for violada)
- `pnpm build` — produção em `www/` (com service worker)
- `pnpm format` — Prettier em `src/**/*.{ts,html}`

Antes de considerar qualquer tarefa concluída: `pnpm lint && pnpm test && pnpm build`. Warnings de budget de SCSS pré-existentes no build são conhecidos; novos são regression.

## Arquitetura (resumo)

`src/app` em camadas com aliases `@core/*`, `@domain/*`, `@features/*`, `@shared/*`, `@layouts/*`:

```
core (infra singleton) → domain (entidades + repositórios) → shared → features → layouts
```

Regras de dependência (enforçadas por ESLint, ver `eslint.config.js`):

- `domain`/`shared`/`layouts` **nunca** importam `@features`; feature **nunca** importa outra feature.
- Somente `*.repository.ts` (além de `core/db`, specs e `src/testing`) importam o singleton Dexie (`@core/db/app-db`).
- Escritas multi-agregado passam por `DatabaseService.write()`; **páginas nunca tocam repository/DB direto** — usam facade/store/query da própria feature.

Detalhes, esqueleto de feature e "onde criar coisa nova": skill `architecture`.

## Angular (resumo)

- Standalone com `imports: []` explícito no decorator; **zero NgModules**.
- Estado com `signal()`/`computed()`; inputs/outputs funcionais `input()`/`output()`; dependências com `inject()` em field declarations.
- Control flow novo nos templates: `@if`, `@for (…; track …)`, `@switch` — nunca `*ngIf`/`*ngFor`/`| async`/`CommonModule`.
- Zoneless: não declarar `ChangeDetectionStrategy` nem depender de Zone.
- Carga de dados em `ionViewWillEnter()`; async-first (repositories/facades/queries retornam Promise; estado é patchado **depois** de persistir).

Detalhes com snippets: skill `angular-v22`.

## UI (Ionic + i18n)

- Ionic 9 componente-a-componente no `imports` (nunca módulos). Sem lib CSS extra — só tema existente (`src/theme`) e CSS vars do Ionic.
- SCSS co-localizado, **sempre BEM com classes aninhadas** (`.block { &__element { &--modifier {} } }`).
- i18n obrigatório em toda copy nova: `TranslatePipe` em template, `translate.instant()` em alerts/toasts/modais; chave nova vai em `src/assets/i18n/pt.json` **e** `en.json` (padrão `NAMESPACE.KEY`).

Detalhes: skills `ionic-9` e `styling`.

## Dados e PWA

- Offline-first: **nunca assumir rede**. Dados do usuário ficam no dispositivo (IndexedDB + localStorage).
- Mudança de schema Dexie = nova `version(N)` em `core/db/app-db.ts` com migration.
- Prefs em localStorage com prefixo `app_` (o wipe `core/wipe` limpa tabelas Dexie + chaves `app_*`).
- Service worker só registra em produção (`!isDevMode()`); não quebrar os fluxos de update/install (`core/pwa`).

Detalhes: skill `pwa`.

## Testes

- Vitest (globals `describe/it/expect`; `vi` importado explicitamente) + `fake-indexeddb` (`src/test-setup.ts`).
- Repos/stores/facades: integração real sobre fake-indexeddb — `resetDatabase()` no `beforeEach` + builders de `src/testing/db-test-helpers.ts`.
- Componentes: `TestBed` com `provideIonicAngular()` + `provideTranslateService()`, testando a classe (sem renderizar DOM Ionic).
- Seguir o padrão dos `*.spec.ts` existentes; specs têm exceção de `no-restricted-imports`.

## Segurança

- Nunca commitar secrets/keys (não há — manter assim).
- Nenhuma telemetria ou chamada de rede silenciosa: dados do usuário não saem do dispositivo.

## Execução por agentes

- `AGENTS.md`, skills e documentação versionada descrevem convenções reutilizáveis e comportamento implementado. Planos temporários, contexto pessoal e evidências locais ficam em arquivos ignorados pelo Git.
- Ao iniciar trabalho, verificar se existe `docs/local-context.md`. Se existir, ler como contexto complementar deste workspace; se não existir, seguir normalmente com estas instruções e as skills. A ausência desse arquivo não impede trabalhar em um clone novo.
- Não confundir planejamento com funcionalidade implementada. Registrar resultados reais e limitações; não declarar critérios pendentes como concluídos.
- Preservar mudanças preexistentes do usuário. Não atualizar dependências, schema, formato de exportação ou regras de negócio como efeito colateral de CSS.
- Não usar dados pessoais para fixtures/capturas. Validar em origem/perfil isolado; nunca executar wipe/seed no banco de uso real.
- Mudança visual exige revisão renderizada além de lint/test/build: conferir temas, responsividade, foco, teclado e contraste. Falta de browser/aparelho é pendência, não aprovação.
- Manter controles legíveis, respeitar reduced motion e oferecer fallback para efeitos visuais não suportados.
- Exportação atual é de **treinos**, não backup integral: `ExportData` não contém sessões, séries ou preferências. Não prometer recuperação do histórico com esse arquivo.
