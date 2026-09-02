---
name: pwa
description: Diretrizes PWA/offline do EzGym — use ao mexer em service worker (ngsw), manifest.webmanifest, install prompt, update flow, localStorage/prefs, wipe de dados ou qualquer fluxo offline.
---

# PWA e Offline — EzGym

App 100% offline: dados só no dispositivo. **Nunca assumir rede** — nenhum fluxo do app depende de conexão; a única rede usada é o download do bundle/traduções na primeira carga (cacheadas pelo SW).

## Offline-first (regra de ouro)

- Dados do usuário: IndexedDB (Dexie) para entidades, `localStorage` para prefs.
- `localStorage` sempre com **prefixo `app_`**: `app_theme`, `app_language`, `app_onboarding_seen`, `app_pwa_visits`, `app_pwa_install_dismissed`.
- Toda nova chave `app_*` deve ser considerada pelo wipe (`core/wipe`), que limpa tabelas Dexie + chaves `app_*`.
- Nada de telemetria, fetch silencioso ou chamada de rede em background.

## Service worker (ngsw)

- `ngsw-config.json`: app shell em `installMode: prefetch`; assets/fontes em `lazy` com `updateMode: prefetch`. Sem `dataGroups` (não há APIs remotas).
- Registro (em `app.config.ts`):

```ts
provideServiceWorker('ngsw-worker.js', {
  enabled: !isDevMode(),                    // NUNCA registra em dev
  registrationStrategy: 'registerWhenStable:30000',
})
```

- Validar PWA de verdade: `pnpm build` e servir `www/` via HTTPS (`pnpm start` não tem SW).

## Update flow (`core/pwa/pwa-update.ts`)

`PwaUpdateService` é injetado no `AppComponent` (constructor chama `checkForUpdate()`). Não quebrar estes comportamentos:

- Escuta `SwUpdate.versionUpdates` filtrado a `VERSION_READY` → `hasPendingUpdate = signal(false→true)` + toast persistente com botão "Atualizar" (`activateUpdate().then(() => reload)`).
- `unrecoverable` → reload automático.
- **Re-check** em `visibilitychange` + `interval(30min)` — PWAs instaladas não re-navegam, então o check ativo é obrigatório.

## Install flow (`core/pwa/pwa-install.ts` + `shared/components/pwa-install-invite/`)

Não quebrar as regras de convite:

- Captura `beforeinstallprompt` (deferred prompt) para invite nativo; fallback iOS (heurística `MacIntel + maxTouchPoints > 1`) mostra passos manuais traduzidos.
- Detecção de standalone: `display-mode: standalone` / `navigator.standalone`.
- **Invite só a partir da 2ª visita** (`MIN_VISITS_BEFORE_INVITE = 2`, contagem em `app_pwa_visits`) e só se não foi dispensado (`app_pwa_install_dismissed`); `canInvite = computed(...)` expõe a decisão.

## Manifest (`src/manifest.webmanifest`)

`display: standalone`, `orientation: portrait`, theme/background `#000000`, ícones 192/512 com `purpose: "any maskable"`. Mudanças no manifest não exigem migration, mas mudam o hash do build — o update flow cuida.

## Service worker e dados

Mudança de schema Dexie segue skill `architecture` (nova `version(N)` + migration) — o SW não versiona dados, só assets. Bump de versão do app (`package.json`) aparece no export de backup (`APP_VERSION` lido do `package.json`).
