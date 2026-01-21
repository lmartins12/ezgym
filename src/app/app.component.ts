import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { DatabaseService } from './core';

@Component({
  selector: 'app-root',
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly databaseService = inject(DatabaseService);

  constructor() {
    this.initApp();
  }

  private async initApp(): Promise<void> {
    await this.databaseService.initialize();
  }
}
