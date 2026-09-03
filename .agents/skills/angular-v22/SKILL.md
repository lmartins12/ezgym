---
name: angular-v22
description: Diretrizes Angular 22 do EzGym — use ao criar ou editar componentes, pages, signals, input()/output(), templates (@if/@for), stores @ngrx/signals, modais, navegação ou testes de componente Angular.
---

# Angular 22 — EzGym

Angular 22 standalone + zoneless + Signals. Referência viva: `features/workouts/pages/workouts-list.page.ts` (page completa) e `features/session/stores/session.store.ts` (store).

## Componente/Page standalone

`imports: []` explícito no decorator; nunca `standalone: true` (implícito), nunca NgModules. Referências por `templateUrl`/`styleUrl` (nunca `styles: []` inline).

```ts
@Component({
  selector: 'app-workout-card',
  imports: [TranslatePipe, IonBadge, IonIcon],
  templateUrl: './workout-card.component.html',
  styleUrl: './workout-card.component.scss',
})
export class WorkoutCardComponent { ... }
```

- Sufixos obrigatórios (ESLint): `*Page` para rotas, `*Component` para o resto; selector `app-` kebab-case.
- Zoneless: **não** declarar `ChangeDetectionStrategy` nem `encapsulation`; não depender de Zone (`zone.js` não está em uso).

## Dependências e visibilidade

`inject()` exclusivamente em field declarations (zero constructor injection). Constructor só para `addIcons` ou init síncrono.

```ts
private readonly workoutsFacade = inject(WorkoutsFacade);   // services: private readonly
public readonly workouts = signal<WorkoutDetail[]>([]);     // estado exposto: public readonly
```

## Signals

- Estado local = `signal<T>(init)`; derivados = `computed()`; zero getters de estado, zero `| async` em template.
- Ler sinal no TS sempre via chamada `workouts()`.

```ts
public readonly loading = signal(false);
public readonly dateFormat = computed(() =>
  this.languageService.isPortuguese() ? 'dd/MM/yy, HH:mm' : 'short');
```

## Inputs/Outputs funcionais

`input()`/`output()` em todo componente, **inclusive modais** abertos via `componentProps` (o Ionic entrega as props via `setInput` porque o app usa `useSetInputAPI: true` no `provideIonicAngular` — nunca `@Input()` legado, nunca mutar input).

```ts
public readonly workout = input.required<WorkoutDetail>();
public readonly deleted = output<string>();
```

## Templates — control flow novo

Somente `@if`/`@else`/`@for`/`@switch`; **nunca** `*ngIf`/`*ngFor`/`CommonModule`/`| async`.

```html
@if (loading()) {
  <ion-spinner name="crescent" />
} @else {
  @for (workout of workouts(); track workout.id) { ... }
  @empty { <p>{{ 'WORKOUTS.EMPTY_TITLE' | translate }}</p> }
}
```

- `track` é obrigatório no `@for` (use o id).
- `@if (expr; as alias)` para binding único.
- i18n em toda copy: `{{ 'NAMESPACE.KEY' | translate }}` (pipe importado no `imports`).

## Route params como inputs

O app usa `withComponentInputBinding()` — params de rota viram inputs:

```ts
public readonly id = input.required<string>(); // /workouts/:id
```

## Carga de dados

`ionViewWillEnter()` é o hook padrão (idempotente, async). Async-first: repositories/facades/queries retornam **Promise**; estado é patchado **depois** de persistir; `finally` para limpar loading.

```ts
public ionViewWillEnter(): void {
  this.loadWorkouts();
}

public async loadWorkouts(): Promise<void> {
  this.loading.set(true);
  try {
    this.workouts.set(await this.workoutsFacade.list());
  } finally {
    this.loading.set(false);
  }
}
```

## Navegação e overlays

- Rotas flat: `this.router.navigate(['/workouts', id])`; back: `NavController.navigateBack(...)`.
- Modais: `ModalController.create({ component, componentProps })` → `present()` → `onWillDismiss<T>()`; **todo overlay é trackeado no botão voltar**: `void this.backButton.track(modal)`.
- Alerts/toasts: controllers (`AlertController`, `ToastController`) com `translate.instant()` (nunca pipe em overlay) e `role: 'destructive'` em ações destrutivas. Ver padrão completo em `workouts-list.page.ts` (`confirmDelete`).

```ts
const modal = await this.modalCtrl.create({
  component: WorkoutFormModalComponent,
  componentProps: { workout: undefined },
});
await modal.present();
void this.backButton.track(modal);
const { data } = await modal.onWillDismiss<WorkoutFormResult>();
```

## State — @ngrx/signals

Padrões usados (ver `session.store.ts`):

```ts
export const SessionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),                       // interface + const initialState tipados
  withComputed(({ state }) => ({
    isSessionActive: computed(() => state() === 'IN_PROGRESS' || state() === 'FINISHING'),
  })),
  withMethods((store) => {
    const sessionRepository = inject(SessionRepository); // DI dentro de withMethods
    return {
      async startSession(): Promise<void> {
        // 1) persiste via repository  2) DEPOIS patchState
        patchState(store, { activeSession: created });
      },
    };
  }),
);
```

- Updates imutáveis: `patchState(store, (state) => ({ setLogs: [...state.setLogs, log] }))`.
- Métodos de store podem retornar `Promise<boolean>` para o page decidir navegação; navegação é do page, não do store.
- UUID (`uuidv4`) e timestamps (`Date.now()`) gerados em **store/facade**, nunca no repository.
- Regras: facade só quando orquestra 2+ colaboradores; query (`*.query.ts`, `@Injectable({ providedIn: 'root' })`) = read-model puro sem estado; store de feature em `providedIn: 'root'` **só** quando o estado precisa sobreviver a troca de tab (caso `SessionStore` — intencional, não "consertar").

## Testes de componente

`TestBed` com `provideIonicAngular()` + `provideTranslateService()`, testando a **classe** (sem renderizar DOM Ionic, sem `IonicTestingModule`):

```ts
await TestBed.configureTestingModule({
  providers: [provideIonicAngular(), provideTranslateService()],
}).createComponent(MyComponent);
fixture.componentRef.setInput('exercises', [...]);   // input()
component.logSet.subscribe(...);                      // output()
```

Timers: `vi.useFakeTimers({ toFake: [...] })` + `vi.advanceTimersByTime(...)`. Specs seguem o padrão dos `*.spec.ts` co-localizados existentes.
