---
name: styling
description: Diretrizes de styling do EzGym — use ao criar ou editar SCSS de componentes, estilizar páginas Ionic, usar tokens do tema (--space, --glass), dark mode, ou aplicar o padrão BEM.
---

# Styling — EzGym

SCSS co-localizado por componente (`styleUrl`), tema próprio em `src/theme`, sem lib CSS externa. Referência BEM canônica: `features/settings/components/validation-list/validation-list.component.scss`.

## SCSS obrigatório, nunca inline

- Arquivo `.scss` co-localizado com o componente, referenciado por `styleUrl` (nunca `styles: []` inline).
- Budget Angular: `anyComponentStyle` **2kb warn / 5kb error** — SCSS enxuto; estilos globais/cross-component vão para `src/theme/_overrides.scss` ou `_components.scss`.
- Prettier formata `src/**/*.{ts,html}` (não SCSS) — indentação consistente manualmente.

## BEM com classes aninhadas (padrão do repo)

**Toda classe nova segue BEM**: `.block`, `.block__element`, `.block--modifier`, escrito com aninhamento SCSS (`&`). O bloco é o nome do componente (selector sem o prefixo `app-`).

```scss
.validation-list {
  &__card {
    margin: var(--space-4);
    border-radius: var(--glass-radius);

    &--error {
      background: rgba(var(--ion-color-danger-rgb), 0.1);
      border: 1px solid var(--ion-color-danger);
    }
  }

  &__item {
    --padding-start: var(--space-3);

    &--warning {
      --background: transparent;
    }
  }
}
```

```html
<ion-card class="validation-list__card validation-list__card--error">
```

- Aninhar **elementos dentro do bloco** (`&__element`), e modificadores dentro do elemento (`&--modifier`) — como no exemplo.
- Arquivos legados com classes flat (ex.: `.empty-state`, `.loading-container`) não são bugs: ao **editar** um desses arquivos, migre as classes tocadas para BEM; não refatore o arquivo inteiro sem necessidade.

## Tokens (nada de valores mágicos)

Definidos em `src/theme/_spacing.scss`, `_typography.scss`, `_glass.scss`:

- Espaçamento: `--space-1` … `--space-12` (escala 4px) — usar em vez de `margin: 16px`.
- Tipografia: `--font-weight-*`.
- Glassmorphism: `--glass-*` (bg, border, radius, blur) para cards/superfícies translúcidas.
- Cores/estado: **sempre** CSS vars do Ionic — `var(--ion-color-primary/danger/warning/...)`, `var(--ion-text-color)`, `rgba(var(--ion-color-danger-rgb), 0.1)`.

## Overrides de componentes Ionic

Estilizar `ion-*` via **CSS custom properties** (não shadow-pierce):

```scss
.validation-list__item {
  --padding-start: var(--space-3);
  --background: transparent;
}
```

Slots de conteúdo: `::part(scroll)` (padrão já usado em `global.scss`). Sem `/deep/`, `::ng-deep` ou lib de CSS.

## Dark mode via classe (nunca `prefers-color-scheme`)

O tema escuro é controlado pela classe `ion-palette-dark` em `document.documentElement` (via `@ionic/angular/css/palettes/dark.class.css` + `ThemeService`, que também atualiza `<meta name="theme-color">`). Regras dark vivem em `src/theme` com seletores `.ion-palette-dark { ... }` — componente quase nunca precisa de override dark; se precisar, use vars que já respondem ao tema (`--ion-text-color`, etc.).

## Global (`src/global.scss`)

- Imports CSS do Ionic + fix de safe-area landscape.
- Utilitários `ez-*` (`ez-truncate`, `ez-truncate-2`) — usar antes de recriar truncamento.
- Novos utilitários globais entram aqui (um por vez, só com recorrência real).

## Acessibilidade/motion

Animações CSS respeitam `@media (prefers-reduced-motion: reduce)` (desligar `@keyframes` — ver `workout-card.component.scss`).
