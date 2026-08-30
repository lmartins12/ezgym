import { Component, inject } from '@angular/core';
import { DatabaseService } from '@core/services/database.service';
import { PwaUpdateService } from '@core/services/pwa-update.service';
import { ThemeService } from '@core/services/theme.service';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

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
  private readonly themeService = inject(ThemeService);
  private readonly pwaUpdateService = inject(PwaUpdateService);

  constructor() {
    this.initApp();
  }

  private async initApp(): Promise<void> {
    await this.databaseService.initialize();
    this.themeService.initTheme();
    this.pwaUpdateService.initialize();
  }
}
