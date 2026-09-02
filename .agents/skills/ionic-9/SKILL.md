---
name: ionic-9
description: Diretrizes Ionic 9 do EzGym — use ao trabalhar com componentes ion-*, páginas/tabs, modais, alerts, toasts, reorder, ícones ionicons, safe areas, botão voltar Android ou lifecycle Ionic.
---

# Ionic 9 — EzGym

Ionic 9 componente-a-componente com Angular 22 (referências: `layouts/tabs/tabs.page.ts`, `features/workouts/pages/workouts-list.page.ts`).

## Import e bootstrap

- **Nunca módulos Ionic** — importar cada componente usado direto de `@ionic/angular` e listar no `imports` do decorator:

```ts
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular';

@Component({
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  ...
})
```

- Bootstrap (já configurado em `app.config.ts`, não mexer sem motivo): `provideIonicAngular({ animated: true, navAnimation: iosTransitionAnimation })`, `IonicRouteStrategy` como `RouteReuseStrategy`.
- Estrutura padrão de page: `ion-app/ion-content` (root), `ion-header > ion-toolbar > ion-title` + `ion-buttons slot="end"`.

## Ícones

Ícones são registrados **uma vez por componente** com `addIcons` no constructor (import de `ionicons/icons`), depois usados via `<ion-icon name="...">`:

```ts
import { addIcons } from 'ionicons';
import { addOutline, barbellOutline } from 'ionicons/icons';

constructor() {
  addIcons({ addOutline, barbellOutline });
}
```

```html
<ion-icon name="add-outline" slot="icon-only" />
```

## Overlays: modal, alert, toast

Sempre via controllers (`ModalController`, `AlertController`, `ToastController`) — nunca `ion-modal` declarado no template para fluxos de dados. Padrão completo (ver `workouts-list.page.ts`):

```ts
const modal = await this.modalCtrl.create({
  component: WorkoutFormModalComponent,
  componentProps: { workout: existing },   // props chegam como @Input() no modal
});
await modal.present();
void this.backButton.track(modal);         // OBRIGATÓRIO: track no hardware back
const { data } = await modal.onWillDismiss<WorkoutFormResult>();
if (data) { ... }
```

- Dentro do modal, fechar com `modalCtrl.dismiss(result)` (result tipado como `interface XxxResult`).
- Alert de confirmação destrutiva: `role: 'destructive'` + copy via `translate.instant()` (overlay não usa pipe).
- Toast: `ToastController.create({ message: translate.instant('...'), duration: 2000 })`.

## Hardware back (Android)

Todo overlay (`modal`, `alert`, `toast`, `action-sheet`) **precisa** ser registrado no `BackButtonService` (`core/back-button`): `void this.backButton.track(overlay)`. Sem isso, o back do Android fecha o app em vez de fechar o overlay.

## Lifecycle

- Carga de dados em `ionViewWillEnter()` (não `ngOnInit`) — reexecuta a cada volta para a tab/página.
- `TabsPage` (`layouts/tabs`) propaga lifecycle events ao tab ativo via `dispatchEvent` — novas tabs herdam isso, não duplicar lógica.

## Reorder

`ion-reorder-group` + `event.detail.complete()` (a própria API reordena a lista local; depois persistir a nova ordem via facade):

```ts
public reorderWorkouts(event: CustomEvent): void {
  const newOrder = event.detail.complete(this.workouts());
  this.updateWorkoutsOrder(newOrder);
}
```

```html
<ion-reorder-group [disabled]="false" (ionReorderEnd)="reorderWorkouts($event)">
  @for (w of workouts(); track w.id) {
    <ion-reorder> ... </ion-reorder>
  }
</ion-reorder-group>
```

## Safe areas e scroll

- Safe areas via CSS vars do Ionic: `--ion-safe-area-top/left/right/bottom` (fix global em `global.scss` para landscape).
- Padding de item/lista via vars do componente: `--padding-start`, `--inner-padding-end` (nunca hackear com margin no shadow DOM).
- Esconder scrollbar: `::part(scroll)` (utilitário já em `global.scss`).
- Scroll-to-top/filho: `IonContent` via `viewChild` (`read: IonContent`) + `scrollToTop()` — ver `dashboard.page.ts`.

## Haptics e feedback

Feedback tátil via `HapticsService` (`core/haptics`) nos handlers de interação principal (logar série, finish) — ver `session.page.ts`.

## Testes

Sem `IonicTestingModule`: componentes são testados via classe com `provideIonicAngular()` + `provideTranslateService()` (ver skill `angular-v22`).
